import type { Camera } from "./Camera"
import type { History } from "../Editor/History"
import type { ITool } from "../Tools/ITool";
import { CreateBaseShape, CreateCircle, CreateSquare, CreateTriangle, DrawShape, type Path, type Point, type Shape } from "./Shape";
import { ClearCanvas, CloneShape, cubicBezierPoint, getCanvasMousePos, getShapeCenter, lerpVec2, screenToWorld, shapesEqual } from "../Utilities/Utilities";
import { DrawHandleLines } from "./OverlayCanvas";
import { DrawGrid } from "../Editor/Grid";
import type React from "react";

export class Editor {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    cameraRef: React.RefObject<Camera>;
    historyRef: React.RefObject<History>;
    lastMouseRef: React.RefObject<{ x: number; y: number } | null>;
    draggingRef: React.RefObject<{ index: number, handleIn: boolean } | null>;
    dragDeltaRef: React.RefObject<{ index: number, handleIn: boolean, dx: number, dy: number } | null>;
    activeTool: ITool | null;

    public selectedShapeIndex: number = -1;
    public selectedPathIndex: number = -1;
    public selectedPointIndex: number = -1;
    public selectedSegmentIndex: number = -1;

    public hiddenShapeIndicies: number[] = [];

    public snapToGrid: boolean = false;
    public gridColor: string = "#ffffff";
    public gridAlpha: number = 0.1;
    public gridSubdivisions: number = 8;

    public setHistory: React.Dispatch<React.SetStateAction<History>>;

    public setTick: React.Dispatch<React.SetStateAction<number>>;



    constructor(
        canvasRef: React.RefObject<HTMLCanvasElement>,
        cameraRef: React.RefObject<Camera>,
        historyRef: React.RefObject<History>,
        draggingRef: React.RefObject<{ index: number, handleIn: boolean } | null>,
        dragDeltaRef: React.RefObject<{ index: number, handleIn: boolean, dx: number, dy: number } | null>,
        lastMouseRef: React.RefObject<{ x: number, y: number } | null>,

        activeTool: ITool | null,

        setHistory: React.Dispatch<React.SetStateAction<History>>,

        setTick: React.Dispatch<React.SetStateAction<number>>,

    ) {
        this.canvasRef = canvasRef;
        this.cameraRef = cameraRef;
        this.historyRef = historyRef;
        this.draggingRef = draggingRef;
        this.dragDeltaRef = dragDeltaRef;
        this.lastMouseRef = lastMouseRef;

        this.activeTool = activeTool;

        this.setHistory = setHistory;

        this.setTick = setTick;
    }

    onMouseDown(e: React.MouseEvent<HTMLCanvasElement>, ctx: CanvasRenderingContext2D) {
        this.activeTool?.onMouseDown(e, ctx, this)
        const cmp = getCanvasMousePos(e, ctx.canvas);
        this.selectShapeAt(ctx, cmp.x, cmp.y);
    }

    onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
        this.activeTool?.onMouseMove(e, this)
    }

    onMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
        this.activeTool?.onMouseUp(e, this)
    }
    onMouseDownKnob(e: React.MouseEvent<HTMLDivElement>, index: number) {
        this.activeTool?.onMouseDownKnob(e, this, index)
    }

    get shape(): Shape {
        return this.historyRef.current.present.shapes[this.selectedShapeIndex];
    }
    get path(): Path {
        return this.historyRef.current.present.shapes[this.selectedShapeIndex].paths[this.selectedPathIndex];
    }
    get point(): Point {
        return this.historyRef.current.present.shapes[this.selectedShapeIndex].paths[this.selectedPathIndex].points[this.selectedPointIndex];
    }


    setSelectedShapeIndex(index: number) {
        this.selectedShapeIndex = index;
        this.setTick(t => t + 1);
    }
    setSelectedPathIndex(index: number) {
        this.selectedPathIndex = index;
        this.setTick(t => t + 1);
    }
    setSelectedPointIndex(index: number) {
        this.selectedPointIndex = index;
        this.setTick(t => t + 1);
    }
    setSelectedSegmentIndex(index: number) {
        this.selectedSegmentIndex = index;
        this.setTick(t => t + 1);
    }
    setHiddenShapeIndicies(index: number[]) {
        this.hiddenShapeIndicies = index;
        this.setTick(t => t + 1);
    }

    handleClickAddShape(shape: string): void {
        this.AddNewShape(shape);
    }

    setGridColor(color: string) {
        this.gridColor = color;
        this.ReDrawGrid();
    }

    setGridAlpha(alpha: number) {
        this.gridAlpha = alpha;
        this.ReDrawGrid();
    }

    setGridSubdivisions(gridSubdivisions: number) {
        this.gridSubdivisions = gridSubdivisions;
    }

    ClearOverlayCanvas() {
        var co = document.getElementById("CanvasOverlay") as HTMLCanvasElement;
        var coctx = co.getContext("2d") as CanvasRenderingContext2D;
        ClearCanvas(coctx);
    }

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

        const newIndex = this.historyRef.current.present.shapes.length;

        this.commit(prev => [...prev, newShape]);

        this.setSelectedShapeIndex(newIndex);
        this.setSelectedPathIndex(0);
        return newShape;
    }

    DeleteSelectedShape(): void {
        if (this.selectedShapeIndex === -1) return;
        const shape = this.historyRef.current.present.shapes[this.selectedShapeIndex];
        this.commit(prev => [...prev.filter(s => s !== shape)]);
        this.setSelectedShapeIndex(Math.max(this.selectedShapeIndex - 1, 0));
        this.setSelectedSegmentIndex(0);
    }
    DeleteShape(index: number): void {
        if (index === -1) return;
        this.commit(prev => [...prev.filter((_s, i) => i !== index)]);
        this.setSelectedShapeIndex(-1);
        this.setSelectedSegmentIndex(0);
    }

    // update shape helper
    updateSelectedShape(updater: (shape: Shape) => Shape) {
        this.commit(prev =>
            prev.map((s, i) => (i === this.selectedShapeIndex ? updater(s) : s))
        );
    }
    // function updateShape(index: number, updater: (shape: Shape) => Shape) {
    //     commit(prev =>
    //         prev.map((s, i) => (i === index ? updater(s) : s))
    //     );
    // }


    AddNewPath(): void {
        if (this.historyRef.current.present.shapes.length < 1) return;
        this.commit(prev =>
            prev.map((s, i) => {
                if (i !== this.selectedShapeIndex) return s;

                const newPaths = [
                    ...s.paths,
                    { points: [], isHole: true }
                ];
                return { ...s, paths: newPaths }
            })

        );
        this.setSelectedPathIndex(this.historyRef.current.present.shapes[this.selectedShapeIndex].paths.length);
    }
    DeleteSelectedPath(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        this.commit(prev =>
            prev.map((s, i) => {
                if (i !== this.selectedShapeIndex) return s;

                const newPaths = [
                    ...s.paths.filter((_p, i) => i !== this.selectedPathIndex)
                ];
                return { ...s, paths: newPaths }
            })
        );
        this.setSelectedPathIndex(Math.max(this.selectedPathIndex - 1, 0));
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
        this.setSelectedPathIndex(Math.max(this.selectedPathIndex - 1, 0));
    }
    HideShape(i: number, hide: boolean): void {
        if (hide) {

            this.setHiddenShapeIndicies([...this.hiddenShapeIndicies, i]);
        }
        else {

            this.setHiddenShapeIndicies(this.hiddenShapeIndicies.filter(p => p !== i));
        }
    }

    handleSelectPoint(e: React.ChangeEvent<HTMLInputElement, HTMLInputElement>): void {
        const shape = this.historyRef.current.present.shapes[this.selectedShapeIndex];
        var index = Number(e.target.value);
        var points = shape.paths[this.selectedPathIndex].points.length;
        index = (index + points) % points;
        if (shape && shape.paths[this.selectedPathIndex].points.length > index && index > -1) {

            this.setSelectedPointIndex(index)
        }
    }

    startDraggingPoint(index: number) {
        if (!this.canvasRef.current) return;
        if (this.selectedShapeIndex === -1 || this.selectedPathIndex === -1) return;

        const shape = this.historyRef.current.present.shapes[this.selectedShapeIndex];
        const path = shape.paths[this.selectedPathIndex];
        const startPoint = path.points[index];

        let offsetX = 0;
        let offsetY = 0;

        const onMouseMove = (e: MouseEvent) => {
            if (!this.canvasRef.current) return;

            const camera = this.cameraRef.current;

            var cmp = getCanvasMousePos(e, this.canvasRef.current)
            // convert mouse to world coordinates
            let mouseWorldX = (cmp.x) / camera.zoom + camera.x;
            let mouseWorldY = (cmp.y) / camera.zoom + camera.y;

            if (offsetX === 0 && offsetY === 0) {
                offsetX = startPoint.x - mouseWorldX;
                offsetY = startPoint.y - mouseWorldY;
            }

            let x = mouseWorldX + offsetX;
            let y = mouseWorldY + offsetY;

            if (this.snapToGrid) {
                const spacing = 1000 / this.gridSubdivisions; // same as DrawGrid
                x = Math.round(x / spacing) * spacing;
                y = Math.round(y / spacing) * spacing;
            }

            const dx = x - path.points[index].x;
            const dy = y - path.points[index].y;

            const p = path.points[index];

            p.x = x;
            p.y = y;

            if (p.in) {
                p.in.x += dx;
                p.in.y += dy;
            }

            if (p.out) {
                p.out.x += dx;
                p.out.y += dy;
            }
            this.Draw();
            this.ReDrawGrid();
        }

        const onMouseUp = () => {
            this.commit(prev => [...prev]); // push history snapshot
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }

    handleScroll = (e: React.WheelEvent): void => {
        if (!this.canvasRef.current) return;

        var cmp = getCanvasMousePos(e, this.canvasRef.current)

        const canvasX = cmp.x;
        const canvasY = cmp.y;

        const cam = this.cameraRef.current;

        // mouse position in world coordinates
        const worldX = cam.x + canvasX / cam.zoom;
        const worldY = cam.y + canvasY / cam.zoom;

        const zoomFactor = 1.2;
        const delta = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;

        // apply zoom
        cam.zoom *= delta;
        cam.zoom = Math.max(0.1, Math.min(cam.zoom, 10));

        // adjust camera so the world point under the mouse stays fixed
        cam.x = worldX - (canvasX / cam.zoom);
        cam.y = worldY - (canvasY / cam.zoom);

        this.setTick(t => t + 1); // force React to re-render knobs

        this.Draw();
        this.ReDrawGrid();

    }
    MovePointByIndex(pointIndex: number, newPoint: Point) {

        if (this.changeDetected()) {


            this.commit(prevShapes =>
                prevShapes.map((shape, i) => {
                    if (i !== this.selectedShapeIndex) return shape;

                    // copy all paths
                    const newPaths = shape.paths.map((path, pi) => {
                        if (pi !== this.selectedPathIndex) return path;

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

        this.setSelectedPointIndex(pointIndex);
    }

    handleCreatePoint(e: React.MouseEvent<HTMLCanvasElement>, targetIndex: number) {
        if (!this.canvasRef.current) return;
        if (this.selectedPathIndex === -1) return;
        let shapeIndex = targetIndex;
        let pathIndex = this.selectedPathIndex;
        let shape = this.historyRef.current.present.shapes[shapeIndex];

        // if no shape exists, create one
        if (!shape) {
            const newShape = CreateBaseShape();


            this.commit(prev => {
                const newShapes = [...prev, newShape];
                // update selection immediately for next render
                this.setSelectedShapeIndex(newShapes.length - 1);
                this.setSelectedPathIndex(0);

                // update local variables for this function
                shape = newShape;
                shapeIndex = newShapes.length - 1;
                pathIndex = 0;

                return newShapes;
            });
        }

        const path = shape.paths[pathIndex];
        if (!path) return;

        const cam = this.cameraRef.current;

        var cmp = getCanvasMousePos(e, this.canvasRef.current)

        const canvasX = cmp.x;
        const canvasY = cmp.y;

        let x = canvasX / cam.zoom + cam.x;
        let y = canvasY / cam.zoom + cam.y;

        let newPoint: Point;

        if (this.selectedSegmentIndex !== -1) {
            const n = path.points.length;
            const start = path.points[this.selectedSegmentIndex];
            const end = path.points[(this.selectedSegmentIndex + 1) % n];

            const c1 = start.out ?? start; // fallback if null
            const c2 = end.in ?? end;

            // get midpoint along cubic Bezier
            newPoint = cubicBezierPoint(0.5, start, c1, c2, end);

            this.insertPointAt(this.selectedSegmentIndex, newPoint.x, newPoint.y);
            this.setSelectedPointIndex(this.selectedSegmentIndex + 1);
            this.startDraggingPoint(this.selectedSegmentIndex + 1);

        } else {
            if (this.snapToGrid) {
                if (!this.canvasRef.current) return;

                const spacing = 1000 / this.gridSubdivisions;

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
            this.setSelectedPointIndex(newIndex);
            this.startDraggingPoint(newIndex);
        }
    }

    insertPointAt(index: number, x: number, y: number) {
        const newPoint = { x, y };


        this.commit(prev =>
            prev.map((s, i) => {
                if (i !== this.selectedShapeIndex) return s;

                const newPaths = [...s.paths];
                const currentPath = newPaths[this.selectedPathIndex];

                const newPoints = [...currentPath.points];
                newPoints.splice(index + 1, 0, newPoint);

                newPaths[this.selectedPathIndex] = {
                    ...currentPath,
                    points: newPoints
                };

                return { ...s, paths: newPaths };
            })
        );
    }
    // ================================================================================================================
    // HANDLES
    // ================================================================================================================
    // POINT HANDLES
    startHandleDrag = (e: React.MouseEvent, index: number, handleIn: boolean) => {
        if (!this.canvasRef.current) return;
        this.lastMouseRef.current = getCanvasMousePos(e, this.canvasRef.current);
        this.draggingRef.current = { index, handleIn };
        window.addEventListener("mousemove", this.onHandleMouseMove);
        window.addEventListener("mouseup", this.stopHandleDrag);
        e.preventDefault();
    }

    // POINT HANDLES
    onHandleMouseMove = (e: MouseEvent) => {
        if (!this.draggingRef.current) return;
        this.handleDrag(e as unknown as React.MouseEvent, this.draggingRef.current.index, this.draggingRef.current.handleIn);
    }


    // POINT HANDLES
    handleDrag = (e: React.MouseEvent, index: number, handleIn: boolean) => {
        if (!this.canvasRef.current || !this.lastMouseRef.current) return;

        const cmp = getCanvasMousePos(e, this.canvasRef.current);
        const mouseWorld = screenToWorld(cmp.x, cmp.y, this.cameraRef.current);
        const lastWorld = screenToWorld(this.lastMouseRef.current.x, this.lastMouseRef.current.y, this.cameraRef.current);

        const dx = mouseWorld.x - lastWorld.x;
        const dy = mouseWorld.y - lastWorld.y;

        this.dragDeltaRef.current = { index, handleIn, dx, dy };

        // Apply delta for live preview by mutating history.present.shapes
        const shape = this.historyRef.current.present.shapes[this.selectedShapeIndex];
        if (!shape) return;

        const path = shape.paths[this.selectedPathIndex];
        if (!path) return;

        const point = path.points[index];
        if (!point) return;

        // safely update live preview
        const newIn = handleIn && point.in ? { x: point.in.x + dx, y: point.in.y + dy } : point.in;
        const newOut = !handleIn && point.out ? { x: point.out.x + dx, y: point.out.y + dy } : point.out;

        point.in = newIn;
        point.out = newOut;

        this.lastMouseRef.current = cmp;
    }

    // POINT HANDLES
    stopHandleDrag = () => {
        // if no drag is in progress, just remove listeners and exit
        if (!this.draggingRef.current || !this.dragDeltaRef.current) {
            window.removeEventListener("mousemove", this.onHandleMouseMove);
            window.removeEventListener("mouseup", this.stopHandleDrag);
            this.dragDeltaRef.current = null;
            this.draggingRef.current = null;
            return;
        }

        // safe to commit now
        const { index, handleIn, dx, dy } = this.dragDeltaRef.current;

        this.commit(prevShapes =>
            prevShapes.map((shape, si) => {
                if (si !== this.selectedShapeIndex) return shape;

                return {
                    ...shape,
                    paths: shape.paths.map((path, pi) => {
                        if (pi !== this.selectedPathIndex) return path;

                        return {
                            ...path,
                            points: path.points.map((p, i) => {
                                if (i !== index) return p;

                                return {
                                    ...p,
                                    in: handleIn && p.in ? { x: p.in.x + dx, y: p.in.y + dy } : p.in,
                                    out: !handleIn && p.out ? { x: p.out.x + dx, y: p.out.y + dy } : p.out
                                };
                            })
                        };
                    })
                };
            })
        );

        this.dragDeltaRef.current = null;
        this.draggingRef.current = null;
        this.lastMouseRef.current = null;
        window.removeEventListener("mousemove", this.onHandleMouseMove);
        window.removeEventListener("mouseup", this.stopHandleDrag);
    }
    // ================================================================================================================
    // HANDLES
    // ================================================================================================================

    changeDetected(): boolean {
        const current = this.historyRef.current.present.shapes;
        const lastPast = this.historyRef.current.past[this.historyRef.current.past.length - 1]?.shapes;

        return !shapesEqual(current, lastPast);
    }

    handleAddCurveToPoint(index: number) {
        this.commit(prevShapes =>
            prevShapes.map((s, i) => {
                if (i !== this.selectedShapeIndex) return s;

                const newPaths = [...s.paths];
                const currentPath = { ...newPaths[this.selectedPathIndex] };

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

                newPaths[this.selectedPathIndex] = currentPath;

                return { ...s, paths: newPaths };
            })
        );
    }
    handleRemovePoint(index: number) {

        this.commit(prevShapes =>
            prevShapes.map((s, i) => {
                if (i !== this.selectedShapeIndex) return s;

                const newPaths = [...s.paths];
                const currentPath = { ...newPaths[this.selectedPathIndex] };

                currentPath.points = currentPath.points.filter(
                    (_p, idx) => idx !== index
                );

                newPaths[this.selectedPathIndex] = currentPath;

                return { ...s, paths: newPaths };
            })
        );

        if (this.selectedPointIndex === null) {
            this.selectedPointIndex = 0;
        } else if (this.selectedPointIndex === index) {
            this.selectedPointIndex = 0;
        } else if (this.selectedPointIndex > index) {
            this.selectedPointIndex -= 1;
        }
        // else leave it as-is
    }

    moveForward() {
        this.commit(prev => {
            const index = this.selectedShapeIndex;
            if (index === -1 || index >= prev.length - 1) return prev;

            const copy = [...prev];
            [copy[index], copy[index + 1]] =
                [copy[index + 1], copy[index]];

            this.setSelectedShapeIndex(index + 1);
            return copy;
        });
    }
    moveBackward() {
        this.commit(prev => {
            const index = this.selectedShapeIndex;
            if (index <= 0) return prev;

            const copy = [...prev];
            [copy[index], copy[index - 1]] =
                [copy[index - 1], copy[index]];

            this.setSelectedShapeIndex(index - 1);
            return copy;
        });
    }

    // type Commit = (updater: (prev: Shape[]) => Shape[]) => void;

    commit(updater: (prevShapes: Shape[]) => Shape[]) {
        this.setHistory(prev => {
            const newShapes = updater(prev.present.shapes).map(s => ({
                ...s,
                paths: s.paths.map(p => ({ ...p, points: [...p.points] }))
            }));

            return {
                past: [...prev.past, JSON.parse(JSON.stringify(prev.present))], // deep copy
                present: { shapes: newShapes },
                future: []
            };
        });
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
    setShapeName(name: string, index: number): void {
        this.commit(prev =>
            prev.map((p, i) =>
                i === index ? { ...p, name } : p
            )
        );
    }

    clearDocument(): void {
        this.setHistory({ past: [], present: { shapes: [] }, future: [] });
        this.setSelectedPointIndex(-1);
        this.setSelectedPathIndex(-1);
        this.setSelectedShapeIndex(-1)
        localStorage.removeItem("Session");
        if (this.canvasRef.current) ClearCanvas(this.canvasRef.current.getContext("2d")!);
    }

    resetCamera() {

        const canvas = this.canvasRef.current;
        if (!canvas) return;
        var w = canvas.width;
        var h = canvas.height;
        this.cameraRef.current.x = 0 - w / 2;
        this.cameraRef.current.y = 0 - h / 2;
        this.cameraRef.current.zoom = 1;
        this.Draw();
        this.ReDrawGrid();
    }

    centerCamera() {
        const canvas = this.canvasRef.current;

        const shape = this.historyRef.current.present.shapes[this.selectedShapeIndex];

        if (!canvas || !shape) return;

        const center = getShapeCenter(shape);
        const zoom = this.cameraRef.current.zoom;

        this.cameraRef.current.x = center.x - canvas.width / (2 * zoom);
        this.cameraRef.current.y = center.y - canvas.height / (2 * zoom);

        this.Draw();
        this.ReDrawGrid();
    }

    selectShapeAt(ctx: CanvasRenderingContext2D, x: number, y: number) {
        let foundShapeIndex = -1;
        let nextPathIndex = -1;

        // loop from top-most shape down
        for (let i = this.historyRef.current.present.shapes.length - 1; i >= 0; i--) {
            const shape = this.historyRef.current.present.shapes[i];
            this.buildPath(ctx, shape);

            if (ctx.isPointInPath(x, y)) {
                foundShapeIndex = i;

                if (i === this.selectedShapeIndex) {
                    // cycle to next path
                    const pathCount = this.historyRef.current.present.shapes[i].paths.length;
                    nextPathIndex = (this.selectedPathIndex + 1) % pathCount;
                } else {
                    nextPathIndex = 0;
                }

                break;
            }
        }

        // update state **once**, after selection is determined
        this.setSelectedShapeIndex(foundShapeIndex);
        this.setSelectedPathIndex(nextPathIndex);
        this.setSelectedPointIndex(-1);
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: Shape) {
        ctx.beginPath();
        for (let index = 0; index < shape.paths.length; index++) {

            const points = shape.paths[index].points;

            if (!points || points.length === 0) continue;

            ctx.moveTo(points[0].x, points[0].y);

            for (let i = 1; i < points.length; i++) {
                const prev = points[i - 1];
                const curr = points[i];
                ctx.bezierCurveTo(
                    prev.out?.x ?? prev.x,
                    prev.out?.y ?? prev.y,
                    curr.in?.x ?? curr.x,
                    curr.in?.y ?? curr.y,
                    curr.x, curr.y
                );
            }
            if (shape.cyclic && points.length > 1) {
                const last = points[points.length - 1];
                const first = points[0];

                ctx.bezierCurveTo(
                    last.out?.x ?? last.x,
                    last.out?.y ?? last.y,
                    first.in?.x ?? first.x,
                    first.in?.y ?? first.y,
                    first.x,
                    first.y
                );
                ctx.closePath(); // optional for closed shapes
            }
        }
    }

    ReDrawGrid() {
        var c = document.getElementById("CanvasGrid") as HTMLCanvasElement;
        var ctx = c.getContext("2d") as CanvasRenderingContext2D;
        ClearCanvas(ctx);
        DrawGrid(ctx, this.gridColor, this.gridAlpha, this.gridSubdivisions, this.cameraRef.current);
    }

    Draw() {

        const canvas = this.canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

        ClearCanvas(ctx);

        ctx.setTransform(this.cameraRef.current.zoom, 0, 0, this.cameraRef.current.zoom, -this.cameraRef.current.x * this.cameraRef.current.zoom, -this.cameraRef.current.y * this.cameraRef.current.zoom)

        this.historyRef.current.present.shapes.forEach((shape, i) => {
            if (!this.hiddenShapeIndicies.includes(i)) {
                DrawShape(ctx, shape);
            }
        });

        const coCanvas = document.getElementById("CanvasOverlay") as HTMLCanvasElement;
        const coctx = coCanvas.getContext("2d") as CanvasRenderingContext2D;

        const selectedPoint =
            this.selectedShapeIndex !== -1 &&
                this.selectedPathIndex !== -1 &&
                this.selectedPointIndex !== -1
                ? this.historyRef.current.present.shapes[this.selectedShapeIndex]
                    ?.paths[this.selectedPathIndex]
                    ?.points[this.selectedPointIndex]
                : null;
        if (selectedPoint) {
            ClearCanvas(coctx);
            DrawHandleLines(coctx, selectedPoint, this.cameraRef.current, coCanvas)
        }
        else {
            ClearCanvas(coctx);
        }
    }
    // ================================================================================================================
    // MOVE
    // ================================================================================================================

    MovePoint(p: Point, dx: number, dy: number) {
        p.x += dx;
        p.y += dy;

        if (p.in) {
            p.in.x += dx;
            p.in.y += dy;
        }

        if (p.out) {
            p.out.x += dx;
            p.out.y += dy;
        }
    }
    // ================================================================================================================
    // ROTATE
    // ================================================================================================================
    RotatePoint(p: Point, center: { x: number; y: number; }, cos: number, sin: number) {
        const offsetX = p.x - center.x;
        const offsetY = p.y - center.y;

        // apply rotation
        const rotatedX = offsetX * cos - offsetY * sin;
        const rotatedY = offsetX * sin + offsetY * cos;

        p.x = center.x + rotatedX;
        p.y = center.y + rotatedY;

        if (p.in) {
            const inOffsetX = p.in.x - center.x;
            const inOffsetY = p.in.y - center.y;

            // apply rotation
            const rotatedInX = inOffsetX * cos - inOffsetY * sin;
            const rotatedInY = inOffsetX * sin + inOffsetY * cos;

            p.in.x = center.x + rotatedInX;
            p.in.y = center.y + rotatedInY;
        }
        if (p.out) {
            const outOffsetX = p.out.x - center.x;
            const outOffsetY = p.out.y - center.y;

            // apply rotation
            const rotatedOutX = outOffsetX * cos - outOffsetY * sin;
            const rotatedOutY = outOffsetX * sin + outOffsetY * cos;

            p.out.x = center.x + rotatedOutX;
            p.out.y = center.y + rotatedOutY;
        }
    }
    // ================================================================================================================
    // SCALE
    // ================================================================================================================
    ScalePoint(p: Point, center: { x: number; y: number }, scaleFactor: number) {
        p.x = center.x + (p.x - center.x) * scaleFactor;
        p.y = center.y + (p.y - center.y) * scaleFactor;
        if (p.in) {
            p.in.x = center.x + (p.in.x - center.x) * scaleFactor;
            p.in.y = center.y + (p.in.y - center.y) * scaleFactor;
        }
        if (p.out) {
            p.out.x = center.x + (p.out.x - center.x) * scaleFactor;
            p.out.y = center.y + (p.out.y - center.y) * scaleFactor;
        }
    }
}