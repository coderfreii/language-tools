import { createLanguageServicePlugin, externalFiles } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin';
import * as vue from '@vue/language-core';
import { decorateLanguageServiceForVue } from './lib/common';
import { projects, startNamedPipeServer } from './lib/server';

const windowsPathReg = /\\/g;

const plugin = createLanguageServicePlugin(
	(ts, info) => {
		const vueOptions = getVueCompilerOptions();
		const languagePlugin = vue.createVueLanguagePlugin<string>(
			ts,
			id => id,
			info.languageServiceHost.useCaseSensitiveFileNames?.() ?? false,
			() => info.languageServiceHost.getProjectVersion?.() ?? '',
			() => externalFiles.get(info.project) ?? [],
			info.languageServiceHost.getCompilationSettings(),
			vueOptions
		);

		return {
			languagePlugins: [languagePlugin],
			setup: language => {
				projects.set(info.project, { info, language, vueOptions });

				decorateLanguageServiceForVue(language, info.languageService, vueOptions, ts, true, fileName => fileName);
				startNamedPipeServer(ts, info.project.projectKind, info.project.getCurrentDirectory());

				// #3963
				const timer = setInterval(() => {
					if (info.project['program']) {
						clearInterval(timer);
						(info.project['program'] as any).__vue__ = { language };
					}
				}, 50);
			}
		};

		function getVueCompilerOptions() {
			if (info.project.projectKind === ts.server.ProjectKind.Configured) {
				const tsconfig = info.project.getProjectName();
				return vue.createParsedCommandLine(ts, ts.sys, tsconfig.replace(windowsPathReg, '/')).vueOptions;
			}
			else {
				return vue.createParsedCommandLineByJson(ts, ts.sys, info.languageServiceHost.getCurrentDirectory(), {}).vueOptions;
			}
		}
	}
);

export = plugin;
