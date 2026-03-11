import type { Path, Shape } from "../Editor/Shape";
import type { Editor } from "../Editor/Editor";
import { getCanvasMousePos } from "../Utilities/Utilities";
import { Tool } from "./Tool";

export class MoveTool extends Tool {

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
        if (!editor.canvasRef.current) return;
        console.log("moving");
        const cmp = getCanvasMousePos(e, editor.canvasRef.current)

        let screenX = cmp.x;
        let screenY = cmp.y;
        // return if no shape selected
        const shape = editor.history.present.shapes[editor.selectedShapeIndex];
        if (!shape) return;
        // move all points in paths in shape

        const dx = (screenX - editor.lastMouseRef.current.x) / editor.editorCamera.camera.zoom;
        const dy = (screenY - editor.lastMouseRef.current.y) / editor.editorCamera.camera.zoom;

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

        editor.lastMouseRef.current.x = screenX;
        editor.lastMouseRef.current.y = screenY;
        editor.Draw();
        // ReDrawGrid();
    }
    onMouseUp(_e: React.MouseEvent<HTMLCanvasElement>, _editor: Editor): void {
        this.isDragging = false;
        _editor.lastMouseRef.current = null;
    }


    onMouseDownKnob(_e: React.MouseEvent<HTMLDivElement>, editor: Editor, index: number): void {
        editor.setSelectedPointIndex(index);
        editor.startDraggingPoint(index);
    }
}