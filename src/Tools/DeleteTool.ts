import type { Editor } from "../Editor/Editor";
import { Tool } from "./Tool";

export class DeleteTool extends Tool {

    onMouseDown(_e: React.MouseEvent<HTMLCanvasElement>, _ctx: CanvasRenderingContext2D, _editor: Editor): void { }
    onMouseMove(_e: React.MouseEvent<HTMLCanvasElement>, _editor: Editor): void { }
    onMouseUp(_e: React.MouseEvent<HTMLCanvasElement>, _editor: Editor): void { }
    onMouseDownKnob(_e: React.MouseEvent<HTMLDivElement>, editor: Editor, index: number): void {
        editor.handleRemovePoint(index);
    }
}