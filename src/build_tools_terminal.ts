import * as vscode from 'vscode';
import * as child_process from 'child_process';

const formatText = (text: string) => `\r${text.split(/(\r?\n)/g).join("\r")}\r`;

export class snort3BuildToolsTerminal
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