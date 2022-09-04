import * as vscode from 'vscode';
import { Bridge } from './bridge';
import { GoWorkItem, GoWorkProvider } from './provider';

const cacheBridgeKey = "workman-bridge";

export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-go-work-manager" is now active!');

	context.subscriptions.push(vscode.commands.registerCommand('vscode-go-work-manager.hello', () => {
		vscode.window.showInformationMessage('Hello from vscode-go-work-manager!');
	}));

	// build our workman command bridge.
	const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : ".";
	let bridge = new Bridge(rootPath);
	bridge.reload();
	context.globalState.update(cacheBridgeKey, bridge);
	let provider = new GoWorkProvider(bridge);

	vscode.window.registerTreeDataProvider(
		'goWorkManager',
		provider
	);


	context.subscriptions.push(vscode.commands.registerCommand('vscode-go-work-manager.testReload', () => {
		let ret = bridge.reload();
		vscode.window.showInformationMessage(JSON.stringify(ret));
	}));
	context.subscriptions.push(vscode.commands.registerCommand('vscode-go-work-manager.toggleItem', (item: GoWorkItem) => {
		let ret = bridge.toggle(item.name) ?? "OK";
		vscode.window.showInformationMessage(ret);
		bridge.reload();
		provider.refresh();
	}));
	context.subscriptions.push(vscode.commands.registerCommand('vscode-go-work-manager.testAdd', async () => {
		const info = bridge.getInfo();
		const result = await vscode.window.showInputBox({
			value: '',
			placeHolder: `add module to '${info.path}'`,
		});
		let ok = true;
		info._raw.used.forEach(v => {
			if (v === result) {
				vscode.window.showWarningMessage(`Already in use: ${result}`);
				ok = false;
			}
		});
		if (!ok || result === undefined) {
			return;
		}
		if (!bridge.update(info._raw.used.concat([result]))) {
			vscode.window.showWarningMessage(`Add failed: ${result}`);
		}
		vscode.window.showInformationMessage(`Add: ${result}`);
	}));
	context.subscriptions.push(vscode.commands.registerCommand('vscode-go-work-manager.testDrop', async () => {
		const info = bridge.getInfo();
		const result = await vscode.window.showInputBox({
			value: '',
			placeHolder: `drop module from '${bridge.getInfo().path}'`,
		});
		let ok = false;
		let to: string[] = [];
		info._raw.used.forEach(v => {
			if (v === result) {
				ok = true;
				return;
			}
			to.push(v);
		});
		if (!ok || result === undefined) {
			return;
		}
		if (!bridge.update(to)) {
			vscode.window.showWarningMessage(`Drop failed: ${result}`);
		}
		vscode.window.showInformationMessage(`Drop: ${result}`);
	}));
}

export function deactivate() { }
