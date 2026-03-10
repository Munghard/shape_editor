import type { Path, Shape } from "../Editor/Shape";
import type { Editor } from "../Editor/Editor";
import { getCanvasMousePos, getShapeCenter } from "../Utilities/Utilities";
import { Tool } from "./Tool";

export class RotateTool extends Tool {

    onMouseDown(e: React.MouseEvent<HTMLCanvasElement>, ctx: CanvasRenderingContext2D, editor: Editor): void {
        this.isDragging = true;
        const cmp = getCanvasMousePos(e, ctx.canvas);
        editor.lastMouseRef.current = {
            x: cmp.x,
            y: cmp.y,
        };
    }
    onMouseMove(e: React.MouseEvent<HTMLCanvasElement>, editor: Editor): void {
        if (!this.isDragging) return;
        if (!editor.lastMouseRef.current) return;
        const cmp = getCanvasMousePos(e, editor.canvasRef.current)

        let screenX = cmp.x;
        let screenY = cmp.y;
        //dragOffsetX = screenX;
        //dragOffsetY = screenY;


        const dy = screenY - editor.lastMouseRef.current.y;

        const shape = editor.historyRef.current.present.shapes[editor.selectedShapeIndex];
        const shapes = editor.historyRef.current.present.shapes;
        if (!shape) return;

        const center = getShapeCenter(shape);

        // Rotate based on vertical mouse delta (dy)
        // You can tweak the factor to control sensitivity
        const angle = dy * 0.01; // radians
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        if (e.ctrlKey) {
            shapes.forEach((shape: Shape) => {
                shape.paths.forEach(path => {
                    path.points.forEach(p => {
                        editor.RotatePoint(p, center, cos, sin);
                    });
                });
            });
        }
        else {
            shape.paths.forEach((path: Path) => {
                path.points.forEach(p => {
                    editor.RotatePoint(p, center, cos, sin);
                });
            });
        }
        editor.lastMouseRef.current.x = screenX;
        editor.lastMouseRef.current.y = screenY;
        editor.Draw();
    }
    onMouseUp(_e: React.MouseEvent<HTMLCanvasElement>, editor: Editor): void {
        this.isDragging = false;
        editor.lastMouseRef.current = null;
    }
    onMouseDownKnob(_e: React.MouseEvent<HTMLDivElement>, editor: Editor, index: number): void {
        editor.setSelectedPointIndex(index);
        editor.startDraggingPoint(index);
    }
}