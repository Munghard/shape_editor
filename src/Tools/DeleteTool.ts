import type { Editor } from "../Editor/Editor";
import { Tool } from "./Tool";

export class DeleteTool extends Tool {

    onMouseDown(_e: React.MouseEvent<HTMLCanvasElement>, _ctx: CanvasRenderingContext2D, _editor: Editor): void { }
    onMouseMove(_e: React.MouseEvent<HTMLCanvasElement>, _editor: Editor): void { }
    onMouseUp(_e: MouseEvent, _editor: Editor): void { }
    onMouseUpKnob(_e: MouseEvent, _editor: Editor, knobIndex: number): void {
        _editor.handleRemovePoint(knobIndex);
    }
}