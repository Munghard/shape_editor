import type { Editor } from "../Editor/Editor";
import { getCanvasMousePos } from "../Utilities/Utilities";
import { Tool } from "./Tool";

export class PanTool extends Tool {

    onMouseDown(_e: MouseEvent, _ctx: CanvasRenderingContext2D, _editor: Editor): void {
        this.isDragging = true;
    }
    onMouseMove(e: MouseEvent, editor: Editor): void {
        const cmp = getCanvasMousePos(e, editor.canvas)

        let screenX = cmp.x;
        let screenY = cmp.y;
        // return if no shape selected


        // delta in screen pixels
        const dx = screenX - screenX;
        const dy = screenY - screenY;

        // convert to world units by dividing by zoom once
        editor.camera.x -= dx / editor.camera.zoom;
        editor.camera.y -= dy / editor.camera.zoom;

        this.dragOffsetX = screenX;
        this.dragOffsetY = screenY;

        editor.Draw()
        editor.redrawGrid();
        // console.log(cameraRef.current.x, cameraRef.current.y)
        // ReDrawGrid();
    }
    onMouseUp(_e: MouseEvent, _editor: Editor): void {
        this.isDragging = false;
    }
}