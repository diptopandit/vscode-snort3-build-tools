import * as vscode from 'vscode';
import {cpus} from 'os';

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

export function get_config(include_options:boolean = false):buildToolsConfig
{
    let current_config:buildToolsConfig = {
        log : <boolean>vscode.workspace.getConfiguration('snort3BuildTools').get<boolean>('logCommands'),
        dependency_path : <string>vscode.workspace.getConfiguration('snort3BuildTools.environment').get<string>('dependenciesDir'),
        sf_prefix_snort3 : <string>vscode.workspace.getConfiguration('snort3BuildTools.environment').get<string>('snortInstallDir'),
        snort3_build_dir : <string>vscode.workspace.getConfiguration('snort3BuildTools.environment').get<string>('snortBuildDir'),
        env : Object.assign({},process.env)
    };

    current_config.env.PATH = current_config.env.PATH! + ':' + current_config.dependency_path + '/libdaq/bin';
    current_config.env.PKG_CONFIG_PATH = current_config.dependency_path + '/cpputest/lib64/pkgconfig:' +
        current_config.dependency_path + '/safec/lib/pkgconfig';
    current_config.env.LD_LIBRARY_PATH = current_config.dependency_path + '/cpputest/lib64:' +
        current_config.dependency_path + '/libdaq/lib:' + current_config.dependency_path + '/safec/lib';
    current_config.env.LUA_PATH = current_config.sf_prefix_snort3 + '/include/snort/lua/\\?.lua\\;\\;';
    current_config.env.SNORT_LUA_PATH = current_config.sf_prefix_snort3 + '/etc/snort';
    current_config.env.SNORT_PLUGIN_PATH = current_config.sf_prefix_snort3 + '/lib64';
    
    if(include_options)
    {
        current_config.options = {
            sanitiser : {enabled:<boolean>vscode.workspace.getConfiguration('snort3BuildTools.configOption').get<boolean>('enableSanitiser')},
            debug : <boolean>vscode.workspace.getConfiguration('snort3BuildTools.configOption').get<boolean>('enableDebug'),
            debug_msg : <boolean>vscode.workspace.getConfiguration('snort3BuildTools.configOption').get<boolean>('debugMessage'),
            shell : <boolean>vscode.workspace.getConfiguration('snort3BuildTools.configOption').get<boolean>('enableShell'),
            app_id : <boolean>vscode.workspace.getConfiguration('snort3BuildTools.configOption').get<boolean>('enableAppId'),
            piglet : <boolean>vscode.workspace.getConfiguration('snort3BuildTools.configOption').get<boolean>('enablePiglet'),
            coverage : <boolean>vscode.workspace.getConfiguration('snort3BuildTools.configOption').get<boolean>('enableCodeCoverage')
        };

        if(current_config.options.sanitiser.enabled)
            current_config.options.sanitiser.type = <string>vscode.workspace.getConfiguration('snort3BuildTools.configOption').get<string>('sanitiser');
    }
    return current_config;
}

export function get_install_dir():string{
    return <string>(vscode.workspace.getConfiguration('snort3BuildTools.environment').get<string>('snortInstallDir'));
}

export function get_dependencies():string {
    return <string>(vscode.workspace.getConfiguration('snort3BuildTools.environment').get<string>('dependenciesDir'));
}

export function get_concurrency():number {
    const new_concur = <number>(vscode.workspace.getConfiguration('snort3BuildTools.environment').get<number>('concurrency'));
    if(new_concur) return new_concur;
    else return cpus().length;
}

export function get_default_target():string {
    return <string>vscode.workspace.getConfiguration('snort3BuildTools').get<string>('defaultTarget');
}