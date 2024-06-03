/// <reference types="vscode" />
import { vscode } from "./thirdPartForUse";
declare function operateContext(...anyElse: Parameters<typeof vscode.commands.executeCommand>[1]): Thenable<unknown>;
declare function createLanguageStatusItem(id: Parameters<typeof vscode.languages.createLanguageStatusItem>[0], selector: Parameters<typeof vscode.languages.createLanguageStatusItem>[1]): vscode.LanguageStatusItem;
declare function requestReloadVscode(msg: string): Promise<void>;
export declare const vscodeWrapper: {
    operateContext: typeof operateContext;
    createLanguageStatusItem: typeof createLanguageStatusItem;
    requestReloadVscode: typeof requestReloadVscode;
};
export {};
