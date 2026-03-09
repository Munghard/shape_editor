import type { Path, Shape } from "../components/Shape";
import type { Editor } from "../Editor/Editor";
import { getCanvasMousePos, getShapeCenter } from "../Utilities/Utilities";
import { Tool } from "./Tool";

export class ScaleTool extends Tool {
    private startDragging: (index: number) => void;

    constructor(startDragging: (index: number) => void) {
        super();
        this.startDragging = startDragging;
    }
    onMouseDown(_e: React.MouseEvent<HTMLCanvasElement>, _ctx: CanvasRenderingContext2D, _editor: Editor): void {
        this.isDragging = true;
    }
    onMouseMove(e: MouseEvent, editor: Editor): void {
        const cmp = getCanvasMousePos(e, editor.canvas)

        let screenX = cmp.x;
        let screenY = cmp.y;
        // const dx = screenX - lastMouseRef.current.x;
        const dy = screenY - this.dragOffsetY;

        this.dragOffsetX = screenX;
        this.dragOffsetY = screenY;

        const shape = editor.history.present.shapes[editor.selectedShapeIndex];
        const shapes = editor.history.present.shapes;
        if (!shape) return;

        const center = getShapeCenter(shape);

        const scaleFactor = Math.max(0.1, 1 + dy * 0.01);

        if (e.ctrlKey) {
            shapes.forEach((shape: Shape) => {
                shape.paths.forEach(path => {
                    path.points.forEach(p => {
                        editor.ScalePoint(p, center, scaleFactor);
                    });
                });
            });
        }
        else {

            shape.paths.forEach((path: Path) => {
                path.points.forEach(p => {
                    editor.ScalePoint(p, center, scaleFactor);
                });
            });
        }
        this.dragOffsetX = screenX;
        this.dragOffsetY = screenY;
        editor.Draw();
    }

    onMouseUp(_e: MouseEvent, _editor: Editor): void {
        this.isDragging = false;
    }
    onMouseKnob(_e: MouseEvent, editor: Editor, knobIndex: number): void {
        editor.setSelectedPointIndex(knobIndex);
        this.startDragging(knobIndex);
    }
}