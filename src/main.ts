import * as vscode from 'vscode';
import * as fs from 'fs';
import {snort3BuildTools} from './build_tools';
import {cpus} from 'os';

const status_priority:number = 501;
export var myStatusBarItems: vscode.StatusBarItem[];
export function get_concurrency():number{
    const new_concur = <number>(vscode.workspace.getConfiguration('snort3BuildTools').get('concurrency'));
    if(new_concur) return new_concur;
    else return cpus().length;
}
export async function activate(context: vscode.ExtensionContext) {
    if(!vscode.workspace.workspaceFolders)
     return;
    const snort3_ws_root:vscode.WorkspaceFolder[] = [];
    for (const workspaceFolder of vscode.workspace.workspaceFolders)
    {
        try{
            fs.accessSync(workspaceFolder.uri.path + '/snort.pc.in', fs.constants.R_OK);
            snort3_ws_root.push(workspaceFolder);
        } catch {
            
        }
    }
    if(!snort3_ws_root.length) return;
    let api = {
        get_snort3_src_path():string{return snort3_ws_root[0].uri.path;}, //only support single snort3 folder now
        get_sf_prefix_snort3():string{return <string>(vscode.workspace.getConfiguration('snort3BuildTools').get('sf_prefix_snort3'));},
        get_dependencies():string{return <string>(vscode.workspace.getConfiguration('snort3BuildTools').get('dependencies'));},
        get_status_priority():number{ return status_priority;},
        get_concurrency:get_concurrency

    };
    context.subscriptions.push(vscode.commands.registerCommand(
        'snort3BuildTools.configure', (ws:vscode.WorkspaceFolder= snort3_ws_root[0])=>{
            snort3BuildTools.configure(ws)}));
    context.subscriptions.push(vscode.commands.registerCommand(
        'snort3BuildTools.build', (ws:vscode.WorkspaceFolder= snort3_ws_root[0])=>{
            snort3BuildTools.build(ws)}));
    myStatusBarItems=[];
    myStatusBarItems.push(vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,status_priority+4));
    myStatusBarItems.push(vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,status_priority+3));
    myStatusBarItems.push(vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,status_priority+2));
    myStatusBarItems.push(vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,status_priority));
    myStatusBarItems[0].text=`Snort3 tools [`;
    myStatusBarItems[1].text=`$(tools)`;
    myStatusBarItems[1].tooltip='Configure snort3';
    myStatusBarItems[1].command='snort3BuildTools.configure';
    myStatusBarItems[2].text = '$(gear)';
    myStatusBarItems[2].tooltip='Build snort3';
    myStatusBarItems[2].command='snort3BuildTools.build'
    myStatusBarItems[3].text=`]`;
    for(const index in myStatusBarItems){
        context.subscriptions.push(myStatusBarItems[index]);
        myStatusBarItems[index].show();
    }
    return api;
}
