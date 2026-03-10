import type { Editor } from "../Editor/Editor";
import { Tool } from "./Tool";

export class SelectTool extends Tool {

    onMouseDown(_e: React.MouseEvent<HTMLCanvasElement>, _ctx: CanvasRenderingContext2D, _editor: Editor): void {

    }
    onMouseMove(_e: React.MouseEvent<HTMLCanvasElement>, _editor: Editor): void { }
    onMouseUp(_e: MouseEvent, _editor: Editor): void { }
    onMouseKnob(_e: MouseEvent, editor: Editor, knobIndex: number): void {
        editor.setSelectedPointIndex(knobIndex);
        editor.startDraggingPoint(knobIndex);
    }
}