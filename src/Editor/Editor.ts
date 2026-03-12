import React from "react";
import type { History } from "../Editor/History"
import type { ITool } from "../Tools/ITool";
import { EditorCamera } from "./Camera"
import { DrawShape, type Path, type Point, type Rect, type Shape } from "./Shape";
import { buildPath, ClearCanvas, getCanvasMousePos, screenToWorld, shapesEqual } from "../Utilities/Utilities";
import { DrawHandleLines } from "./OverlayCanvas";
import { EditorGrid } from "../Editor/Grid";
import { EditorHistory } from "./EditorHistory";
import { EditorTools, type ToolEnum } from "./EditorTools";
import type { Tool } from "../Tools/Tool";

export class Editor {
    canvasRef: React.RefObject<HTMLCanvasElement | null> = React.createRef();

    lastMouseRef: React.RefObject<{ x: number; y: number } | null>;
    draggingRef: React.RefObject<{ index: number, handleIn: boolean } | null>;
    dragDeltaRef: React.RefObject<{ index: number, handleIn: boolean, dx: number, dy: number } | null>;
    activeTool: ITool | null;

    editorCamera: EditorCamera = new EditorCamera(this);
    editorGrid: EditorGrid = new EditorGrid(this);
    editorTools: EditorTools;

    editorHistory: EditorHistory;

    public selectedShapeIndex: number = -1;
    public selectedPathIndex: number = -1;
    public selectedPointIndex: number = -1;
    public selectedSegmentIndex: number = -1;

    public hiddenShapeIndicies: number[] = [];

    public setTick: React.Dispatch<React.SetStateAction<number>>;

    constructor(
        history: History,
        draggingRef: React.RefObject<{ index: number, handleIn: boolean } | null>,
        dragDeltaRef: React.RefObject<{ index: number, handleIn: boolean, dx: number, dy: number } | null>,
        lastMouseRef: React.RefObject<{ x: number, y: number } | null>,

        activeTool: ITool | null,
        setActiveTool: React.Dispatch<React.SetStateAction<Tool | null>>,

        setToolEnum: React.Dispatch<React.SetStateAction<ToolEnum>>,
        setFrame: React.Dispatch<React.SetStateAction<Rect>>,

        frame: Rect,

        setHistory: React.Dispatch<React.SetStateAction<History>>,
        setTick: React.Dispatch<React.SetStateAction<number>>,
    ) {
        this.editorHistory = new EditorHistory(this, history, setHistory);
        this.editorTools = new EditorTools(this, frame, setFrame, setToolEnum, setActiveTool);
        this.draggingRef = draggingRef;
        this.dragDeltaRef = dragDeltaRef;
        this.lastMouseRef = lastMouseRef;

        this.activeTool = activeTool;

        this.setTick = setTick;
    }

    setCanvas(canvas: HTMLCanvasElement) {
        this.canvasRef.current = canvas;
    }

    onMouseDown(e: React.MouseEvent<HTMLCanvasElement>, ctx: CanvasRenderingContext2D) {
        if (this.changeDetected()) {
            this.commit(prev => prev); // commit before change
        }

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

    get history(): History {
        return this.editorHistory.history;
    }

    set history(history: History) {
        this.editorHistory.history = history;
        this.editorHistory.setHistory(history);
    }

    commit(updater: (shapes: Shape[]) => Shape[]) {
        this.editorHistory.commit(updater);
    }

    undo() {
        this.editorHistory.undo();
    }

    redo() {
        this.editorHistory.redo();
    }

    get shape(): Shape {
        return this.history.present.shapes[this.selectedShapeIndex];
    }

    get path(): Path {
        return this.history.present.shapes[this.selectedShapeIndex].paths[this.selectedPathIndex];
    }

    get point(): Point {
        return this.history.present.shapes[this.selectedShapeIndex].paths[this.selectedPathIndex].points[this.selectedPointIndex];
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
        this.editorGrid.gridColor = color;
        this.editorGrid.ReDrawGrid();
    }

    setGridAlpha(alpha: number) {
        this.editorGrid.gridAlpha = alpha;
        this.editorGrid.ReDrawGrid();
    }

    setGridSubdivisions(gridSubdivisions: number) {
        this.editorGrid.gridSubdivisions = gridSubdivisions;
    }

    ClearOverlayCanvas() {
        var co = document.getElementById("CanvasOverlay") as HTMLCanvasElement;
        var coctx = co.getContext("2d") as CanvasRenderingContext2D;
        ClearCanvas(coctx);
    }

    setTool(tool: ToolEnum) {
        this.editorTools.setTool(tool);
    }

    AddNewShape(shapeName: string, shape: Shape | null = null): Shape {
        return this.editorHistory.AddNewShape(shapeName, shape);
    }

    DeleteShape(index: number): void {
        this.editorHistory.DeleteShape(index);
    }

    updateSelectedShape(updater: (shape: Shape) => Shape) {
        this.editorHistory.updateSelectedShape(updater);
    }

    AddNewPath(): void {
        this.editorHistory.AddNewPath();
    }

    DeletePath(shapeIndex: number, pathIndex: number): void {
        this.editorHistory.DeletePath(shapeIndex, pathIndex);
    }

    HideShape(i: number, hide: boolean): void {
        if (hide) {
            this.setHiddenShapeIndicies([...this.hiddenShapeIndicies, i]);
        }
        else {
            this.setHiddenShapeIndicies(this.hiddenShapeIndicies.filter(p => p !== i));
        }
    }

    startDraggingPoint(index: number) {
        if (!this.canvasRef.current) return;
        if (this.selectedShapeIndex === -1 || this.selectedPathIndex === -1) return;

        const shape = this.history.present.shapes[this.selectedShapeIndex];
        const path = shape.paths[this.selectedPathIndex];
        const startPoint = path.points[index];

        let offsetX = 0;
        let offsetY = 0;

        const onMouseMove = (e: MouseEvent) => {
            if (!this.canvasRef.current) return;

            const camera = this.editorCamera.camera;

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

            if (this.editorGrid.snapToGrid) {
                const spacing = 1000 / this.editorGrid.gridSubdivisions; // same as DrawGrid
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
            this.editorGrid.ReDrawGrid();
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
        this.editorCamera.zoomInOut(e);
    }

    MovePointByIndex(pointIndex: number, newPoint: Point) {
        this.editorHistory.MovePointByIndex(pointIndex, newPoint);
    }

    handleCreatePoint(e: React.MouseEvent<HTMLCanvasElement>, targetIndex: number) {
        this.editorHistory.handleCreatePoint(e, targetIndex);
    }

    insertPointAt(index: number, x: number, y: number) {
        this.editorHistory.insertPointAt(index, x, y);
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
        const mouseWorld = screenToWorld(cmp.x, cmp.y, this.editorCamera.camera);
        const lastWorld = screenToWorld(this.lastMouseRef.current.x, this.lastMouseRef.current.y, this.editorCamera.camera);

        const dx = mouseWorld.x - lastWorld.x;
        const dy = mouseWorld.y - lastWorld.y;

        this.dragDeltaRef.current = { index, handleIn, dx, dy };

        // Apply delta for live preview by mutating history.present.shapes
        const shape = this.history.present.shapes[this.selectedShapeIndex];
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
        const history = this.history;
        if (!history.past.length) return true;

        const current = history.present.shapes;
        const lastPast = history.past[history.past.length - 1].shapes;

        return !shapesEqual(current, lastPast);
    }

    handleAddCurveToPoint(index: number) {
        this.editorHistory.handleAddCurveToPoint(index);
    }

    handleRemovePoint(index: number) {
        this.editorHistory.handleRemovePoint(index);
    }

    moveShapeForwardZ() {
        this.editorHistory.moveShapeForwardZ();
    }

    moveShapeBackwardZ() {
        this.editorHistory.moveShapeBackwardZ
    }

    setShapeName(name: string, index: number): void {
        this.editorHistory.setShapeName(name, index);
    }

    clearDocument(): void {
        this.editorHistory.setHistory({ past: [], present: { shapes: [] }, future: [] });
        this.setSelectedPointIndex(-1);
        this.setSelectedPathIndex(-1);
        this.setSelectedShapeIndex(-1)
        localStorage.removeItem("Session");
        if (this.canvasRef.current) ClearCanvas(this.canvasRef.current.getContext("2d")!);
    }

    handleSelectPoint(index: number): void {
        const shape = this.history.present.shapes[this.selectedShapeIndex];
        var points = shape.paths[this.selectedPathIndex].points.length;
        index = (index + points) % points;
        if (shape && shape.paths[this.selectedPathIndex].points.length > index && index > -1) {
            this.setSelectedPointIndex(index)
        }
    }

    selectShapeAt(ctx: CanvasRenderingContext2D, x: number, y: number) {
        let foundShapeIndex = -1;
        let nextPathIndex = -1;

        // loop from top-most shape down
        for (let i = this.history.present.shapes.length - 1; i >= 0; i--) {
            const shape = this.history.present.shapes[i];
            buildPath(ctx, shape);

            if (ctx.isPointInPath(x, y)) {
                foundShapeIndex = i;

                if (i === this.selectedShapeIndex) {
                    // cycle to next path
                    const pathCount = this.history.present.shapes[i].paths.length;
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

    Draw() {
        const canvas = this.canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

        ClearCanvas(ctx);

        ctx.setTransform(this.editorCamera.camera.zoom, 0, 0, this.editorCamera.camera.zoom, -this.editorCamera.camera.x * this.editorCamera.camera.zoom, -this.editorCamera.camera.y * this.editorCamera.camera.zoom)

        this.history.present.shapes.forEach((shape, i) => {
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
                ? this.history.present.shapes[this.selectedShapeIndex]
                    ?.paths[this.selectedPathIndex]
                    ?.points[this.selectedPointIndex]
                : null;
        if (selectedPoint) {
            ClearCanvas(coctx);
            DrawHandleLines(coctx, selectedPoint, this.editorCamera.camera, coCanvas)
        }
        else {
            ClearCanvas(coctx);
        }
    }
}
