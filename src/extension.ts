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

    // TODO delete sayHello command
    let disposable = vscode.commands.registerCommand('extension.sayHello', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World!');
    });
    context.subscriptions.push(disposable);

    var moose_selector = {scheme: 'file', language: "moose"};

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            moose_selector, new CompletionItemProvider(), '['));

    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(
            moose_selector, new DocumentSymbolProvider()));

    context.subscriptions.push(
        vscode.languages.registerReferenceProvider(
            moose_selector, new ReferenceProvider()));

    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(
            moose_selector, new DefinitionProvider()));

}

// this method is called when your extension is deactivated
export function deactivate() {
}

export default async function findFilesInWorkspace(include: string, exclude = '', maxResults = 2) {
    
    const foundFiles = await vscode.workspace.findFiles(
        include,
        exclude,
        maxResults,
    );
    return foundFiles;
}

class DefinitionProvider implements vscode.DefinitionProvider {
    public provideDefinition(
        document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        Thenable<vscode.Location> {
            return this.doFindDefinition(document, position, token);
        }
        private doFindDefinition(
            document: vscode.TextDocument, position: vscode.Position, 
            token: vscode.CancellationToken): Thenable<vscode.Location> {
            return new Promise<vscode.Location>((resolve, reject) => {
                let wordRange = document.getWordRangeAtPosition(position);
            
                // ignore if empty
                if (!wordRange) {
                    //TODO how to show error message at cursor position?
                    vscode.window.showWarningMessage("empty string not definable");
                    reject("empty string not definable");
                    return;
                }
                let word_text = document.getText(wordRange);

                const ignorePaths = vscode.workspace.getConfiguration('moose.definitions').get('ignore', []);
                var exclude = '';
                if (ignorePaths) {
                    var exclude = `{${ignorePaths.join(',')}}`;
                }
                const includePaths = [
                    '**/src/**/'+word_text+'.C'
                ];
                
                // TODO search outside workspace
                const uri = findFilesInWorkspace(`{${includePaths.join(',')}}`, exclude);

                uri.then(
                    uris_found => {
                        
                        if (uris_found.length === 0) {
                            reject("could not find declaration");
                            return;
                        }
                        if (uris_found.length > 1) {
                            reject("multiple declarations found");
                            return;
                        }

                        var location = new vscode.Location(
                            uris_found[0],
                            new vscode.Position(0, 0));
                        resolve(location);
                    },
                    failure => {
                        reject("file finder failed");
                    }
                );

            });}
    }

// TODO implement change all occurences reference names

class ReferenceProvider implements vscode.ReferenceProvider {
    public provideReferences(
        document: vscode.TextDocument, position: vscode.Position,
        options: { includeDeclaration: boolean }, token: vscode.CancellationToken): Thenable<vscode.Location[]> {
            return this.doFindReferences(document, position, options, token);
    }

    private doFindReferences(
        document: vscode.TextDocument, position: vscode.Position, 
        options: { includeDeclaration: boolean }, token: vscode.CancellationToken): Thenable<vscode.Location[]> {
		return new Promise<vscode.Location[]>((resolve, reject) => {
			// get current word
            let wordRange = document.getWordRangeAtPosition(position);
            
            // ignore if empty
			if (!wordRange) {
                //TODO how to show error message at cursor position?
                // vscode.window.showWarningMessage("empty string not referencable");
                // console.log("empty string not referencable");
                reject("empty string not referencable");
                
            }
            let word_text = document.getText(wordRange);

            // ignore if is a number
            if (!isNaN(Number(word_text))){
                // return resolve([]);
                //TODO how to show error message at cursor position?
                // vscode.window.showWarningMessage("numbers are not referencable");
                // console.log("numbers are not referencable");
                reject("numbers are not referencable");
                
            }

            let results: vscode.Location[] = [];
            let in_variables = false;

            for (var i = 0; i < document.lineCount; i++) {
                var line = document.lineAt(i);
                
                // remove comments
                var line_text = line.text.trim().split("#")[0].trim();

                // reference variable instatiation in [Variables] block e.g. [./c]
                if (line_text === "[Variables]" || line_text === "[AuxVariables]") {
                    in_variables = true;
                }
                if (line_text === "[]") {
                    in_variables = false;
                }
                if (in_variables && line_text === "[./"+word_text+"]"){
                    results.push(new vscode.Location(document.uri, line.range));
                    continue;
                }

                // get right side of equals
                if (!line_text.includes("=")) {
                    continue;
                }
                var larray = line_text.split("=");
                if (larray.length < 2){
                    continue;
                }
                var equals_text = larray[1].trim();

                // remove quotes
                if (equals_text.startsWith("'") && equals_text.endsWith("'")) {
                    equals_text = equals_text.substr(1, equals_text.length - 2);
                }
                if (equals_text.startsWith('"') && equals_text.endsWith('"')) {
                    equals_text = equals_text.substr(1, equals_text.length - 2);
                }

                // test if only reference
                if (equals_text === word_text) {
                    results.push(new vscode.Location(document.uri, line.range));
                } else {
                    // test if one of many references
                    for (let elem of equals_text.split(" ")) {
                        if (elem.trim() === word_text) {
                            results.push(new vscode.Location(document.uri, line.range));
                            break;
                        }
                }
                }

            }
            resolve(results);
        });}
}

class CompletionItemProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
        return [
            new vscode.CompletionItem("./"),
            new vscode.CompletionItem("../"),
            new vscode.CompletionItem("GlobalParams", vscode.CompletionItemKind.Field),
            new vscode.CompletionItem("Variables", vscode.CompletionItemKind.Field),
            new vscode.CompletionItem("AuxVariables", vscode.CompletionItemKind.Field),
            new vscode.CompletionItem("Mesh", vscode.CompletionItemKind.Field),
            new vscode.CompletionItem("BCS", vscode.CompletionItemKind.Field),
            new vscode.CompletionItem("ICS", vscode.CompletionItemKind.Field),
            new vscode.CompletionItem("Problem", vscode.CompletionItemKind.Field),
            new vscode.CompletionItem("Precursors", vscode.CompletionItemKind.Field),
            new vscode.CompletionItem("Kernels", vscode.CompletionItemKind.Field),
            new vscode.CompletionItem("AuxKernels", vscode.CompletionItemKind.Field),
            new vscode.CompletionItem("Functions", vscode.CompletionItemKind.Field),
            new vscode.CompletionItem("Materials", vscode.CompletionItemKind.Field),
            new vscode.CompletionItem("Executioner", vscode.CompletionItemKind.Field),
            new vscode.CompletionItem("Preconditioning", vscode.CompletionItemKind.Field),
            new vscode.CompletionItem("Outputs", vscode.CompletionItemKind.Field),
            // new vscode.CompletionItem("active = ''"),  
            // TODO if `active` present in block, dim out non-active sub-blocks or action to fold them?
            // TODO add MOOSE objects to autocomplete; but shouldn't need to find them all on every completion event
        ];
    }}

class DocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    public provideDocumentSymbols(document: vscode.TextDocument,
            token: vscode.CancellationToken): Thenable<vscode.SymbolInformation[]> {
        return new Promise((resolve, reject) => {
            var symbols = [];
            var head1_regex = new RegExp('\\[[_a-zA-Z0-9]+\\]');
            var head2_regex = new RegExp('\\[\\.\\/[_a-zA-Z0-9]+\\]');
            var in_variables = false;
            var kind = null;
           
            for (var i = 0; i < document.lineCount; i++) {
                var line = document.lineAt(i);
                var text = line.text.trim();

                if (head1_regex.test(text)) {

                    // Check if in variables block
                    if (text.substr(1, text.length-2).match('Variables') || text.substr(1, text.length-2).match('AuxVariables')) {
                        in_variables = true;
                    } else {
                        in_variables = false;
                    }

                    // Find the closing []
                    var last_line = line;
                    for (var j = i; j < document.lineCount; j++) {
                        var line2 = document.lineAt(j);
                        var text2 = line2.text.trim();
                        if (text2 === "[]") {
                            last_line = line2;
                            break;
                        }
                    }

                    symbols.push({
                        name: text.substr(1, text.length-2),
                        containerName: "Main Block",
                        kind: vscode.SymbolKind.Field,
                        location: new vscode.Location(document.uri, 
                            new vscode.Range(new vscode.Position(line.lineNumber, 1), 
                            new vscode.Position(last_line.lineNumber, last_line.text.length)))
                    });
                }
                if (head2_regex.test(text)) {
 
                    // Find the closing [../]
                    var last_line2 = line;
                    for (var k = i; k < document.lineCount; k++) {
                        var line3 = document.lineAt(k);
                        var text3 = line3.text.trim();
                        if (text3 === "[../]") {
                            last_line2 = line3;
                            break;
                        }
                    }

                    if (in_variables) {
                        kind = vscode.SymbolKind.Variable;
                    } else {
                        kind = vscode.SymbolKind.String;
                    }
                    
                    symbols.push({
                            name: text.substr(3, text.length-4),
                            containerName: "Sub Block",
                            kind: kind,
                            location: new vscode.Location(document.uri, 
                                new vscode.Range(new vscode.Position(line.lineNumber, 1), 
                                new vscode.Position(last_line2.lineNumber, last_line2.text.length)))
                            });
                }
           }

            resolve(symbols);
        });
    }
}


// TODO move to DocumentSymbol API: https://code.visualstudio.com/updates/v1_25#_document-symbols
// Like this (although this isn't working)
// class DocumentSymbolProvider implements vscode.DocumentSymbolProvider {
//     public provideDocumentSymbols(document: vscode.TextDocument,
//             token: vscode.CancellationToken): Thenable<vscode.DocumentSymbol[]> {
//         return new Promise((resolve, reject) => {
//             var symbols = [];
//             var head1_regex = new RegExp('\\[[a-zA-Z0-9]+\\]');
//             var head2_regex = new RegExp('\\[\\.\\/[a-zA-Z0-9]+\\]');
           
//             for (var i = 0; i < document.lineCount; i++) {
//                 var line = document.lineAt(i);
//                 var text = line.text.trim();
//                 // if (line.text.startsWith("[")) {
//                 if (head1_regex.test(text)) {
//                     // var location = new vscode.Location(document.uri, line.range)
//                     symbols.push({
//                         name: text.substr(1, text.length-2),
//                         detail: "Main Module",
//                         kind: vscode.SymbolKind.String,
//                         range: new vscode.Range(new vscode.Position(line.lineNumber, 1), 
//                                                 new vscode.Position(line.lineNumber, line.text.length)),
//                         selectionRange: new vscode.Range(new vscode.Position(line.lineNumber, 1), 
//                                                 new vscode.Position(line.lineNumber, line.text.length)),
//                         children: []
//                     });
//                 }
//                 if (head2_regex.test(text)) {
//                     symbols.push({
//                         name: text.substr(3, text.length-4),
//                         detail: "Submodule",
//                         kind: vscode.SymbolKind.String,
//                         range: new vscode.Range(new vscode.Position(line.lineNumber, 1), 
//                                                 new vscode.Position(line.lineNumber, line.text.length)),
//                         selectionRange: new vscode.Range(new vscode.Position(line.lineNumber, 1), 
//                                                 new vscode.Position(line.lineNumber, line.text.length)),
//                         children: []
//                     });
//                 }
//            }

//             resolve(symbols);
//         });
//     }
// }