import getHoveredSegment from "../components/Segment";
import { Editor } from "../Editor/Editor";
import { cubicBezierPoint, getCanvasMousePos, screenToWorld, worldToScreen } from "../Utilities/Utilities";
import { Tool } from "./Tool";

export class InsertTool extends Tool {
    private ClearOverlayCanvas: () => void;


    constructor(
        ClearOverlayCanvas: () => void,
    ) {
        super();
        this.ClearOverlayCanvas = ClearOverlayCanvas;
    }

    onMouseDown(e: React.MouseEvent<HTMLCanvasElement>, _ctx: CanvasRenderingContext2D, editor: Editor): void {
        this.isDragging = true;
        let targetIndex = editor.selectedShapeIndex;
        if (e.shiftKey) {
            editor.AddNewShape("empty"); // this should also select it
            targetIndex = editor.historyRef.current.present.shapes.length;
        }
        else if (e.ctrlKey) {
            editor.AddNewPath();
        }
        else {
            this.ClearOverlayCanvas();
            editor.handleCreatePoint(e as unknown as React.MouseEvent<HTMLCanvasElement>, targetIndex);

        }
    }
    onMouseMove(e: React.MouseEvent<HTMLCanvasElement>, editor: Editor): void {
        const cmp = getCanvasMousePos(e, editor.canvasRef.current)

        let screenX = cmp.x;
        let screenY = cmp.y;

        const threshold = 10; // pixels

        const worldPos = screenToWorld(screenX, screenY, editor.cameraRef.current);
        const shape = editor.historyRef.current.present.shapes[editor.selectedShapeIndex];
        var seg = getHoveredSegment(shape, threshold, worldPos.x, worldPos.y, editor.selectedPathIndex);
        editor.setSelectedSegmentIndex(seg);

        // get overlay canvas
        var canvas = document.getElementById("CanvasOverlay") as HTMLCanvasElement;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // we are hovering a valid segment
        if (seg !== -1) {
            // draw a knob in the middle
            const path = shape.paths[editor.selectedPathIndex];
            const n = path.points.length;
            const start = path.points[seg];
            const end = path.points[(seg + 1) % n]; // loops back to first point if last

            const c1 = start.out ?? start;
            const c2 = end.in ?? end;

            var pos = cubicBezierPoint(0.5, start, c1, c2, end);

            const { x, y } = worldToScreen(pos.x, pos.y, editor.cameraRef.current, editor.canvasRef.current);
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.beginPath();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
            ctx.lineWidth = 2;
            ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
            ctx.arc(x, y, threshold, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }




    onMouseUp(_e: MouseEvent, _editor: Editor): void {
        this.isDragging = false;
    }
    onMouseKnob(_e: MouseEvent, editor: Editor, knobIndex: number): void {
        editor.setSelectedPointIndex(knobIndex);
        editor.startDraggingPoint(knobIndex);
    }
}