import * as vscode from 'vscode';
import * as child_process from 'child_process';
import {myStatusBarItems, get_concurrency} from './main';

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

export const snort3BuildTools = {
    busy:false,
    async configure(workspace:vscode.WorkspaceFolder)
    {
        var terminal:vscode.Terminal;
        if(this.busy) {
            terminal!.dispose();
            return;
        }
        this.busy = true;
        myStatusBarItems[1].text=`$(tools~spin)`
        const writeEmitter = new vscode.EventEmitter<string>();
        var cp:child_process.ChildProcess|undefined = undefined;
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
        
        const pty = {
            onDidWrite: writeEmitter.event,
            open: async () => {
                writeEmitter.fire('*** Configuring snort3 ***\r\n');
                cp = child_process.spawn('./configure_cmake.sh',config_args, {cwd:workspace.uri.path, env:config.env});
                if(!cp || !cp.pid) {
                    writeEmitter.fire('**** ERROR starting configure task ****\r\n');
                    myStatusBarItems[1].text=`$(tools)`;
                    this.busy = false;
                }
                cp!.stdout!.setEncoding('utf8');
                cp!.stderr!.setEncoding('utf8');
                cp!.stderr!.on('data',(data)=>{
                    writeEmitter.fire(formatText(data));
                });
                cp!.stdout!.on('data',(data)=>{
                    writeEmitter.fire(formatText(data));
                });
                cp!.once('exit',()=>{
                    writeEmitter.fire('**** Configure task complete ****\n\rPress eny key to close this terminal\r\n');
                    cp = undefined;
                    myStatusBarItems[1].text=`$(tools)`;
                    this.busy = false;
                });
            },
            close: async () => {
                if(cp){
                    cp.kill("SIGKILL");
                    cp = undefined;
                }
                myStatusBarItems[1].text=`$(tools)`;
                this.busy = false;
            },
            handleInput:()=>{
                if(!this.busy && terminal) terminal.dispose();
            }
        };

        terminal = (<any>vscode.window).createTerminal({name:`Configure : Snort3 Build Tools`, pty:pty});
        terminal.show();
    },

    async build(workspace:vscode.WorkspaceFolder)
    {
        var terminal:vscode.Terminal;
        if(this.busy) {
            terminal!.dispose();
            return;
        }
        this.busy = true;
        myStatusBarItems[2].text=`$(settings-gear~spin)`
        const writeEmitter = new vscode.EventEmitter<string>();
        var cp:child_process.ChildProcess|undefined = undefined;
        let config = get_config();
        const concurrency = '-j'+get_concurrency().toString();
        var build_dir = workspace.uri.path+'/build';
        if(config.snort3_build_dir && config.snort3_build_dir !== "")
            build_dir = config.snort3_build_dir;
        let config_args:string[] = [];
        config_args.push(concurrency);
        config_args.push("install");
        const pty = {
            onDidWrite: writeEmitter.event,
            open: async () => {
                writeEmitter.fire('*** Building snort3 ***\r\n');
                writeEmitter.fire('make '+concurrency+' install\r\n')
                cp = child_process.spawn('make',config_args, {cwd:build_dir, env:config.env});
                if(!cp || !cp.pid){
                    writeEmitter.fire('**** ERROR starting build task ****\r\n');
                    myStatusBarItems[2].text=`$(settings-gear)`;
                    this.busy = false;
                    return;
                }
                cp!.stdout!.setEncoding('utf8');
                cp!.stderr!.setEncoding('utf8');
                cp!.stderr!.on('data',(data)=>{
                    writeEmitter.fire(formatText(data));
                });
                cp!.stdout!.on('data',(data)=>{
                    writeEmitter.fire(formatText(data));
                });
                cp!.once('exit',()=>{
                    writeEmitter.fire('**** Build task complete ****\n\rPress eny key to close this terminal\r\n');
                    cp = undefined;
                    myStatusBarItems[2].text=`$(settings-gear)`;
                    this.busy = false;
                });
            },
            close: async () => {
                if(cp){
                    cp.kill("SIGKILL");
                    cp = undefined;
                }
                myStatusBarItems[2].text=`$(settings-gear)`;
                this.busy = false;
            },
            handleInput:()=>{
                if(!this.busy && terminal) terminal.dispose();
            }
        };
        terminal = (<any>vscode.window).createTerminal({name:`Make : Snort3 Build Tools`, pty:pty});
        terminal.show();
    }
}