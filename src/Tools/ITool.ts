import type { Editor } from "../Editor/Editor"
export interface ITool {
    onMouseDown(e: React.MouseEvent<HTMLCanvasElement>, ctx: CanvasRenderingContext2D, editor: Editor): void
    onMouseMove(e: React.MouseEvent<HTMLCanvasElement>, editor: Editor): void
    onMouseUp(e: React.MouseEvent<HTMLCanvasElement>, editor: Editor): void
    onMouseDownKnob(e: React.MouseEvent<HTMLDivElement>, editor: Editor, index: number): void
}