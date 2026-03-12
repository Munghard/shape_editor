import type { Editor } from "./Editor";
import type { History } from "./History";
import type { Shape } from "./Shape";

export class EditorHistory {

    editor: Editor;
    constructor(editor: Editor, history: History, setHistory: React.Dispatch<React.SetStateAction<History>>) {
        this.editor = editor;
        this.history = history;
        this.setHistory = setHistory;
    }

    history: History;
    setHistory: React.Dispatch<React.SetStateAction<History>>;


    // ================================================================================================================
    // HISTORY
    // ================================================================================================================

    commit(updater: (prevShapes: Shape[]) => Shape[]) {
        this.setHistory(prev => {

            return {
                past: [...prev.past, prev.present],
                present: {
                    shapes: this.cloneShapes(updater(prev.present.shapes))
                },
                future: []
            };
        });
    }
    cloneShapes(shapes: Shape[]): Shape[] {
        return shapes.map(s => ({
            ...s,
            paths: s.paths.map(p => ({
                ...p,
                points: p.points.map(pt => ({
                    ...pt,
                    in: pt.in ? { ...pt.in } : undefined,
                    out: pt.out ? { ...pt.out } : undefined
                }))
            }))
        }));
    }
    undo() {
        this.setHistory(prev => {
            if (prev.past.length === 0) return prev;

            const previous = prev.past[prev.past.length - 1];

            return {
                past: prev.past.slice(0, -1),
                present: previous,
                future: [prev.present, ...prev.future]
            };
        });
    }
    redo() {
        this.setHistory(prev => {
            if (prev.future.length === 0) return prev;

            const next = prev.future[0];

            return {
                past: [...prev.past, prev.present],
                present: next,
                future: prev.future.slice(1)
            };
        });
    }

    // ================================================================================================================
    // HISTORY
    // ================================================================================================================

}