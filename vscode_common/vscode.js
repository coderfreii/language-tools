"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vscodeWrapper = void 0;
const thirdPartForUse_1 = require("./thirdPartForUse");
function operateContext(...anyElse) {
    return thirdPartForUse_1.vscode.commands.executeCommand('setContext', ...anyElse);
}
function createLanguageStatusItem(id, selector) {
    return thirdPartForUse_1.vscode.languages.createLanguageStatusItem(id, selector);
}
async function requestReloadVscode(msg) {
    const reload = await thirdPartForUse_1.vscode.window.showInformationMessage(msg, 'Reload Window');
    if (reload === undefined) {
        return; // cancel
    }
    thirdPartForUse_1.vscode.commands.executeCommand('workbench.action.reloadWindow');
}
exports.vscodeWrapper = {
    operateContext,
    createLanguageStatusItem,
    requestReloadVscode
};
//# sourceMappingURL=vscode.js.map