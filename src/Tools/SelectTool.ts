import type { Editor } from "../Editor/Editor";
import { Tool } from "./Tool";

export class SelectTool extends Tool {
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
    }
    onMouseMove(_e: MouseEvent, _editor: Editor): void { }
    onMouseUp(_e: MouseEvent, _editor: Editor): void { }
    onMouseKnob(_e: MouseEvent, _editor: Editor, knobIndex: number): void {
        this.setSelectedPointIndex(knobIndex);
        this.startDragging(knobIndex);
    }
}