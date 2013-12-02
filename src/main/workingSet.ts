import signal = require('./utils/signal');
import collections = require('./utils/collections');



//--------------------------------------------------------------------------
//
//  IWorkingSet
//
//--------------------------------------------------------------------------

/**
 * A simple wrapper over brackets Document and DocumentManager that
 * provide information of change in the working set and
 * in the edited document.
 */
export interface IWorkingSet {
    /**
     * list of files in the working set
     */
    files: string [];
    
    /**
     * a signal dispatching events when change occured in the working set
     */
    workingSetChanged: signal.ISignal<ChangeRecord>;
    
    /**
     * a signal that provide fine grained change over edited document
     */
    documentEdited: signal.ISignal<DocumentChangeDescriptor[]>;

    /**
     * dispose the working set 
     */
    dispose(): void;
}



//--------------------------------------------------------------------------
//
//  ChangeRecord
//
//--------------------------------------------------------------------------


/**
 * describe change in the working set
 */
export interface ChangeRecord {
    /**
     * kind of change that occured in the working set
     */
    kind: WorkingSetChangeKind;
    
    /**
     * list of paths that has been added or removed from the working set
     */
    paths : string[];
}


/**
 * enum listing the change kind that occur in a working set
 */
export enum WorkingSetChangeKind {
    ADD,
    REMOVE
}


//--------------------------------------------------------------------------
//
//  DocumentChangeDescriptor
//
//--------------------------------------------------------------------------

/**
 * describe a change in a document
 */
export interface DocumentChangeDescriptor {
    /**
     * path of the files that has changed
     */
    path: string;
    
    /**
     * start position of the change
     */
    from: Position;
    
    /**
     * end positon of the change
     */
    to: Position;
    
    /**
     * text that has been inserted (if any)
     */
    text: string;
    
    /**
     * text that has been removed (if any)
     */
    removed: string;
}

/**
 * describe a positon in a document by line/character
 */
export interface Position {
    line: number;
    ch: number;
}


//--------------------------------------------------------------------------
//
//  IWorkingSet implementation
//
//--------------------------------------------------------------------------

/**
 * extracted interface of the brackets DocumentManager 
 */
export interface BracketesDocumentManager {
    getWorkingSet(): { fullPath: string }[];
    getDocumentForPath(fullPath: string): JQueryPromise<BracketsDocument>;
}

/**
 * extracted interface of the brackets Document
 */
export interface BracketsDocument {
    file: { fullPath: string };
}

/**
 * implementation of the IWorkingSet
 */
export class WorkingSet implements IWorkingSet {
    
    //-------------------------------
    //  constructor
    //-------------------------------


    constructor(
            private documentManager: BracketesDocumentManager
    ) {
        $(documentManager).on('workingSetAdd', this.workingSetAddHandler);
        $(documentManager).on('workingSetAddList', this.workingSetAddListHandler);
        $(documentManager).on('workingSetRemove', this.workingSetRemoveHandler);
        $(documentManager).on('workingSetRemoveList', this.workingSetRemoveListHandler);
        this.setFiles(documentManager.getWorkingSet().map(file => file.fullPath));
    }
    
    //-------------------------------
    //  Variables
    //-------------------------------
    
    /**
     * internal signal for workingSetChanged
     */
    private _workingSetChanged = new signal.Signal<ChangeRecord>();
    
    /**
     * internal signal for documentEdited
     */
    private _documentEdited = new signal.Signal<DocumentChangeDescriptor[]>();
    
        
    /**
     * map file to document for event handling
     */
    private filesMap = new collections.StringMap<BracketsDocument>();

    
    //-------------------------------
    //  IWorkingSet implementations
    //-------------------------------
    
    
    /**
     * @see IWorkingSet#files
     */
    get files(): string[] {
        return this.filesMap.keys;
    }
    
    /**
     * @see IWorkingSet#workingSetChanged
     */
    get workingSetChanged() {
        return this._workingSetChanged;
    }
    
    
    /**
     * @see IWorkingSet#documentEdited
     */
    get documentEdited() {
        return this._documentEdited;
    }

    /**
     * @see IWorkingSet#dispose
     */    
    dispose(): void {
        $(this.documentManager).off('workingSetAdd', this.workingSetAddHandler);
        $(this.documentManager).off('workingSetAddList', this.workingSetAddListHandler);
        $(this.documentManager).off('workingSetRemove', this.workingSetRemoveHandler);
        $(this.documentManager).off('workingSetRemoveList', this.workingSetRemoveListHandler);
        this.setFiles(null);
    }
    
    //-------------------------------
    //  Privates methods
    //-------------------------------
    
    /**
     * set working set files
     */
    private setFiles(files: string[]) {
        this.files.forEach(path => this.removeDocument(path))
        if (files) {
            files.forEach(path => this.addDocument(path));
        }
    }
    
    /**
     * add a document to the working set, and add event listener on the 'change' of this workingset
     * @param path
     */
    private addDocument(path: string) {
        this.documentManager.getDocumentForPath(path).then(document => {
            if (!document) {
                throw new Error('??? should not happen');
            }
            if (this.filesMap.has(path)) {
                //should not happen but just in case ...
                this.removeDocument(path);
            }
            this.filesMap.set(document.file.fullPath, document);
            $(document).on('change', this.documentChangesHandler);
        }, (err?: string) => {
            throw new Error(err);
        });
    }
    
    /**
     * remove a document from working set, and add event listener on the 'change' of this workingset
     * @param path
     */
    private removeDocument(path: string) {
        var document = this.filesMap.get(path);
        if (!document) {
            return;
        }
        $(document).off('change', this.documentChangesHandler);
        this.filesMap.delete(path);
    }
    
    
    //-------------------------------
    //  Events Handler
    //-------------------------------
    
    /**
     * handle 'workingSetAdd' event
     */
    private workingSetAddHandler = (event: any, file: brackets.File) => {
        this.addDocument(file.fullPath);
        this.workingSetChanged.dispatch({
            kind: WorkingSetChangeKind.ADD,
            paths: [file.fullPath]
        });
    }

    /**
     * handle 'workingSetAddList' event
     */
    private workingSetAddListHandler = (event: any, ...files: brackets.File[]) => {
        var paths = files.map(file => {
            this.addDocument(file.fullPath); 
            return file.fullPath;
        });
        if (paths.length > 0) {
            this.workingSetChanged.dispatch({
                kind: WorkingSetChangeKind.ADD,
                paths: paths
            });
        }
    }
    
    /**
     * handle 'workingSetRemove' event
     */      
    private workingSetRemoveHandler = (event: any, file: brackets.File) => {
        this.removeDocument(file.fullPath);
        this.workingSetChanged.dispatch({
            kind: WorkingSetChangeKind.REMOVE,
            paths: [file.fullPath]
        });
    }
    
    /**
     * handle 'workingSetRemoveList' event
     */      
    private workingSetRemoveListHandler = (event: any, ...files: brackets.File[]) => {
        var paths = files.map( file => {
            this.removeDocument(file.fullPath); 
            return file.fullPath
        });
        if (paths.length > 0) {
            this.workingSetChanged.dispatch({
                kind: WorkingSetChangeKind.REMOVE,
                paths: paths
            });
        }
    }
 
    
    /**
     * handle 'change' on document
     */
    private documentChangesHandler = (event: any, document: BracketsDocument, change: CodeMirror.EditorChangeLinkedList) => {
        var changesDescriptor: DocumentChangeDescriptor[] = []
        while (change) {
            changesDescriptor.push({
                path: document.file.fullPath,
                from: change.from,
                to: change.to,
                text: change.text && change.text.join('\n'),
                removed: change.removed ? change.removed.join("\n") : ""
            });
            change = change.next;
        }
        if (changesDescriptor.length > 0) {
            this.documentEdited.dispatch(changesDescriptor);
        }   
    }

}



    