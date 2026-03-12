import { CloneShape, cubicBezierPoint, getCanvasMousePos, lerpVec2 } from "../Utilities/Utilities";
import type { Editor } from "./Editor";
import type { History } from "./History";
import { CreateBaseShape, CreateCircle, CreateSquare, CreateTriangle, type Point, type Shape } from "./Shape";

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
    AddNewShape(shapeName: string, shape: Shape | null = null): Shape {

        let newShape: Shape = CreateBaseShape();
        if (shape === null) {

            if (shapeName === "empty") {
                newShape = CreateBaseShape();
            }
            if (shapeName === "circle") {
                newShape = CreateBaseShape([CreateCircle()]);
            }
            if (shapeName === "square") {
                newShape = CreateBaseShape([CreateSquare()]);
            }
            if (shapeName === "triangle") {
                newShape = CreateBaseShape([CreateTriangle()]);
            }
        }
        else {
            newShape = shape;

            // this was to add an offset to the duplicated shape but its adding it to the main shape too and i cant be arsed right now
            // const offset = { x: 50, y: 50 };
            // newShape.paths.forEach(pa => pa.points.forEach(po => { po.x += offset.x; po.y += offset.y; }));
        }

        newShape = CloneShape(newShape);

        const newIndex = this.history.present.shapes.length;

        this.commit(prev => [...prev, newShape]);

        this.editor.setSelectedShapeIndex(newIndex);
        this.editor.setSelectedPathIndex(0);
        return newShape;
    }
    DeleteShape(index: number): void {
        if (index === -1) return;
        this.commit(prev => [...prev.filter((_s, i) => i !== index)]);
        this.editor.setSelectedShapeIndex(-1);
        this.editor.setSelectedSegmentIndex(0);
    }
    // update shape helper
    updateSelectedShape(updater: (shape: Shape) => Shape) {
        this.commit(prev =>
            prev.map((s, i) => (i === this.editor.selectedShapeIndex ? updater(s) : s))
        );
    }
    AddNewPath(): void {
        if (this.history.present.shapes.length < 1) return;
        this.commit(prev =>
            prev.map((s, i) => {
                if (i !== this.editor.selectedShapeIndex) return s;

                const newPaths = [
                    ...s.paths,
                    { points: [], isHole: true }
                ];
                return { ...s, paths: newPaths }
            })

        );
        this.editor.setSelectedPathIndex(this.history.present.shapes[this.editor.selectedShapeIndex].paths.length);
    }

    DeletePath(shapeIndex: number, pathIndex: number): void {
        this.commit(prev =>
            prev.map((s, i) => {
                if (i !== shapeIndex) return s;

                const newPaths = [
                    ...s.paths.filter((_p, i) => i !== pathIndex)
                ];
                return { ...s, paths: newPaths }
            })
        );
        this.editor.setSelectedPathIndex(Math.max(this.editor.selectedPathIndex - 1, 0));
    }

    MovePointByIndex(pointIndex: number, newPoint: Point) {
        if (this.editor.changeDetected()) {
            this.commit(prevShapes =>
                prevShapes.map((shape, i) => {
                    if (i !== this.editor.selectedShapeIndex) return shape;

                    // copy all paths
                    const newPaths = shape.paths.map((path, pi) => {
                        if (pi !== this.editor.selectedPathIndex) return path;

                        // copy points, replacing the moved point
                        const newPoints = path.points.map((pt, pj) =>
                            pj === pointIndex ? { x: newPoint.x, y: newPoint.y } : { ...pt }
                        );

                        return { ...path, points: newPoints };
                    });

                    return { ...shape, paths: newPaths };
                })
            );
        }
        this.editor.setSelectedPointIndex(pointIndex);
    }

    handleCreatePoint(e: React.MouseEvent<HTMLCanvasElement>, targetIndex: number) {
        if (!this.editor.canvasRef.current) return;
        if (this.editor.selectedPathIndex === -1) return;
        let shapeIndex = targetIndex;
        let pathIndex = this.editor.selectedPathIndex;
        let shape = this.history.present.shapes[shapeIndex];

        // if no shape exists, create one
        if (!shape) {
            const newShape = CreateBaseShape();


            this.commit(prev => {
                const newShapes = [...prev, newShape];
                // update selection immediately for next render
                this.editor.setSelectedShapeIndex(newShapes.length - 1);
                this.editor.setSelectedPathIndex(0);

                // update local variables for this function
                shape = newShape;
                shapeIndex = newShapes.length - 1;
                pathIndex = 0;

                return newShapes;
            });
        }

        const path = shape.paths[pathIndex];
        if (!path) return;

        const cam = this.editor.editorCamera.camera;

        var cmp = getCanvasMousePos(e, this.editor.canvasRef.current)

        const canvasX = cmp.x;
        const canvasY = cmp.y;

        let x = canvasX / cam.zoom + cam.x;
        let y = canvasY / cam.zoom + cam.y;

        let newPoint: Point;

        if (this.editor.selectedSegmentIndex !== -1) {
            const n = path.points.length;
            const start = path.points[this.editor.selectedSegmentIndex];
            const end = path.points[(this.editor.selectedSegmentIndex + 1) % n];

            const c1 = start.out ?? start; // fallback if null
            const c2 = end.in ?? end;

            // get midpoint along cubic Bezier
            newPoint = cubicBezierPoint(0.5, start, c1, c2, end);

            this.insertPointAt(this.editor.selectedSegmentIndex, newPoint.x, newPoint.y);
            this.editor.setSelectedPointIndex(this.editor.selectedSegmentIndex + 1);
            this.editor.startDraggingPoint(this.editor.selectedSegmentIndex + 1);

        } else {
            if (this.editor.editorGrid.snapToGrid) {
                if (!this.editor.canvasRef.current) return;

                const spacing = 1000 / this.editor.editorGrid.gridSubdivisions;

                x = Math.round(x / spacing) * spacing;
                y = Math.round(y / spacing) * spacing;
            }
            newPoint = { x, y };
            this.commit(prev =>
                prev.map((s, i) => {
                    if (i !== shapeIndex) return s;

                    const newPaths = [...s.paths];
                    const currentPath = newPaths[pathIndex];
                    const newPoints = [...currentPath.points, newPoint];

                    newPaths[pathIndex] = { ...currentPath, points: newPoints };
                    return { ...s, paths: newPaths };
                })
            );
            const newIndex = path.points.length;
            this.editor.setSelectedPointIndex(newIndex);
            this.editor.startDraggingPoint(newIndex);
        }
    }

    insertPointAt(index: number, x: number, y: number) {
        const newPoint = { x, y };
        this.commit(prev =>
            prev.map((s, i) => {
                if (i !== this.editor.selectedShapeIndex) return s;

                const newPaths = [...s.paths];
                const currentPath = newPaths[this.editor.selectedPathIndex];

                const newPoints = [...currentPath.points];
                newPoints.splice(index + 1, 0, newPoint);

                newPaths[this.editor.selectedPathIndex] = {
                    ...currentPath,
                    points: newPoints
                };

                return { ...s, paths: newPaths };
            })
        );
    }

    handleAddCurveToPoint(index: number) {
        this.commit(prevShapes =>
            prevShapes.map((s, i) => {
                if (i !== this.editor.selectedShapeIndex) return s;

                const newPaths = [...s.paths];
                const currentPath = { ...newPaths[this.editor.selectedPathIndex] };

                const newPoints = [...currentPath.points];
                const p = { ...newPoints[index] };

                const count = newPoints.length;

                const prevIndex = (index - 1 + count) % count;
                const nextIndex = (index + 1) % count;

                const prev = { ...newPoints[prevIndex] };
                const next = { ...newPoints[nextIndex] };

                const newP = lerpVec2(p, prev, 0.5);
                const newN = lerpVec2(p, next, 0.5);

                p.in = { x: newP.x, y: newP.y };
                p.out = { x: newN.x, y: newN.y };

                newPoints[index] = p;
                currentPath.points = newPoints;

                newPaths[this.editor.selectedPathIndex] = currentPath;

                return { ...s, paths: newPaths };
            })
        );
    }

    handleRemovePoint(index: number) {
        this.commit(prevShapes =>
            prevShapes.map((s, i) => {
                if (i !== this.editor.selectedShapeIndex) return s;

                const newPaths = [...s.paths];
                const currentPath = { ...newPaths[this.editor.selectedPathIndex] };

                currentPath.points = currentPath.points.filter(
                    (_p, idx) => idx !== index
                );

                newPaths[this.editor.selectedPathIndex] = currentPath;

                return { ...s, paths: newPaths };
            })
        );
        if (this.editor.selectedPointIndex === null) {
            this.editor.selectedPointIndex = 0;
        } else if (this.editor.selectedPointIndex === index) {
            this.editor.selectedPointIndex = 0;
        } else if (this.editor.selectedPointIndex > index) {
            this.editor.selectedPointIndex -= 1;
        }
        // else leave it as-is
    }

    moveShapeForwardZ() {
        this.commit(prev => {
            const index = this.editor.selectedShapeIndex;
            if (index === -1 || index >= prev.length - 1) return prev;

            const copy = [...prev];
            [copy[index], copy[index + 1]] =
                [copy[index + 1], copy[index]];

            this.editor.setSelectedShapeIndex(index + 1);
            return copy;
        });
    }

    moveShapeBackwardZ() {
        this.commit(prev => {
            const index = this.editor.selectedShapeIndex;
            if (index <= 0) return prev;

            const copy = [...prev];
            [copy[index], copy[index - 1]] =
                [copy[index - 1], copy[index]];

            this.editor.setSelectedShapeIndex(index - 1);
            return copy;
        });
    }

    setShapeName(name: string, index: number): void {
        this.commit(prev =>
            prev.map((p, i) =>
                i === index ? { ...p, name } : p
            )
        );
    }
}