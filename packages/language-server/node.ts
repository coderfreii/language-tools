import type { Connection } from 'vscode-languageserver';
import { createConnection, createServer, loadTsdkByPath } from '@volar/language-server/node';
import { ParsedCommandLine, VueCompilerOptions, createParsedCommandLineWithVueOptions, createVueLanguagePlugin, parse, resolveVueCompilerOptions } from '@vue/language-core';
import { LanguageServiceEnvironment, convertAttrName, convertTagName, createDefaultGetTsPluginClient, detect, getVueLanguageServicePlugins, type TsPluginClientProvider, type VueCompilerOptionsProvider } from '@vue/language-service';
import * as tsPluginClient from '@vue/typescript-plugin/lib/client';
import { searchNamedPipeServerForFile } from '@vue/typescript-plugin/lib/utils';
import { URI } from 'vscode-uri';
import { GetLanguagePlugin, createHybridModeProjectFacade } from './lib/hybridModeProject';
import { DetectNameCasingRequest, GetConnectedNamedPipeServerRequest, GetConvertAttrCasingEditsRequest, GetConvertTagCasingEditsRequest, ParseSFCRequest } from './lib/protocol';
import type { VueInitializationOptions } from './lib/types';
import { createTypeScriptProjectFacade, type LanguagePluginProvider } from '@volar/language-server/lib/project/typescriptProjectFacade';





let tsdk: ReturnType<typeof loadTsdkByPath>;
let hybridMode: boolean;
let tsPluginClientProvider: TsPluginClientProvider;

const envToVueOptions = new WeakMap<LanguageServiceEnvironment, VueCompilerOptions>();

const vueCompilerOptionsProvider: VueCompilerOptionsProvider = env => envToVueOptions.get(env)!;

const languagePluginSProvider: LanguagePluginProvider = (env, ctx) => getLanguagePlugins({
	serviceEnv: env,
	configFileName: ctx.configFileName,
	projectHost: ctx.languageServiceHost,
	sys: ctx.sys,
	asFileName: ctx.asFileName,
});

const watchedExtensions = new Set<string>();

const connection: Connection = createConnection();

const server = createServer(connection);

connection.listen();

connection.onInitialize(params => {
	const options: VueInitializationOptions = params.initializationOptions;

	hybridMode = options.vue?.hybridMode ?? true;

	tsdk = loadTsdkByPath(options.typescript.tsdk, params.locale);

	tsPluginClientProvider = resolveTsPlugin();


	const plugins = getVueLanguageServicePlugins(
		tsdk.typescript,
		vueCompilerOptionsProvider,
		tsPluginClientProvider,
		hybridMode,
	);

	const projectFacade = hybridMode
		? createHybridModeProjectFacade(tsdk.typescript.sys, getLanguagePlugins)
		: createTypeScriptProjectFacade(
			tsdk.typescript,
			tsdk.diagnosticMessages,
			languagePluginSProvider
		);


	const result = server.initialize(
		params,
		plugins,
		projectFacade,
		{
			pullModelDiagnostics: hybridMode,
		},
	);

	if (hybridMode) {
		// provided by tsserver + @vue/typescript-plugin
		result.capabilities.semanticTokensProvider = undefined;
	}

	return result;
});

connection.onInitialized(() => {
	server.initialized();
});

connection.onShutdown(() => {
	server.shutdown();
});

connection.onRequest(ParseSFCRequest.type, params => {
	return parse(params);
});

connection.onRequest(DetectNameCasingRequest.type, async params => {
	const uri = URI.parse(params.textDocument.uri);
	const languageService = await getService(uri);
	if (languageService) {
		return await detect(languageService.context, uri);
	}
});

connection.onRequest(GetConvertTagCasingEditsRequest.type, async params => {
	const uri = URI.parse(params.textDocument.uri);
	const languageService = await getService(uri);
	if (languageService) {
		return await convertTagName(languageService.context, uri, params.casing, tsPluginClientProvider(languageService.context));
	}
});

connection.onRequest(GetConvertAttrCasingEditsRequest.type, async params => {
	const uri = URI.parse(params.textDocument.uri);
	const languageService = await getService(uri);
	if (languageService) {
		return await convertAttrName(languageService.context, uri, params.casing, tsPluginClientProvider(languageService.context));
	}
});

connection.onRequest(GetConnectedNamedPipeServerRequest.type, async fileName => {
	const server = (await searchNamedPipeServerForFile(fileName))?.server;
	if (server) {
		return server;
	}
});

async function getService(uri: URI) {
	return (await server.projectFacade.reolveLanguageServiceByUri(server, uri));
}


const getLanguagePlugins: GetLanguagePlugin<URI> = async ({ serviceEnv, configFileName, projectHost, sys, asFileName }) => {
	const commandLine = await parseCommandLine();
	const vueOptions = commandLine?.vueOptions ?? resolveVueCompilerOptions({});
	const vueLanguagePlugin = createVueLanguagePlugin(
		tsdk.typescript,
		asFileName,
		sys?.useCaseSensitiveFileNames ?? false,
		() => projectHost?.getProjectVersion?.() ?? '',
		() => projectHost?.getScriptFileNames() ?? [],
		commandLine?.options ?? {},
		vueOptions,
	);
	if (!hybridMode) {
		const extensions = [
			'js', 'cjs', 'mjs', 'ts', 'cts', 'mts', 'jsx', 'tsx', 'json',
			...vueOptions.extensions.map(ext => ext.slice(1)),
			...vueOptions.vitePressExtensions.map(ext => ext.slice(1)),
			...vueOptions.petiteVueExtensions.map(ext => ext.slice(1)),
		];
		const newExtensions = extensions.filter(ext => !watchedExtensions.has(ext));
		if (newExtensions.length) {
			for (const ext of newExtensions) {
				watchedExtensions.add(ext);
			}
			server.filerWatcher.watchFiles(['**/*.{' + newExtensions.join(',') + '}']);
		}
	}

	envToVueOptions.set(serviceEnv, vueOptions);

	return [vueLanguagePlugin];

	async function parseCommandLine() {
		let commandLine: ParsedCommandLine | undefined;
		let sysVersion: number | undefined;
		if (sys) {
			let newSysVersion = await sys.sync();
			while (sysVersion !== newSysVersion) {
				sysVersion = newSysVersion;
				if (configFileName) {
					commandLine = createParsedCommandLineWithVueOptions(tsdk.typescript, sys, configFileName);
				}
				newSysVersion = await sys.sync();
			}
		}
		return commandLine;
	}
};



function resolveTsPlugin() {
	if (hybridMode) {
		return () => tsPluginClient;
	}
	else {
		return createDefaultGetTsPluginClient(tsdk.typescript);
	}
}

