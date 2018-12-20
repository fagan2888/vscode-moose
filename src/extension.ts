'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    // console.log('Congratulations, your extension "moose" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.sayHello', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World!');
    });
    context.subscriptions.push(disposable);

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider('*', {
        provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
            return [
                new vscode.CompletionItem("[Mesh]"),
                new vscode.CompletionItem("[BCS]"),
                new vscode.CompletionItem("[GlobalParams]")];
        }})
        );

    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(
            {language: "moose"}, new DocumentSymbolProvider()
        ));
}

// this method is called when your extension is deactivated
export function deactivate() {
}

class DocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    public provideDocumentSymbols(document: vscode.TextDocument,
            token: vscode.CancellationToken): Thenable<vscode.SymbolInformation[]> {
        return new Promise((resolve, reject) => {
            var symbols = [];
            var head1_regex = new RegExp('\\[[a-zA-Z0-9]+\\]');
            var head2_regex = new RegExp('\\[\\.\\/[a-zA-Z0-9]+\\]');
           
            for (var i = 0; i < document.lineCount; i++) {
                var line = document.lineAt(i);
                var text = line.text.trim()
                // if (line.text.startsWith("[")) {
                if (head1_regex.test(text)) {
                    symbols.push({
                        name: text.substr(1, text.length-2),
                        containerName: "Header1",
                        kind: vscode.SymbolKind.String,
                        location: new vscode.Location(document.uri, line.range)
                    });
                }
                if (head2_regex.test(text)) {
                    symbols.push({
                        name: text.substr(3, text.length-4),
                        containerName: "Header2",
                        kind: vscode.SymbolKind.String,
                        location: new vscode.Location(document.uri, line.range)
                    });
                }
           }

            resolve(symbols);
        });
    }
}