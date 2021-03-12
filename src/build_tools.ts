import * as vscode from 'vscode';
import * as child_process from 'child_process';
import {get_concurrency} from './main';


export const statusIcon = {configure:'tools', build:'settings-gear'};

export interface snort3BuildTarget extends vscode.QuickPickItem{};

const formatText = (text: string) => `\r${text.split(/(\r?\n)/g).join("\r")}\r`;

interface buildToolsConfigOptions {
    sanitiser:{enabled:boolean, type?:string},
    debug:boolean,
    debug_msg:boolean,
    shell:boolean,
    app_id:boolean,
    piglet:boolean,
    coverage:boolean
}

interface buildToolsConfig {
    log:boolean,
    dependency_path:string,
    sf_prefix_snort3:string,
    snort3_build_dir:string,
    env:any,
    options?:buildToolsConfigOptions
}

function get_config(include_options:boolean = false):buildToolsConfig
{
    let current_config:buildToolsConfig = {
        log : <boolean>vscode.workspace.getConfiguration('snort3BuildTools').get('logCommands'),
        dependency_path : <string>vscode.workspace.getConfiguration('snort3BuildTools.environment').get('dependenciesDir'),
        sf_prefix_snort3 : <string>vscode.workspace.getConfiguration('snort3BuildTools.environment').get('snortInstallDir'),
        snort3_build_dir : <string>vscode.workspace.getConfiguration('snort3BuildTools.environment').get('snortBuildDir'),
        env : Object.assign({},process.env)
    };

    current_config.env.PATH = current_config.env.PATH! + ':' + current_config.dependency_path + '/libdaq/bin';
    current_config.env.PKG_CONFIG_PATH = /*current_config.env.PKG_CONFIG_PATH! + ':' +*/
        current_config.dependency_path + '/cpputest/lib64/pkgconfig:' + current_config.dependency_path +
        '/safec/lib/pkgconfig';
    current_config.env.LD_LIBRARY_PATH = /*current_config.env.LD_LIBRARY_PATH! + ':' +*/
        current_config.dependency_path + '/cpputest/lib64:' + current_config.dependency_path +
        '/libdaq/lib:' + current_config.dependency_path + '/safec/lib';
    current_config.env.LUA_PATH = current_config.sf_prefix_snort3 + '/include/snort/lua/\\?.lua\\;\\;';
    current_config.env.SNORT_LUA_PATH = current_config.sf_prefix_snort3 + '/etc/snort';
    current_config.env.SNORT_PLUGIN_PATH = current_config.sf_prefix_snort3 + '/lib64';
    
    if(include_options)
    {
        current_config.options = {
            sanitiser : {enabled:<boolean>vscode.workspace.getConfiguration('snort3BuildTools.configOption').get('enableSanitiser')},
            debug : <boolean>vscode.workspace.getConfiguration('snort3BuildTools.configOption').get('enableDebug'),
            debug_msg : <boolean>vscode.workspace.getConfiguration('snort3BuildTools.configOption').get('debugMessage'),
            shell : <boolean>vscode.workspace.getConfiguration('snort3BuildTools.configOption').get('enableShell'),
            app_id : <boolean>vscode.workspace.getConfiguration('snort3BuildTools.configOption').get('enableAppId'),
            piglet : <boolean>vscode.workspace.getConfiguration('snort3BuildTools.configOption').get('enablePiglet'),
            coverage : <boolean>vscode.workspace.getConfiguration('snort3BuildTools.configOption').get('enableCodeCoverage')
        };

        if(current_config.options.sanitiser.enabled)
            current_config.options.sanitiser.type = <string>vscode.workspace.getConfiguration('snort3BuildTools.configOption').get('sanitiser');
    }
    return current_config;
}

class snort3BuildToolsTerminal
{
    private cp:child_process.ChildProcess|undefined = undefined;
    public onDidWrite:vscode.Event<string>;
    private writer:vscode.EventEmitter<string>;
    private static term_count:number=0;
    private term_id:number;
    private wip:boolean = false;
    constructor( private readonly task:string, private readonly statusItem:vscode.StatusBarItem,
        private readonly status_text:string, private readonly cmd:string, private readonly args:string[],
        private readonly options:child_process.SpawnOptions, private readonly cb:(arg0: string) => void,
        private readonly saved_terminals:Map<number,vscode.Terminal>, private readonly log:boolean)
    {
        this.writer = new vscode.EventEmitter<string>();
        this.onDidWrite = this.writer.event;
        snort3BuildToolsTerminal.term_count++;
        this.term_id = snort3BuildToolsTerminal.term_count;
    }
    get_term_id():number { return this.term_id;}
    async open() {
        this.wip = true;
        this.writer.fire('*** Starting '+this.task+' snort3 task ***\r\n');
        this.statusItem.text=`$(`+this.status_text+`~spin)`;
        if(this.log)
            this.writer.fire(this.cmd + ' ' + this.args.join(' ') + '\r\n');
        this.cp = child_process.spawn(this.cmd,this.args, this.options);
        if(!this.cp || !this.cp.pid) {
            this.writer.fire('**** ERROR starting '+this.task+' task ****\r\n');
            this.statusItem.text=`$(`+this.status_text+`)`;
            this.cb('error');
            this.wip = false;
        }
        this.cp!.stdout!.setEncoding('utf8');
        this.cp!.stderr!.setEncoding('utf8');
        this.cp!.stderr!.on('data',(data)=>{
            this.writer.fire(formatText(data));
        });
        this.cp!.stdout!.on('data',(data)=>{
            this.writer.fire(formatText(data));
        });
        this.cp!.once('exit',(code,signal)=>{
            this.writer.fire('**** '+this.task+' task complete ****\n\rPress eny key to close this terminal\r\n');
            this.cp = undefined;
            this.statusItem.text=`$(`+this.status_text+`)`;
            if(code||signal) this.cb('error');
            else this.cb('success');
            this.wip = false;
        });
    }

    async close() {
        if(this.cp){
            this.cp.kill("SIGKILL");
            this.cp = undefined;
        }
    }

    async handleInput() {
        if(this.term_id && !this.wip)
            this.saved_terminals.get(this.term_id)!.dispose();
    }
}

export class snort3BuildTools {
    private active_job = {running:false, term_id:0, type:''};
    public terminals:Map<number,vscode.Terminal>= new Map<number,vscode.Terminal>();
    private configured_target:string = 'UNDEFINED';

    constructor(
        stored_target:snort3BuildTarget|undefined
    ) {
        if (stored_target) this.configured_target = stored_target.label;
    }

    async dispose() {
        this.terminals.forEach((terminal)=>{terminal.dispose();});
    }

    async configure(workspace:vscode.WorkspaceFolder, target:string, status_item:vscode.StatusBarItem)
    {
        if(this.active_job.running){
            if(this.active_job.type === 'CONFIG'){
                const resp = await vscode.window.showWarningMessage("Do you want to abort the config?",...["Yes","No"]);
                if(resp === "Yes"){
                    this.terminals.get(this.active_job.term_id)!.dispose();
                } 
            }
            return;
        }
        if(target === 'PROD_BLD') return;
        this.active_job.running = true;
        this.active_job.type = 'CONFIG';
        let config = get_config(true);
        let config_args:string[] = [];
        config_args.push("--with-daq-includes="+config.dependency_path+"/libdaq/include");
        config_args.push("--with-daq-libraries="+config.dependency_path+"/libdaq/lib");
        config_args.push("--prefix="+config.sf_prefix_snort3);
        if(config.snort3_build_dir && config.snort3_build_dir !== "")
            config_args.push("--builddir="+config.snort3_build_dir);
        if(target === 'REG_TEST'){
            config_args.push("--enable-unit-tests");
            if(config.options!.debug_msg) config_args.push("--enable-debug-msgs");
            if(config.options!.shell) config_args.push("--enable-shell");
            if(config.options!.piglet) config_args.push("--enable-piglet");
            if(config.options!.app_id) config_args.push("--enable-appid-third-party");
            if(config.options!.debug) {
                config_args.push("--enable-debug");
                config_args.push("--enable-gdb");
            }
            if(config.options!.sanitiser.enabled)
                config_args.push("--enable-" + config.options!.sanitiser.type + "-sanitizer");
            if(config.options!.coverage){
                if(!config.options!.sanitiser.enabled || config.options!.sanitiser.type !== 'thread')
                config_args.push("--enable-code-coverage");
            }
            config.env.CC = "gcc";
            config.env.CXX = "g++";
            config.env.CFLAGS = "-O0";
            config.env.CXXFLAGS = "-O0";
            config.env.CPPFLAGS = "-Wall -Wextra -pedantic -Wformat -Wformat-security -Wno-deprecated-declarations -Wno-long-long -Wmissing-noreturn -Wunreachable-code -Wno-address-of-packed-member -DREG_TEST";
        }
        const pty = new snort3BuildToolsTerminal('configure', status_item,statusIcon.configure,'./configure_cmake.sh',
            config_args,{cwd:workspace.uri.path, env:config.env},
            (status:string)=>{
                this.active_job = {running:false, term_id:0, type:''};
                if('success' === status) this.configured_target = target;
            }, this.terminals, config.log);
        const terminal = (<any>vscode.window).createTerminal({name:'Configure : Snort3 Build Tools', pty:pty});
        const term_id = pty.get_term_id();
        this.terminals.set(term_id, terminal);
        this.active_job.term_id = term_id;
        terminal.show();
    }

    async clean(workspace:vscode.WorkspaceFolder, target:string, status_item:vscode.StatusBarItem)
    {
        if(this.active_job.running){
            if(this.active_job.type === 'BUILD'){
                const resp = await vscode.window.showWarningMessage("Do you want to abort the build?",...["Yes","No"]);
                if(resp === "Yes"){
                    this.terminals.get(this.active_job.term_id)!.dispose();
                } 
            }
            return;
        }
        this.active_job.running = true;
        this.active_job.type = 'BUILD';
        let config = get_config();
        var build_dir = workspace.uri.path+'/build';
        if(config.snort3_build_dir && config.snort3_build_dir !== "")
            build_dir = config.snort3_build_dir;
        const pty = new snort3BuildToolsTerminal('clean', status_item,statusIcon.build,'make',
            ['clean'], {cwd:build_dir, env:config.env},
            (status:string)=>{
                this.active_job={running:false,term_id:0, type:''};
                this.active_job.term_id=0;
            }, this.terminals, config.log);
        const terminal = (<any>vscode.window).createTerminal({name:'Clean : Snort3 Build Tools', pty:pty});
        const term_id = pty.get_term_id();
        this.terminals.set(term_id, terminal);
        this.active_job.term_id = term_id;
        terminal.show();
    }

    async build(workspace:vscode.WorkspaceFolder, target:string, status_item:vscode.StatusBarItem)
    {
        if(this.active_job.running){
            if(this.active_job.type === 'BUILD'){
                const resp = await vscode.window.showWarningMessage("Do you want to abort the build?",...["Yes","No"]);
                if(resp === "Yes"){
                    this.terminals.get(this.active_job.term_id)!.dispose();
                } 
            }
            return;
        }
        if(target !== this.configured_target){
            vscode.window.showWarningMessage(`Target ${target} is not configured yet. Please configure before building.`);
            return;
        }
        this.active_job.running = true;
        this.active_job.type = 'BUILD';
        let config = get_config();
        const concurrency = '-j'+ get_concurrency().toString();
        var build_dir = workspace.uri.path+'/build';
        if(config.snort3_build_dir && config.snort3_build_dir !== "")
            build_dir = config.snort3_build_dir;
        let build_args:string[] = [];
        build_args.push(concurrency);
        build_args.push("install");
        const pty = new snort3BuildToolsTerminal('build', status_item,statusIcon.build,'make',
            build_args, {cwd:build_dir, env:config.env},
            (status:string)=>{
                this.active_job={running:false,term_id:0, type:''};
                this.active_job.term_id=0;
            }, this.terminals, config.log);
        const terminal = (<any>vscode.window).createTerminal({name:'Make : Snort3 Build Tools', pty:pty});
        const term_id = pty.get_term_id();
        this.terminals.set(term_id, terminal);
        this.active_job.term_id = term_id;
        terminal.show();
    }

    static getTargets():snort3BuildTarget[]{
        const targets:snort3BuildTarget[]=[];
        targets.push({label:'REG_TEST', description:'Regression test', detail:'Configure project to build and run regression tests'});
        targets.push({label:'OPEN_SRC', description:'Open Source', detail:'Configure project to build opensource code'});
        //targets.push({label:'PROD_BLD', description:'Product build', detail:'Configure project to build for product'});
        return targets;
    }
}