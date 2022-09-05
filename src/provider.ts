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
        public readonly importPath?: string,
        public readonly command?: vscode.Command,
    ) {
        super(name);
        this.tooltip = importPath;
        this.description = `${importPath ?? ""}`;
        this.iconPath = used ? this.iconUsed : this.iconUnused;
    }

    iconUsed = {
        light: path.join(__filename, '..', '..', 'media', 'light', 'mod_check.svg'),
        dark: path.join(__filename, '..', '..', 'media', 'dark', 'mod_check.svg')
    };
    iconUnused = {
        light: path.join(__filename, '..', '..', 'media', 'light', 'mod_x.svg'),
        dark: path.join(__filename, '..', '..', 'media', 'dark', 'mod_x.svg')
    };
    iconPath = this.iconUsed;

    contextValue = 'goModItem';
    collapsibleState = vscode.TreeItemCollapsibleState.None;
}
