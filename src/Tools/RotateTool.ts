import type { Path, Shape } from "../Editor/Shape";
import type { Editor } from "../Editor/Editor";
import { getCanvasMousePos, getShapeCenter } from "../Utilities/Utilities";
import { Tool } from "./Tool";

export class RotateTool extends Tool {

    onMouseDown(_e: React.MouseEvent<HTMLCanvasElement>, _ctx: CanvasRenderingContext2D, _editor: Editor): void {
        this.isDragging = true;
    }
    onMouseMove(e: React.MouseEvent<HTMLCanvasElement>, editor: Editor): void {
        if (!this.isDragging) return;
        const cmp = getCanvasMousePos(e, editor.canvasRef.current)

        let screenX = cmp.x;
        let screenY = cmp.y;
        this.dragOffsetX = screenX;
        this.dragOffsetY = screenY;

        const dy = screenY - this.dragOffsetY;

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
        this.dragOffsetX = screenX;
        this.dragOffsetY = screenY;
        editor.Draw();
    }
    onMouseUp(_e: MouseEvent, _editor: Editor): void {
        this.isDragging = false;
    }
    onMouseKnob(_e: MouseEvent, editor: Editor, knobIndex: number): void {
        editor.setSelectedPointIndex(knobIndex);
        editor.startDraggingPoint(knobIndex);
    }
}