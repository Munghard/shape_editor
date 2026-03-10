import type { Editor } from "../Editor/Editor";
import { getCanvasMousePos } from "../Utilities/Utilities";
import { Tool } from "./Tool";

export class SelectTool extends Tool {

    onMouseDown(e: React.MouseEvent<HTMLCanvasElement>, ctx: CanvasRenderingContext2D, editor: Editor): void {
        this.isDragging = true;
        const cmp = getCanvasMousePos(e, ctx.canvas);
        editor.lastMouseRef.current = {
            x: cmp.x,
            y: cmp.y,
        };
    }
    onMouseMove(_e: React.MouseEvent<HTMLCanvasElement>, _editor: Editor): void { }
    onMouseUp(_e: React.MouseEvent<HTMLCanvasElement>, _editor: Editor): void {
        this.isDragging = false;
        _editor.lastMouseRef.current = null;
    }
    onMouseDownKnob(_e: React.MouseEvent<HTMLDivElement>, editor: Editor, index: number): void {
        editor.setSelectedPointIndex(index);
        editor.startDraggingPoint(index);
    }
}