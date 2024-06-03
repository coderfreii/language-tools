"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vscodeLibs = void 0;
const thirdPartForUse_1 = require("./thirdPartForUse");
// 定义动态命令列表
function DynamicCommand() {
    const _self = {
        _dynamicCommands: [],
        _enabled: false,
        isEnabled() {
            return this._enabled;
        },
        setEnabled(enabled) {
            this._enabled = enabled;
        },
        checkEnabled() {
            if (!this.isEnabled())
                throw Error("must enable first");
        }
    };
    function enable(context) {
        if (_self.isEnabled())
            return;
        // 注册一个静态命令
        const disposable = thirdPartForUse_1.vscode.commands.registerCommand("vue.action.showDynamicCommands", async () => {
            // 显示快速选择器
            const selectedCommand = await thirdPartForUse_1.vscode.window.showQuickPick(_self._dynamicCommands, {
                placeHolder: "Select a command to execute",
            });
            if (selectedCommand) {
                // 执行选定的动态命令
                thirdPartForUse_1.vscode.commands.executeCommand(selectedCommand.command);
            }
        });
        context.subscriptions.push(disposable);
        _self.setEnabled(true);
    }
    function register(context, command, callback) {
        _self.checkEnabled();
        _self._dynamicCommands.push(command);
        // 动态注册命令
        context.subscriptions.push(thirdPartForUse_1.vscode.commands.registerCommand(command.command, callback));
    }
    return {
        enable,
        register
    };
}
exports.vscodeLibs = {
    dynamicCommands: DynamicCommand()
};
//# sourceMappingURL=dynamicCommand.js.map