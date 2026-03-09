import type { Editor } from "../Editor/Editor";
import type { ITool } from "./ITool";

export class Tool implements ITool {
    public isDragging = false;
    public dragOffsetX = 0;
    public dragOffsetY = 0;
    onMouseDown(_e: React.MouseEvent<HTMLCanvasElement>, _ctx: CanvasRenderingContext2D, _editor: Editor): void { }
    onMouseMove(_e: MouseEvent, _editor: Editor): void { }
    onMouseUp(_e: MouseEvent, _editor: Editor): void { }
    onMouseDownKnob(_e: MouseEvent, _editor: Editor): void { }
}