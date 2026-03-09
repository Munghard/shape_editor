import type { Editor } from "../Editor/Editor";
import { getCanvasMousePos } from "../Utilities/Utilities";
import { Tool } from "./Tool";

export class SelectTool extends Tool {
    private startDragging: (index: number) => void;

    constructor(startDragging: (index: number) => void) {
        super();
        this.startDragging = startDragging;
    }

    onMouseDown(_e: React.MouseEvent<HTMLCanvasElement>, ctx: CanvasRenderingContext2D, editor: Editor): void {
        const cmp = getCanvasMousePos(_e, ctx.canvas);
        editor.selectShapeAt(ctx, cmp.x, cmp.y);
    }
    onMouseMove(_e: MouseEvent, _editor: Editor): void { }
    onMouseUp(_e: MouseEvent, _editor: Editor): void { }
    onMouseKnob(_e: MouseEvent, editor: Editor, knobIndex: number): void {
        editor.setSelectedPointIndex(knobIndex);
        this.startDragging(knobIndex);
    }
}