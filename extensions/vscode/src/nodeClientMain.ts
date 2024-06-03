import { createLabsInfo } from '@volar/vscode';
import * as serverLib from '@volar/language-server/protocol';
import * as vscode from 'vscode';
import * as lsp from '@volar/vscode/node';
import { activate as commonActivate, deactivate as commonDeactivate } from './common';
import { config } from './config';
import { middleware } from './middleware';
import { patch } from './patch';
import { forCompatible } from './common/compatible';


export async function activate(context: vscode.ExtensionContext) {

	const volarLabs = createLabsInfo(serverLib);

	await commonActivate(context, (
		id,
		name,
		documentSelector,
		initOptions,
		port,
		outputChannel
	) => {

		class _LanguageClient extends lsp.LanguageClient {
			fillInitializeParams(params: lsp.InitializeParams) {
				// fix https://github.com/vuejs/language-tools/issues/1959
				params.locale = vscode.env.language;
			}
		}

		let serverModule = vscode.Uri.joinPath(context.extensionUri, 'server.js');

		const runOptions: lsp.ForkOptions = {};
		if (config.server.maxOldSpaceSize) {
			runOptions.execArgv ??= [];
			runOptions.execArgv.push("--max-old-space-size=" + config.server.maxOldSpaceSize);
		}
		const debugOptions: lsp.ForkOptions = { execArgv: ['--nolazy', '--inspect=' + port] };
		const serverOptions: lsp.ServerOptions = {
			run: {
				module: serverModule.fsPath,
				transport: lsp.TransportKind.ipc,
				options: runOptions
			},
			debug: {
				module: serverModule.fsPath,
				transport: lsp.TransportKind.ipc,
				options: debugOptions
			},
		};
		const clientOptions: lsp.LanguageClientOptions = {
			middleware,
			documentSelector: documentSelector,
			initializationOptions: initOptions,
			markdown: {
				isTrusted: true,
				supportHtml: true,
			},
			outputChannel,
		};
		const client = new _LanguageClient(
			id,
			name,
			serverOptions,
			clientOptions,
		);
		client.start();

		volarLabs.addLanguageClient(client);

		updateProviders(client);

		return client;
	});

	forCompatible.checkCompatible()

	return volarLabs.extensionExports;
}

export function deactivate(): Thenable<any> | undefined {
	return commonDeactivate();
}

function updateProviders(client: lsp.LanguageClient) {

	const initializeFeatures = (client as any).initializeFeatures;

	(client as any).initializeFeatures = (...args: any) => {
		const capabilities = (client as any)._capabilities as lsp.ServerCapabilities;

		if (!config.codeActions.enabled) {
			capabilities.codeActionProvider = undefined;
		}
		if (!config.codeLens.enabled) {
			capabilities.codeLensProvider = undefined;
		}
		if (!config.updateImportsOnFileMove.enabled && capabilities.workspace?.fileOperations?.willRename) {
			capabilities.workspace.fileOperations.willRename = undefined;
		}

		return initializeFeatures.call(client, ...args);
	};
}


patch.patchTypescriptLanguageFeaturesExtention()