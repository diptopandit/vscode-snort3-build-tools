import * as vscode from 'vscode';
import * as buildToolsUtils from './build_tools_utils';
import {snort3BuildToolsTerminal} from './build_tools_terminal';

export const statusIcon = {configure:'tools', build:'settings-gear'};
export interface snort3BuildTarget extends vscode.QuickPickItem{};

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
        let config = buildToolsUtils.get_config(true);
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
        let config = buildToolsUtils.get_config();
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
        let config = buildToolsUtils.get_config();
        const concurrency = '-j'+ buildToolsUtils.get_concurrency().toString();
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