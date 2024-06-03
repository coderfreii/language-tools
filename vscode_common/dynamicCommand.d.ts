import { vscode } from "./thirdPartForUse";
export declare const vscodeLibs: {
    dynamicCommands: {
        enable: (context: vscode.ExtensionContext) => void;
        register: (context: vscode.ExtensionContext, command: CommandJSON, callback: (...args: any[]) => any) => void;
    };
};
type CommandJSON = {
    command: string;
    label: string;
};
export type { CommandJSON, };
