/*
 * renameProvider.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Logic that rename identifier on the given position and its references.
 */

import { CancellationToken, WorkspaceEdit } from 'vscode-languageserver';

import { isUserCode } from '../analyzer/sourceFileInfoUtils';
import { throwIfCancellationRequested } from '../common/cancellationUtils';
import { assertNever } from '../common/debug';
import { FileEditAction } from '../common/editAction';
import { ProgramView, ReferenceUseCase } from '../common/extensibility';
import { convertTextRangeToRange } from '../common/positionUtils';
import { Position, Range } from '../common/textRange';
import { Uri } from '../common/uri/uri';
import { convertToWorkspaceEdit } from '../common/workspaceEditUtils';
import { ReferencesProvider, ReferencesResult } from '../languageService/referencesProvider';
import { ParseFileResults } from '../parser/parser';
import { IPythonMode } from '../analyzer/sourceFile';
import { LanguageServerInterface } from '../common/languageServerInterface';

export class RenameProvider {
    private readonly _parseResults: ParseFileResults | undefined;

    constructor(
        private _program: ProgramView,
        private _fileUri: Uri,
        private _position: Position,
        private _token: CancellationToken,
        private _ls: LanguageServerInterface
    ) {
        this._parseResults = this._program.getParseResults(this._fileUri);
    }

    canRenameSymbol(isDefaultWorkspace: boolean, isUntitled: boolean): Range | null {
        throwIfCancellationRequested(this._token);
        if (!this._parseResults) {
            return null;
        }

        const referencesResult = this._getReferenceResult();
        if (!referencesResult) {
            return null;
        }

        const renameMode = RenameProvider.getRenameSymbolMode(
            this._program,
            this._fileUri,
            referencesResult,
            isDefaultWorkspace,
            isUntitled
        );
        if (renameMode === 'none') {
            return null;
        }

        // Return the range of the symbol.
        return convertTextRangeToRange(referencesResult.nodeAtOffset, this._parseResults.tokenizerOutput.lines);
    }

    renameSymbol(newName: string, isDefaultWorkspace: boolean, isUntitled: boolean): WorkspaceEdit | null {
        throwIfCancellationRequested(this._token);
        if (!this._parseResults) {
            return null;
        }

        const referencesResult = this._getReferenceResult();
        if (!referencesResult) {
            return null;
        }

        const referenceProvider = new ReferencesProvider(this._ls, this._program, this._token);
        const renameMode = RenameProvider.getRenameSymbolMode(
            this._program,
            this._fileUri,
            referencesResult,
            isDefaultWorkspace,
            isUntitled
        );

        switch (renameMode) {
            case 'singleFileMode':
                referenceProvider.addReferencesToResult(this._fileUri, /* includeDeclaration */ true, referencesResult);
                break;

            case 'multiFileMode': {
                for (const curSourceFileInfo of this._program.getSourceFileInfoList()) {
                    // Make sure we only add user code to the references to prevent us
                    // from accidentally changing third party library or type stub.
                    if (isUserCode(curSourceFileInfo)) {
                        // Make sure searching symbol name exists in the file.
                        // TODO: why is this here? source files shouldnt be read from disk directly when using the language server.
                        // for now we just disable this check in notebooks because they use a different file uri in the lsp
                        if (curSourceFileInfo.ipythonMode !== IPythonMode.CellDocs) {
                            const content = curSourceFileInfo.contents ?? '';
                            if (!referencesResult.symbolNames.some((s) => content.search(s) >= 0)) {
                                continue;
                            }
                        }

                        referenceProvider.addReferencesToResult(
                            curSourceFileInfo.uri,
                            /* includeDeclaration */ true,
                            referencesResult
                        );
                    }

                    // This operation can consume significant memory, so check
                    // for situations where we need to discard the type cache.
                    this._program.handleMemoryHighUsage();
                }
                break;
            }

            case 'none':
                // Rename is not allowed.
                // ex) rename symbols from libraries.
                return null;

            default:
                assertNever(renameMode);
        }

        const edits: FileEditAction[] = [];
        referencesResult.results.forEach((result) => {
            // Special case the renames of keyword arguments.
            edits.push({
                fileUri: result.location.uri,
                range: result.location.range,
                replacementText: newName,
            });
        });

        return convertToWorkspaceEdit(this._ls, this._program.fileSystem, { edits, fileOperations: [] });
    }

    static getRenameSymbolMode(
        program: ProgramView,
        fileUri: Uri,
        referencesResult: ReferencesResult,
        isDefaultWorkspace: boolean,
        isUntitled: boolean
    ) {
        const sourceFileInfo = program.getSourceFileInfo(fileUri)!;

        // We have 2 different cases
        // Single file mode.
        // 1. rename on default workspace (ex, standalone file mode).
        // 2. rename local symbols.
        // 3. rename symbols defined in the non user open file.
        //
        // and Multi file mode.
        // 1. rename public symbols defined in user files on regular workspace (ex, open folder mode).
        const userFile = isUserCode(sourceFileInfo);
        if (sourceFileInfo.ipythonMode === IPythonMode.CellDocs) {
            return 'multiFileMode';
        }
        if (
            isDefaultWorkspace ||
            (userFile && !referencesResult.requiresGlobalSearch) ||
            (!userFile &&
                sourceFileInfo.isOpenByClient &&
                referencesResult.declarations.every((d) => program.getSourceFileInfo(d.uri) === sourceFileInfo))
        ) {
            return 'singleFileMode';
        }

        if (referencesResult.declarations.every((d) => isUserCode(program.getSourceFileInfo(d.uri)))) {
            return 'multiFileMode';
        }

        // Rename is not allowed.
        // ex) rename symbols from libraries.
        return 'none';
    }

    private _getReferenceResult() {
        const referencesResult = ReferencesProvider.getDeclarationForPosition(
            this._program,
            this._fileUri,
            this._position,
            /* reporter */ undefined,
            ReferenceUseCase.Rename,
            this._token
        );
        if (!referencesResult) {
            return undefined;
        }

        if (referencesResult.containsOnlyImportDecls) {
            return undefined;
        }

        if (referencesResult.nonImportDeclarations.length === 0) {
            // There is no symbol we can rename.
            return undefined;
        }

        // Use declarations that doesn't contain import decls.
        return new ReferencesResult(
            referencesResult.requiresGlobalSearch,
            referencesResult.nodeAtOffset,
            referencesResult.symbolNames,
            referencesResult.nonImportDeclarations,
            referencesResult.useCase,
            referencesResult.providers
        );
    }
}
