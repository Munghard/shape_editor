import type { Editor } from "../Editor/Editor"
export interface ITool {
    onMouseDown(e: React.MouseEvent<HTMLCanvasElement>, ctx: CanvasRenderingContext2D, editor: Editor): void
    onMouseMove(e: MouseEvent, editor: Editor): void
    onMouseUp(e: MouseEvent, editor: Editor): void

    onMouseDownKnob(e: MouseEvent, editor: Editor, knobIndex: number): void
}