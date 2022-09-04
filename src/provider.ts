import * as vscode from 'vscode';
import * as path from 'path';
import { Bridge } from './bridge';

export class GoWorkProvider implements vscode.TreeDataProvider<GoWorkItem> {
    constructor(private bridge: Bridge) { }

    private _onDidChangeTreeData: vscode.EventEmitter<GoWorkItem | undefined | void> = new vscode.EventEmitter<GoWorkItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<GoWorkItem | undefined | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: GoWorkItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: GoWorkItem | undefined): vscode.ProviderResult<GoWorkItem[]> {
        if (element || !this.bridge.check()) {
            return Promise.resolve([]);
        }

        let ret: GoWorkItem[] = [];
        this.bridge.getInfo().mods.forEach(v => {
            ret.push(new GoWorkItem(v.path, v.used));
        });
        return Promise.resolve(ret);
    }
}

export class GoWorkItem extends vscode.TreeItem {
    constructor(
        public name: string,
        public used: boolean,
        public readonly command?: vscode.Command,
        public readonly importPath?: string,
    ) {
        super(name);
        this.tooltip = importPath;
        this.description = `${name}: ${importPath}`;
        this.iconPath = used ? this.iconUsed : this.iconUnused;
    }

    iconUsed = path.join(__filename, '..', '..', 'media', 'mod_check.svg');
    iconUnused = path.join(__filename, '..', '..', 'media', 'mod_x.svg');

    iconPath = '';

    contextValue = 'goModItem';
    collapsibleState = vscode.TreeItemCollapsibleState.None;
}
