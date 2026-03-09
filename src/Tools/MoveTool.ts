import type { Path, Shape } from "../components/Shape";
import type { Editor } from "../Editor/Editor";
import { getCanvasMousePos } from "../Utilities/Utilities";
import { Tool } from "./Tool";

export class MoveTool extends Tool {
    private setSelectedPointIndex: (index: number) => void;
    private startDragging: (index: number) => void;
    private selectShapeAt: (ctx: CanvasRenderingContext2D, x: number, y: number) => void;

    constructor(selectShapeAt: (ctx: CanvasRenderingContext2D, x: number, y: number) => void, setSelectedPointIndex: (index: number) => void, startDragging: (index: number) => void) {
        super();
        this.selectShapeAt = selectShapeAt;
        this.setSelectedPointIndex = setSelectedPointIndex;
        this.startDragging = startDragging;
    }
    onMouseDown(_e: MouseEvent, ctx: CanvasRenderingContext2D, _editor: Editor): void {
        const rect = ctx.canvas.getBoundingClientRect();
        const x = _e.screenX - rect.left;
        const y = _e.screenY - rect.top;

        this.selectShapeAt(ctx, x, y);
        this.isDragging = true;
    }
    onMouseMove(e: MouseEvent, editor: Editor): void {
        const cmp = getCanvasMousePos(e, editor.canvas)

        let screenX = cmp.x;
        let screenY = cmp.y;
        // return if no shape selected
        const shape = editor.history.present.shapes[editor.selectedShapeIndex];
        if (!shape) return;
        // move all points in paths in shape
        if (this.isDragging) {
            const dx = (screenX - this.dragOffsetX) / editor.camera.zoom;
            const dy = (screenY - this.dragOffsetY) / editor.camera.zoom;

            const shape = editor.history.present.shapes[editor.selectedShapeIndex];
            const shapes = editor.history.present.shapes;

            if (e.ctrlKey) {
                shapes.forEach((shape: Shape) => {
                    shape.paths.forEach(path => {
                        path.points.forEach(p => {
                            editor.MovePoint(p, dx, dy);
                        });
                    });
                });
            }
            else {
                shape.paths.forEach((path: Path) => {
                    path.points.forEach(p => {
                        editor.MovePoint(p, dx, dy);
                    });
                });
            }

            this.dragOffsetX = screenX;
            this.dragOffsetY = screenY;
            editor.Draw();
            // ReDrawGrid();
        }
    }
    onMouseUp(_e: MouseEvent, _editor: Editor): void {
        this.isDragging = false;
    }
    onMouseKnob(_e: MouseEvent, _editor: Editor, knobIndex: number): void {
        this.setSelectedPointIndex(knobIndex);
        this.startDragging(knobIndex);
    }
}