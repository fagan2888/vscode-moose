'use strict';

//
// Note: These tests are leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

import * as ppath from 'path';
// import * as assert from 'assert';
import * as chai from 'chai';
// import * as chaiThings from 'chai-things';
import * as chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
// chai.use(chaiThings).use(chaiAsPromised);
// var assert = chai.assert;
var expect = chai.expect;

import * as moosedoc from '../moose_doc';
import * as moosedb from '../moose_syntax';

/**
 * a class with the simplest implementation of a Document interface
 */
class TestDoc implements moosedoc.Document {

    text = "";
    getPath() {
        return "test";
    }
    getText() {
        return this.text;
    }
    getLineCount() {
        return this.text.split('\n').length;
    }
    getTextInRange(start: moosedoc.Position, end: moosedoc.Position) {
        let i: number;
        let out: string[] = [];
        let lines = this.text.split('\n');

        if (start.row > end.row) {
            throw Error('the start is before the end');
        }

        if (start.row === end.row) {
            if (start.column > end.column) {
                throw Error('the start is before the end');
            }
            out.push(lines[start.row].slice(start.column, end.column));
        } else {
            out.push(lines[start.row].slice(start.column));
            for (i = start.row + 1; i < end.row - 1; i++) {
                out.push(lines[i]);
            }
            out.push(lines[end.row].slice(end.column));
        }

        return out.join("\n");
    }
    getTextForRow(row: number) {
        return this.text.split('\n')[row];
    }

}

suite("MooseDoc Tests", function () {

    var mdoc: moosedoc.MooseDoc;
    var doc: TestDoc;
    var db: moosedb.MooseSyntaxDB;

    suiteSetup(function () {
        db = new moosedb.MooseSyntaxDB();
        db.setLogHandles([]);
        db.setErrorHandles([console.warn]);
        // TODO is the best way to set the path?
        let ypath = ppath.resolve(__dirname, '../../src/test/syntax.yaml');
        let jpath = ppath.resolve(__dirname, '../../src/test/syntax.json');
        db.setPaths(ypath, jpath);
    });

    setup(function () {
        // console.log("setup test")
        doc = new TestDoc();
        mdoc = new moosedoc.MooseDoc(db, doc);
    });

    test("findCurrentNode; block", function () {
        doc.text = "[Kernels]";
        let cursor = { row: 0, column: 3 };
        // mdoc.findCurrentNode(cursor).then(value => {
        //     if (value !== null) {
        //         console.log(value.name);
        //     }

        // });
        return expect(mdoc.findCurrentNode(cursor)
        ).to.eventually.be.an('object').with.property('path').eql(['Kernels']);
    });

    test("findCurrentNode; sub-block", function () {
        doc.text = "[BCs]\n[./Periodic]\n[./c_bcs]";
        let cursor = { row: 2, column: 5 };
        return expect(mdoc.findCurrentNode(cursor)
        ).to.eventually.be.an('object').with.property('path').eql(['BCs', 'Periodic', 'c_bcs']);
    });

    test("findCurrentNode; type", function () {
        doc.text = `
[Kernels]
    [./akernel]
        type = AllenCahn
        `;
        let cursor = { row: 3, column: 17 };
        // mdoc.findCurrentNode(cursor).then(value => {
        //     if (value !== null) {
        //         console.log(value.name);
        //     } else {
        //         console.log("node not found");
        //     }
        // });
        return expect(mdoc.findCurrentNode(cursor)
        ).to.eventually.be.an('object').with.property('path').eql(['Kernels', 'akernel', 'AllenCahn']);
    });

    test("findCurrentNode; parameter", function () {
        doc.text = `
[Kernels]
    [./akernel]
        type = AllenCahn
        f_name = a
        `;
        let cursor = { row: 4, column: 11 };
        // mdoc.findCurrentNode(cursor).then(value => {
        //     if (value !== null) {
        //         console.log(value.name);
        //     } else {
        //         console.log("node not found");
        //     }
        // });
        return expect(mdoc.findCurrentNode(cursor)
        ).to.eventually.be.an('object').with.property('path').eql(
            ['Kernels', 'akernel', 'AllenCahn', 'f_name']);
    });

    test("findCurrentNode; value which is reference to variable", function () {
        doc.text = `
[Variables]
    [./xy_z]
    [../]
[]
[Kernels]
    [./akernel]
        type = AllenCahn
        variable = xy_z
    [../]
[]
        `;
        let cursor = { row: 8, column: 22 };
        // mdoc.findCurrentNode(cursor).then(value => {
        //     if (value !== null) {
        //         console.log(value.name);
        //     } else {
        //         console.log("node not found");
        //     }
        // });
        return expect(mdoc.findCurrentNode(cursor)
        ).to.eventually.be.an('object').with.property('path').eql(
            ['Variables', 'xy_z']);
    });

    test("findCurrentNode; value which is reference to material", function () {
        doc.text = `
[Materials]
    [./mat2]
        type = DerivativeParsedMaterial
        f_name = fmat
    [../]
[]
[Kernels]
    [./akernel]
        type = AllenCahn
        f_name = fmat
    [../]
[]
        `;
        let cursor = { row: 10, column: 21 };
        // mdoc.findCurrentNode(cursor).then(value => {
        //     if (value !== null) {
        //         console.log(value.name);
        //     } else {
        //         console.log("node not found");
        //     }
        // });
        return expect(mdoc.findCurrentNode(cursor)
        ).to.eventually.be.an('object').with.property('path').eql(
            ['Materials', 'mat2', 'DerivativeParsedMaterial', 'fmat']);
    });

    test("Completion; block", function () {
        doc.text = "[]";
        let cursor = { row: 0, column: 1 };
        // mdoc.findCompletions(cursor).then(value => {
        //     console.log(value);
        // });
        return expect(mdoc.findCompletions(cursor)
        ).to.eventually.be.an('array').that.has.length(38).and.deep.include({
            kind: "block",
            insertText: {
                type: "text",
                value: "ADKernels"
            },
            displayText: "ADKernels",
            replacementPrefix: "["
        });
    });

    test("Completion; type value", function () {
        doc.text = `
[Kernels]
    [./akernel]
        type = 
    [../]
[]
        `;
        let cursor = { row: 3, column: 16 };
        // mdoc.findCompletions(cursor).then(value => {
        //     console.log(value);
        // });
        return expect(mdoc.findCompletions(cursor)
        ).to.eventually.be.an('array').that.has.length(116).and.deep.include({
            kind: "type",
            insertText: {
                type: "text",
                value: "ACBarrierFunction"
            },
            displayText: "ACBarrierFunction",
            description: "Allen Cahn kernel used when 'mu' is a function of variables",
            replacementPrefix: ""
        });
    });

    test("Completion; parameter name", function () {
        doc.text = `
[Kernels]
    [./akernel]
        type = ACBarrierFunction

    [../]
[]
        `;
        let cursor = { row: 4, column: 9 };
        // mdoc.findCompletions(cursor).then(value => {
        //     console.log(value);
        // });
        return expect(mdoc.findCompletions(cursor)
        ).to.eventually.be.an('array').that.has.length(19).and.deep.include({
            kind: "parameter",
            required: true,
            insertText: {
                type: "snippet",
                value: "variable = ${1:}"
            },
            displayText: "variable",
            description: "The name of the variable that this Kernel operates on\n",
            replacementPrefix: "",
        });
    });

    test("Completion; parameter value with fixed options", function () {
        doc.text = `
[Kernels]
    [./akernel]
        type = ACBarrierFunction
        use_displaced_mesh = 
    [../]
[]
        `;
        let cursor = { row: 4, column: 30 };
        // mdoc.findCompletions(cursor).then(value => {
        //     console.log(value);
        // });
        return expect(mdoc.findCompletions(cursor)
        ).to.eventually.eql([
            {
                kind: "value",
                displayText: "true",
                insertText: {
                    type: "text",
                    value: "true"
                },
                replacementPrefix: ""
            },
            {
                kind: "value",
                displayText: "false",
                insertText: {
                    type: "text",
                    value: "false"
                },
                replacementPrefix: ""
            }
        ]);
    });

    test("Completion; parameter value whose value is from Variables", function () {
        doc.text = `
[Variables]
    [./abc]
    [../]
[]
[Materials]
    [./h_eta]
        type = SwitchingFunctionMaterial
        eta = 
    [../]
[]
        `;
        let cursor = { row: 8, column: 15 };
        // mdoc.findCompletions(cursor).then(value => {
        //     console.log(value);
        // });
        return expect(mdoc.findCompletions(cursor)
        ).to.eventually.eql([
            {
                kind: "block",
                displayText: "abc",
                insertText: {
                    type: "text",
                    value: "abc"
                },
                replacementPrefix: "",
                description: ""
            }
        ]);
    });

    test("Completion; parameter value whose value is from Materials", function () {
        doc.text = `
[Materials]
    [./mat1] # a material with a defined name
        type = DerivativeParsedMaterial
        f_name = dpm
    [../]
    [./g_eta] # a material with a default name
        type = BarrierFunctionMaterial
    [../]
    [./constants] # constant properties
      type = GenericConstantMaterial
      prop_names  = 'M   L'
      prop_values = '0.7 0.7'
    [../]
[]
[Kernels]
    [./ckernel]
        type = SplitCHWRes
        mob_name = 
    [../]
[]
        `;
        let cursor = { row: 18, column: 20 };
        // mdoc.findCompletions(cursor).then(value => {
        //     console.log(value);
        // });
        return expect(mdoc.findCompletions(cursor)
        ).to.eventually.eql([
            {
                "description": "Materials/mat1/DerivativeParsedMaterial",
                "displayText": "dpm",
                "insertText": {
                    "type": "text",
                    "value": "dpm"
                },
                "kind": "value",
                "replacementPrefix": ""
            },
            {
                "description": "Materials/g_eta/BarrierFunctionMaterial/g",
                "displayText": "g",
                "insertText": {
                    "type": "text",
                    "value": "g"
                },
                "kind": "value",
                "replacementPrefix": ""
            },
            {
                "description": "Materials/constants/GenericConstantMaterial",
                "displayText": "M",
                "insertText": {
                    "type": "text",
                    "value": "M"
                },
                "kind": "value",
                "replacementPrefix": ""
            },
            {
                "description": "Materials/constants/GenericConstantMaterial",
                "displayText": "L",
                "insertText": {
                    "type": "text",
                    "value": "L"
                },
                "kind": "value",
                "replacementPrefix": ""
            }
        ]);
    });

    test("Outline (with closure/duplication errors, missing required parameter, bad indentation)", function () {
        doc.text = `
[]
 [Kernels]  # a comment
    [./v1] # a comment
    [../]

[Kernels]
    [./akernel]
 type = ACBarrierFunction # a comment
        use_displaced_mesh = # another comment
    [../]


        `;
        // mdoc.assessOutline().then(value => {
        //     console.log(value);
        // });
        return expect(mdoc.assessDocument()).to.eventually.eql({
            outline: [{
                name: "Kernels",
                description: "",
                level: 1,
                start: {row: 2, column: 1}, end: {row: 5, column: 9},
                children: [{
                    name: "v1",
                    description: "",
                    level: 2,
                    start: {row: 3, column: 4}, end: {row: 4, column: 9},
                    children: [],
                    inactive: [],
                    parameters: []
                }],
                inactive: [],
                parameters: []
            },
            {
                name: "Kernels",
                description: "",
                level: 1,
                start: {row: 6, column: 0}, end: {row: 14, column: 0},
                children: [{
                    name: "akernel",
                    description: "Allen Cahn kernel used when 'mu' is a function of variables",
                    level: 2,
                    start: {row: 7, column: 4}, end: {row: 10, column: 9},
                    children: [],
                    inactive: [],
                    parameters: [
                        {
                            "description": "A string representing the Moose Object that will be built by this Action\n",
                            "name": "type", "value": "ACBarrierFunction",
                            "start": {row: 8, column: 1}, "end": {row: 8, column: 37}
                        },
                        {
                            "description": "Whether or not this object should use the displaced mesh for computation. Note that in the case this is true but no displacements are provided in the Mesh block the undisplaced mesh will still be used.\n",
                            "start": {row: 9, column: 8}, "end": {row: 9, column: 46},
                            "name": "use_displaced_mesh", "value": null,
                        }
                    ]
                }],
                inactive: [],
                parameters: []
            }],
            errors: [{
                type: "closure",
                start: {row: 1, column: 0}, end: {row: 1, column: 2},
                msg: "closed block before opening new one",
                correction: { }
            },
            {
                type: "format",
                msg: "wrong indentation",
                start: {row: 2, column: 0}, end: {row: 2, column: 1},
                correction: { replace: "" }
            },
            {
                type: "dbcheck",
                start: {row: 3, column: 4}, end: {row: 3, column: 10},
                msg: "required parameter(s) \"type\" not present in block: Kernels/v1",
                correction: { insertionAfter: "\n        type = " }
            },
            {
                type: "closure",
                start: {row: 6, column: 0}, end: {row: 6, column: 9},
                msg: "block opened before previous one closed",
                correction: { insertionBefore: "[]\n" }
            },
            {
                type: "duplication",
                start: {row: 6, column: 0}, end: {row: 6, column: 9},
                msg: "duplicate block name"
            },
            {
                type: "format",
                msg: "wrong indentation",
                start: {row: 8, column: 0}, end: {row: 8, column: 1},
                correction: { replace: "        " }
            },
            {
                type: "dbcheck",
                start: {row: 7, column: 4}, end: {row: 7, column: 15},
                msg: "required parameter(s) \"gamma, v, variable\" not present in block: Kernels/akernel/ACBarrierFunction",
                correction: { insertionAfter: "\n        gamma = \n        v = \n        variable = " }
            },
            {
                type: "format",
                msg: "multiple blank lines",
                start: {row: 11, column: 0}, end: {row: 13, column: 0},
                correction: { replace: "" }
            },
            {
                type: "closure",
                start: {row: 14, column: 0}, end: {row: 14, column: 8},
                msg: "final block(s) unclosed",
                correction: { insertionAfter: "[]\n" }
            }
            ],
            "refs": null
        });
    });

    test("Outline (duplicate blocks and parameters)", function () {
        doc.text = `
[Kernels]
    [./a]
        type = b
        type = c
    [../]
    [./a]
        type = a
    [../]
[]
[Kernels]
[]        `;
        // mdoc.assessOutline().then(value => {
        //     console.log(value);
        // });
        return expect(mdoc.assessDocument()).to.eventually.eql({
            "outline": [
                {
                    "name": "Kernels", "level": 1,
                    "description": "",
                    "start": {row: 1, column: 0}, "end": {row: 9, column: 2},
                    "inactive": [],
                    "parameters": [],
                    "children": [
                        {
                            "children": [],
                            "description": "",
                            "start": {row: 2, column: 4}, "end": {row: 5, column: 9},
                            "inactive": [],
                            "level": 2,
                            "name": "a",
                            "parameters": [
                                {
                                    "description": "A string representing the Moose Object that will be built by this Action\n",
                                    "start": {row: 3, column: 8}, "end": {row: 3, column: 16},
                                    "name": "type",
                                    "value": "b"
                                },
                                {
                                    "description": "A string representing the Moose Object that will be built by this Action\n",
                                    "start": {row: 4, column: 8}, "end": {row: 4, column: 16},
                                    "name": "type",
                                    "value": "c"
                                }
                            ],
                        },
                        {
                            "children": [],
                            "description": "",
                            "start": {row: 6, column: 4}, "end": {row: 8, column: 9},
                            "inactive": [],
                            "level": 2,
                            "name": "a",
                            "parameters": [{
                                "description": "A string representing the Moose Object that will be built by this Action\n",
                                "start": {row: 7, column: 8}, "end": {row: 7, column: 16},
                                "name": "type",
                                "value": "a"
                            }],
                        }
                    ],

                },
                {
                    "name": "Kernels", "level": 1,
                    "description": "",
                    "start": {row: 10, column: 0}, "end": {row: 11, column: 2},
                    "inactive": [],
                    "parameters": [],
                    "children": [],
                }
            ],
            "errors": [
                {
                    "type": "duplication",
                    "start": {row: 4, column: 8}, "end": {row: 4, column: 16},
                    "msg": "duplicate parameter name",
                },
                {
                    "type": "duplication",
                    "start": {row: 6, column: 4}, "end": {row: 6, column: 9},
                    "msg": "duplicate block name",
                },
                {
                    "type": "duplication",
                    "start": {row: 10, column: 0}, "end": {row: 10, column: 9},
                    "msg": "duplicate block name",
                }
            ],
            "refs": null
        });
    });

    test("Outline (with unknown parameter)", function () {
        doc.text = `
[Kernels]
    a = 1
[]        `;
        // mdoc.assessOutline().then(value => {
        //     console.log(value);
        // });
        return expect(mdoc.assessDocument()).to.eventually.eql({
            outline: [{
                name: "Kernels",
                description: "",
                level: 1,
                start: {row: 1, column: 0}, end: {row: 3, column: 2},
                children: [],
                inactive: [],
                parameters: [{
                    "name": "a",
                    "description": "",
                    "start": {row: 2, column: 4}, "end": {row: 2, column: 9},
                    "value": "1"
                }],
            }],
            errors: [{
                "type": "dbcheck",
                "msg": "parameter name \"a\" was not found for this block in database: Kernels",
                "start": {row: 2, column: 4}, "end": {row: 2, column: 9},
            }],
            "refs": null
        });
    });

    test("Outline (with commented out block)", function () {
        doc.text = `
#[Kernels]
#[]
[Kernels]
[]        `;
        // mdoc.assessOutline().then(value => {
        //     console.log(value);
        // });
        return expect(mdoc.assessDocument()).to.eventually.eql({
            outline: [{
                name: "Kernels",
                description: "",
                level: 1,
                start: {row: 3, column: 0}, end: {row: 4, column: 2},
                children: [],
                inactive: [],
                parameters: [],
            }],
            errors: [],
            "refs": null
        });
    });

    test("Outline (with inactive blocks)", function () {
        doc.text = `
[Kernels]
    active = 'a c'
    [./a]
        type = x
    [../]
    [./b]
        type = y
    [../]
[]        `;
        // mdoc.assessOutline().then(value => {
        //     console.log(value);
        // });
        return expect(mdoc.assessDocument()).to.eventually.eql({
            outline: [{
                "name": "Kernels",
                "description": "",
                "level": 1,
                "start": {row: 1, column: 0}, "end": {row: 9, column: 2},
                "children": [{
                    "description": "",
                    "start": {row: 3, column: 4}, "end": {row: 5, column: 9},
                    "inactive": [],
                    "level": 2,
                    "name": "a",
                    "parameters": [{
                        "description": "A string representing the Moose Object that will be built by this Action\n",
                        "start": {row: 4, column: 8}, "end": {row: 4, column: 16},
                        "name": "type",
                        "value": "x"
                    }],
                    "children": []
                },
                {
                    "description": "",
                    "start": {row: 6, column: 4}, "end": {row: 8, column: 9},
                    "inactive": [],
                    "level": 2,
                    "name": "b",
                    "parameters": [{
                        "description": "A string representing the Moose Object that will be built by this Action\n",
                        "start": {row: 7, column: 8}, "end": {row: 7, column: 16},
                        "name": "type",
                        "value": "y"
                    }],
                    "children": []
                }],
                inactive: ["b"],
                parameters: [{
                    "description": "If specified only the blocks named will be visited and made active",
                    "start": {row: 2, column: 4}, "end": {row: 2, column: 18},
                    "name": "active", "value": "a c"
                }],
            }],
            errors: [{
                "type": "refcheck",
                "start": {row: 2, column: 4}, "end": {row: 2, column: 18},
                "msg": "subblock specified in active parameter value not found: c"
            }],
            refs: null
        });
    });
});