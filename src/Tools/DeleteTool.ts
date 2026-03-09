import type { Editor } from "../Editor/Editor";
import { Tool } from "./Tool";

export class DeleteTool extends Tool {
    private handleRemovePoint: (knobIndex: number) => void;

    constructor(handleRemovePoint: (knobIndex: number) => void) {
        super();
        this.handleRemovePoint = handleRemovePoint;
    }

    onMouseDown(_e: React.MouseEvent<HTMLCanvasElement>, _ctx: CanvasRenderingContext2D, _editor: Editor): void { }
    onMouseMove(_e: MouseEvent, _editor: Editor): void { }
    onMouseUp(_e: MouseEvent, _editor: Editor): void { }
    onMouseUpKnob(_e: MouseEvent, _editor: Editor, knobIndex: number): void {
        this.handleRemovePoint(knobIndex);
    }
}