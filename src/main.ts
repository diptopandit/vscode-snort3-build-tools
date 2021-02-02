import * as vscode from 'vscode';
import * as fs from 'fs';
import {snort3BuildTools} from './build_tools';
import {cpus} from 'os';


const snort3_ws_root:vscode.WorkspaceFolder[] = [];

export function get_concurrency():number {
    const new_concur = <number>(vscode.workspace.getConfiguration('snort3BuildTools').get('concurrency'));
    if(new_concur) return new_concur;
    else return cpus().length;
}

function get_snort3_src_path():string {
    if(snort3_ws_root.length) return snort3_ws_root[0].uri.path; //only support single snort3 folder now
    return "";
}

function get_sf_prefix_snort3():string {
    return <string>(vscode.workspace.getConfiguration('snort3BuildTools').get('sf_prefix_snort3'));
}

function get_dependencies():string {
    return <string>(vscode.workspace.getConfiguration('snort3BuildTools').get('dependencies'));
}

export async function activate(context: vscode.ExtensionContext) {
    const status_priority:number = 501;
    let api = {
        get_snort3_src_path:get_snort3_src_path,
        get_sf_prefix_snort3:get_sf_prefix_snort3,
        get_dependencies:get_dependencies,
        get_status_priority():number{ return status_priority;},
        get_concurrency:get_concurrency

    };
    if(!vscode.workspace.workspaceFolders) return api;
    
    for (const workspaceFolder of vscode.workspace.workspaceFolders)
    {
        try{
            fs.accessSync(workspaceFolder.uri.path + '/snort.pc.in', fs.constants.R_OK);
            snort3_ws_root.push(workspaceFolder);
        } catch {
            //NOOP
        }
    }
    if(!snort3_ws_root.length) return api;
    
    const build_tools = new snort3BuildTools();
    const myStatusBarItems:vscode.StatusBarItem[]=[];
    myStatusBarItems.push(vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,status_priority+4));
    myStatusBarItems.push(vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,status_priority+3));
    myStatusBarItems.push(vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,status_priority+2));
    myStatusBarItems.push(vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,status_priority));
    myStatusBarItems[0].text=`Snort3 tools [`;
    myStatusBarItems[1].text=`$(tools)`;
    myStatusBarItems[1].tooltip='Configure snort3';
    myStatusBarItems[1].command='snort3BuildTools.configure';
    myStatusBarItems[2].text = '$(settings-gear)';
    myStatusBarItems[2].tooltip='Build snort3';
    myStatusBarItems[2].command='snort3BuildTools.build'
    myStatusBarItems[3].text=`]`;
    for(const index in myStatusBarItems){
        context.subscriptions.push(myStatusBarItems[index]);
        myStatusBarItems[index].show();
    }
    context.subscriptions.push(vscode.commands.registerCommand(
        'snort3BuildTools.configure', (ws:vscode.WorkspaceFolder= snort3_ws_root[0])=>{
            build_tools.configure(ws, myStatusBarItems[1])}));
    context.subscriptions.push(vscode.commands.registerCommand(
        'snort3BuildTools.build', (ws:vscode.WorkspaceFolder= snort3_ws_root[0])=>{
            build_tools.build(ws, myStatusBarItems[2])}));
    context.subscriptions.push(build_tools);
    return api;
}
