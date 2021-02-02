import * as vscode from 'vscode';
import * as child_process from 'child_process';
import {get_concurrency} from './main';

const formatText = (text: string) => `\r${text.split(/(\r?\n)/g).join("\r")}\r`;

function get_config(){
    let dependency_path = <string>vscode.workspace.getConfiguration('snort3BuildTools').get('dependencies');
    let sf_prefix_snort3 = <string>vscode.workspace.getConfiguration('snort3BuildTools').get('sf_prefix_snort3');
    let snort3_build_dir = <string>vscode.workspace.getConfiguration('snort3BuildTools').get('snort_build_dir');
    let config_env = <any>process.env;
    config_env.PATH = config_env.PATH!+':'+dependency_path+'/libdaq/bin';
    config_env.PKG_CONFIG_PATH = config_env.PKG_CONFIG_PATH!+':'+dependency_path+'/cpputest/lib64/pkgconfig:'+dependency_path+'/safec/lib/pkgconfig';
    config_env.LD_LIBRARY_PATH = config_env.LD_LIBRARY_PATH!+':'+dependency_path+'/cpputest/lib64:'+dependency_path+'/libdaq/lib:'+dependency_path+'/safec/lib';
    config_env.LUA_PATH = sf_prefix_snort3+'/include/snort/lua/\\?.lua\\;\\;';
    config_env.SNORT_LUA_PATH = sf_prefix_snort3+'/etc/snort';
    config_env.SNORT_PLUGIN_PATH = sf_prefix_snort3+'/lib64';
    return {dependency_path:dependency_path, sf_prefix_snort3:sf_prefix_snort3, snort3_build_dir:snort3_build_dir, env:config_env};
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
        private readonly options:child_process.SpawnOptions, private readonly parent:any)
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
        this.cp = child_process.spawn(this.cmd,this.args, this.options);
        if(!this.cp || !this.cp.pid) {
            this.writer.fire('**** ERROR starting '+this.task+' task ****\r\n');
            this.statusItem.text=`$(`+this.status_text+`)`;
            this.parent.busy = false;
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
        this.cp!.once('exit',()=>{
            this.writer.fire('**** '+this.task+' task complete ****\n\rPress eny key to close this terminal\r\n');
            this.cp = undefined;
            this.statusItem.text=`$(`+this.status_text+`)`;
            this.parent.busy = false;
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
            this.parent.dispose_terminal(this.term_id);
    }
}

export class snort3BuildTools {
    public busy:boolean =  false;
    public terminals:Map<number,vscode.Terminal>= new Map<number,vscode.Terminal>();

    dispose_terminal(term_id:number){
        this.terminals.get(term_id)!.dispose();
    }

    async dispose() {
        this.terminals.forEach((terminal)=>{terminal.dispose();});
    }

    async configure(workspace:vscode.WorkspaceFolder, status_item:vscode.StatusBarItem)
    {
        if(this.busy) return;
        this.busy = true;
        let config = get_config();
        let config_args:string[] = [];
        config_args.push("--with-daq-includes="+config.dependency_path+"/libdaq/include");
        config_args.push("--with-daq-libraries="+config.dependency_path+"/libdaq/lib");
        config_args.push("--enable-address-sanitizer");
        config_args.push("--enable-debug");
        config_args.push("--enable-debug-msgs");
        config_args.push("--enable-shell");
        config_args.push("--enable-unit-tests");
        config_args.push("--enable-piglet");
        config_args.push("--enable-gdb");
        config_args.push("--enable-code-coverage");
        config_args.push("--enable-appid-third-party");
        config_args.push("--prefix="+config.sf_prefix_snort3);
        if(config.snort3_build_dir && config.snort3_build_dir !== "")
            config_args.push("--builddir="+config.snort3_build_dir);

        config.env.CC = "gcc";
        config.env.CXX = "g++";
        config.env.CFLAGS = "-O0";
        config.env.CXXFLAGS = "-O0";
        config.env.CPPFLAGS = "-Wall -Wextra -pedantic -Wformat -Wformat-security -Wno-deprecated-declarations -Wno-long-long -Wmissing-noreturn -Wunreachable-code -Wno-address-of-packed-member -DREG_TEST";
        const pty = new snort3BuildToolsTerminal('configure', status_item,`tools`,'./configure_cmake.sh',config_args,{cwd:workspace.uri.path, env:config.env},this);
        const terminal = (<any>vscode.window).createTerminal({name:`Configure : Snort3 Build Tools`, pty:pty});
        this.terminals.set(pty.get_term_id(), terminal);
        terminal.show();
    }

    async build(workspace:vscode.WorkspaceFolder, status_item:vscode.StatusBarItem)
    {
        if(this.busy) return;
        this.busy = true;
        let config = get_config();
        const concurrency = '-j'+get_concurrency().toString();
        var build_dir = workspace.uri.path+'/build';
        if(config.snort3_build_dir && config.snort3_build_dir !== "")
            build_dir = config.snort3_build_dir;
        let config_args:string[] = [];
        config_args.push(concurrency);
        config_args.push("install");
        const pty = new snort3BuildToolsTerminal('build', status_item,`settings-gear`,'make',config_args,{cwd:build_dir, env:config.env},this);
        const terminal = (<any>vscode.window).createTerminal({name:`Make : Snort3 Build Tools`, pty:pty});
        this.terminals.set(pty.get_term_id(), terminal);
        terminal.show();
    }
}