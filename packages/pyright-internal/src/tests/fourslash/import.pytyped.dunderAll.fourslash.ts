/// <reference path="typings/fourslash.d.ts" />

// @filename: testpkg/py.typed
// @library: true
////

// @filename: testpkg/__init__.py
// @library: true
//// from . import submod
//// from .submod2 import *
//// from submod import foofoofoo5, foofoofoo6, foofoofoo7, foofoofoo8
//// foofoofoo0: int = 0
//// foofoofoo1: int = 1
//// foofoofoo2: int = 2
//// foofoofoo3: int = 3
//// foofoofoo4: int = 4
//// __all__ = ["foofoofoo1"]
//// __all__ += ["foofoofoo2"]
//// __all__.extend(["foofoofoo3"])
//// __all__.extend(submod.__all__)
//// __all__.remove("foofoofoo1")
//// __all__.remove("foofoofoo6")
//// __all__.append("foofoofoo0")
//// __all__ += submod2.__all__

// @filename: testpkg/submod.py
// @library: true
//// foofoofoo5: int = 5
//// foofoofoo6: int = 6
//// foofoofoo7: int = 7
//// foofoofoo8: int = 8
//// __all__ = ["foofoofoo5"]
//// __all__ += ["foofoofoo6"]
//// __all__.extend(["foofoofoo7"])

// @filename: testpkg/submod2.py
// @library: true
//// foofoofoo9: int = 9
//// __all__ = ["foofoofoo9"]

// @filename: .src/test.py
//// from testpkg import *
//// foofoofoo[|/*marker1*/|]

const completionRange = { start: { line: 1, character: 0 }, end: { line: 1, character: 9 } };
const importRange = { start: { line: 0, character: 21 }, end: { line: 0, character: 21 } };
// @ts-ignore
await helper.verifyCompletion('exact', 'markdown', {
    marker1: {
        completions: [
            {
                label: 'foofoofoo0',
                kind: Consts.CompletionItemKind.Variable,
            },
            {
                label: 'foofoofoo1',
                kind: Consts.CompletionItemKind.Variable,
                detail: 'Auto-import',
                textEdit: { range: completionRange, newText: 'foofoofoo1' },
                additionalTextEdits: [{ range: importRange, newText: '\nfrom testpkg import foofoofoo1' }],
            },
            {
                label: 'foofoofoo2',
                kind: Consts.CompletionItemKind.Variable,
            },
            {
                label: 'foofoofoo3',
                kind: Consts.CompletionItemKind.Variable,
            },
            {
                label: 'foofoofoo4',
                kind: Consts.CompletionItemKind.Variable,
                detail: 'Auto-import',
                textEdit: { range: completionRange, newText: 'foofoofoo4' },
                additionalTextEdits: [{ range: importRange, newText: '\nfrom testpkg import foofoofoo4' }],
            },
            {
                label: 'foofoofoo5',
                kind: Consts.CompletionItemKind.Variable,
            },
            {
                label: 'foofoofoo6',
                kind: Consts.CompletionItemKind.Variable,
                detail: 'Auto-import',
                textEdit: { range: completionRange, newText: 'foofoofoo6' },
                additionalTextEdits: [{ range: importRange, newText: '\nfrom testpkg.submod import foofoofoo6' }],
            },
            {
                label: 'foofoofoo7',
                kind: Consts.CompletionItemKind.Variable,
            },
            {
                label: 'foofoofoo8',
                kind: Consts.CompletionItemKind.Variable,
                detail: 'Auto-import',
                textEdit: { range: completionRange, newText: 'foofoofoo8' },
                additionalTextEdits: [{ range: importRange, newText: '\nfrom testpkg.submod import foofoofoo8' }],
            },
            {
                label: 'foofoofoo9',
                kind: Consts.CompletionItemKind.Variable,
            },
        ],
    },
});
