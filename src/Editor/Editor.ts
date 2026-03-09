import type { Camera } from "./Camera"
import type { History } from "../Editor/History"
import type { ITool } from "../Tools/ITool";
import { DrawShape, type Point } from "../components/Shape";
import { ClearCanvas } from "../Utilities/Utilities";
import { DrawHandleLines } from "./OverlayCanvas";

export class Editor {
    canvas: HTMLCanvasElement;
    camera: Camera;
    history: History;
    activeTool: ITool | null;

    redrawGrid: () => void;

    hiddenShapeIndicies: number[];
    selectedShapeIndex: number;
    selectedPathIndex: number;
    selectedPointIndex: number;

    constructor(
        canvas: HTMLCanvasElement,
        camera: Camera,
        history: History,
        activeTool: ITool | null,
        redrawGrid: () => void,
        ssi: number,
        spai: number,
        spoi: number,
        hiddenShapeIndicies: number[]
    ) {
        this.canvas = canvas;

        this.camera = camera;
        this.history = history;
        this.activeTool = activeTool;
        this.redrawGrid = redrawGrid;

        this.selectedShapeIndex = ssi;
        this.selectedPathIndex = spai;
        this.selectedPointIndex = spoi;

        this.hiddenShapeIndicies = hiddenShapeIndicies;
    }

    onMouseDown(e: MouseEvent, ctx: CanvasRenderingContext2D) {
        this.activeTool?.onMouseDown(e, ctx, this)
    }

    onMouseMove(e: MouseEvent) {
        this.activeTool?.onMouseMove(e, this)
    }

    onMouseUp(e: MouseEvent) {
        this.activeTool?.onMouseUp(e, this)
    }

    Draw() {

        const canvas = this.canvas;
        if (!canvas) return;

        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

        ClearCanvas(ctx);

        ctx.setTransform(this.camera.zoom, 0, 0, this.camera.zoom, -this.camera.x * this.camera.zoom, -this.camera.y * this.camera.zoom)

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
            DrawHandleLines(coctx, selectedPoint, this.camera, coCanvas)
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

    // handleRemovePoint(index: number,selectedShapeIndex:number,selectedPathIndex:number) {

    //     commit(prevShapes =>
    //         prevShapes.map((s, i) => {
    //             if (i !== selectedShapeIndex) return s;

    //             const newPaths = [...s.paths];
    //             const currentPath = { ...newPaths[selectedPathIndex] };

    //             currentPath.points = currentPath.points.filter(
    //                 (_p, idx) => idx !== index
    //             );

    //             newPaths[selectedPathIndex] = currentPath;

    //             return { ...s, paths: newPaths };
    //         })
    //     );

    //     setSelectedPointIndex(prev => {
    //         if (prev === null) return 0;
    //         if (prev === index) return 0;
    //         if (prev > index) return prev - 1;
    //         return prev;
    //     });
    // }
}