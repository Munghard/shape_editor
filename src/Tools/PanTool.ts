import type { Editor } from "../Editor/Editor";
import { getCanvasMousePos } from "../Utilities/Utilities";
import { Tool } from "./Tool";

export class PanTool extends Tool {

    onMouseDown(e: React.MouseEvent<HTMLCanvasElement>, ctx: CanvasRenderingContext2D, _editor: Editor): void {
        this.isDragging = true;

        const cmp = getCanvasMousePos(e, ctx.canvas);
        this.dragOffsetX = cmp.x;
        this.dragOffsetY = cmp.y;

    }
    onMouseMove(e: MouseEvent, editor: Editor): void {
        if (!this.isDragging) return;

        const cmp = getCanvasMousePos(e, editor.canvas)

        let screenX = cmp.x;
        let screenY = cmp.y;

        // delta in screen pixels
        const dx = screenX - this.dragOffsetX;
        const dy = screenY - this.dragOffsetY;

        // convert to world units by dividing by zoom once
        editor.camera.x -= dx / editor.camera.zoom;
        editor.camera.y -= dy / editor.camera.zoom;

        this.dragOffsetX = screenX;
        this.dragOffsetY = screenY;

        editor.Draw()
        editor.redrawGrid();
    }
    onMouseUp(_e: MouseEvent, _editor: Editor): void {
        this.isDragging = false;
    }
}