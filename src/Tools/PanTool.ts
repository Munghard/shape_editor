import type { Editor } from "../Editor/Editor";
import { getCanvasMousePos } from "../Utilities/Utilities";
import { Tool } from "./Tool";

export class PanTool extends Tool {

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

        const cmp = getCanvasMousePos(e, editor.canvasRef.current)

        let screenX = cmp.x;
        let screenY = cmp.y;

        // delta in screen pixels
        const dx = screenX - editor.lastMouseRef.current.x;
        const dy = screenY - editor.lastMouseRef.current.y;

        // convert to world units by dividing by zoom once
        editor.cameraRef.current.x -= dx / editor.cameraRef.current.zoom;
        editor.cameraRef.current.y -= dy / editor.cameraRef.current.zoom;

        editor.lastMouseRef.current.x = screenX;
        editor.lastMouseRef.current.y = screenY;

        editor.Draw()
        editor.ReDrawGrid();
    }
    onMouseUp(_e: React.MouseEvent<HTMLCanvasElement>, editor: Editor): void {
        this.isDragging = false;
        editor.lastMouseRef.current = null;
    }
}