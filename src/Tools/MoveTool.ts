import type { Path, Shape } from "../Editor/Shape";
import type { Editor } from "../Editor/Editor";
import { getCanvasMousePos } from "../Utilities/Utilities";
import { Tool } from "./Tool";

export class MoveTool extends Tool {

    onMouseDown(_e: React.MouseEvent<HTMLCanvasElement>, _ctx: CanvasRenderingContext2D, _editor: Editor): void {
        this.isDragging = true;
    }
    onMouseMove(e: React.MouseEvent<HTMLCanvasElement>, editor: Editor): void {
        if (!this.isDragging) return;
        console.log("moving");
        const cmp = getCanvasMousePos(e, editor.canvasRef.current)

        let screenX = cmp.x;
        let screenY = cmp.y;
        // return if no shape selected
        const shape = editor.historyRef.current.present.shapes[editor.selectedShapeIndex];
        if (!shape) return;
        // move all points in paths in shape
        if (this.isDragging) {
            const dx = (screenX - this.dragOffsetX) / editor.cameraRef.current.zoom;
            const dy = (screenY - this.dragOffsetY) / editor.cameraRef.current.zoom;

            const shape = editor.historyRef.current.present.shapes[editor.selectedShapeIndex];
            const shapes = editor.historyRef.current.present.shapes;

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
    onMouseKnob(_e: MouseEvent, editor: Editor, knobIndex: number): void {
        editor.setSelectedPointIndex(knobIndex);
        editor.startDraggingPoint(knobIndex);
    }
}