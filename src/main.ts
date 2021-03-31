import * as vscode from 'vscode';
import * as fs from 'fs';
import * as buildToolsUtils from './build_tools_utils';
import {snort3BuildTools, statusIcon, snort3BuildTarget} from './build_tools';

let snort3_ws_root:vscode.WorkspaceFolder;

function get_snort3_src_path():string {
    if(snort3_ws_root) return snort3_ws_root.uri.path; //only support single snort3 folder now
    return "";
}

function get_sf_prefix_snort3():string {
    return buildToolsUtils.get_install_dir();
}

function get_dependencies():string {
    return buildToolsUtils.get_dependencies();
}

export async function activate(context: vscode.ExtensionContext) {
    const status_priority:number = 501;
    let api = {
        get_snort3_src_path:get_snort3_src_path,
        get_sf_prefix_snort3:get_sf_prefix_snort3,
        get_dependencies:get_dependencies,
        get_status_priority():number{ return status_priority;},
        get_concurrency:buildToolsUtils.get_concurrency

    };
    if(!vscode.workspace.workspaceFolders) return api;
    
    for (const workspaceFolder of vscode.workspace.workspaceFolders)
    {
        try{
            fs.accessSync(workspaceFolder.uri.path + '/snort.pc.in', fs.constants.R_OK);
            snort3_ws_root = workspaceFolder;
            break;
        } catch {
            //NOOP
        }
    }
    if(!snort3_ws_root) return api;
    const stored_target = context.workspaceState.get<snort3BuildTarget>('target');
    var target_label = buildToolsUtils.get_default_target();
    if(!target_label) target_label = 'REG_TEST';
    if(stored_target) target_label = stored_target.label;
    const build_tools = new snort3BuildTools(stored_target);
    const myStatusBarItems:vscode.StatusBarItem[]=[];
    myStatusBarItems.push(vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,status_priority+5));
    myStatusBarItems.push(vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,status_priority+4));
    myStatusBarItems.push(vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,status_priority+3));
    myStatusBarItems.push(vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,status_priority+2));
    myStatusBarItems.push(vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,status_priority));
    myStatusBarItems[0].text='Snort3 tools [';
    myStatusBarItems[1].text = target_label;
    myStatusBarItems[1].tooltip = 'snort3 build target';
    myStatusBarItems[1].command = 'snort3BuildTools.setTarget';
    myStatusBarItems[2].text='$('+statusIcon.configure+')';
    myStatusBarItems[2].tooltip='Configure snort3';
    myStatusBarItems[2].command='snort3BuildTools.configure';
    myStatusBarItems[3].text = '$('+statusIcon.build+')';
    myStatusBarItems[3].tooltip='Build snort3';
    myStatusBarItems[3].command='snort3BuildTools.build'
    myStatusBarItems[4].text=`]`;
    myStatusBarItems.forEach(item => {
        context.subscriptions.push(item);
        item.show();
    });
    context.subscriptions.push(vscode.commands.registerCommand(
        'snort3BuildTools.configure', (ws:vscode.WorkspaceFolder= snort3_ws_root)=>{
            build_tools.configure(ws, myStatusBarItems[1].text, myStatusBarItems[2])}));
    context.subscriptions.push(vscode.commands.registerCommand(
        'snort3BuildTools.clean', (ws:vscode.WorkspaceFolder= snort3_ws_root)=>{
            build_tools.clean(ws, myStatusBarItems[1].text, myStatusBarItems[3])}));
    context.subscriptions.push(vscode.commands.registerCommand(
        'snort3BuildTools.build', (ws:vscode.WorkspaceFolder= snort3_ws_root)=>{
            build_tools.build(ws, myStatusBarItems[1].text, myStatusBarItems[3])}));
    context.subscriptions.push(vscode.commands.registerCommand(
        'snort3BuildTools.setTarget', ()=>{
            vscode.window.showQuickPick<snort3BuildTarget>(snort3BuildTools.getTargets()).then((selection)=>{
                if(selection){
                    myStatusBarItems[1].text = selection.label;
                    context.workspaceState.update('target',selection);
                }
            })
        }));
    context.subscriptions.push(build_tools);
    vscode.commands.executeCommand('setContext', 'snort3BuildTools:enabled', true);
    return api;
}
