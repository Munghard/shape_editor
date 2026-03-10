import type { Editor } from "../Editor/Editor";
import type { ITool } from "./ITool";

export class Tool implements ITool {
    public isDragging = false;
    onMouseDown(_e: React.MouseEvent<HTMLCanvasElement>, _ctx: CanvasRenderingContext2D, _editor: Editor): void { }
    onMouseMove(_e: React.MouseEvent<HTMLCanvasElement>, _editor: Editor): void { }
    onMouseUp(_e: React.MouseEvent<HTMLCanvasElement>, _editor: Editor): void { }
    onMouseDownKnob(_e: React.MouseEvent<HTMLDivElement>, _editor: Editor, _index: number): void { }
}