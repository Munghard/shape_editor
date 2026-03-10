import type { Rect } from "../Editor/Shape";
import type { Editor } from "../Editor/Editor";
import { getCanvasMousePos } from "../Utilities/Utilities";
import { Tool } from "./Tool";
import type React from "react";

export class FrameTool extends Tool {

    private setFrame: React.Dispatch<React.SetStateAction<Rect>>;

    constructor(setFrame: React.Dispatch<React.SetStateAction<Rect>>) {
        super();
        this.setFrame = setFrame;
    }

    onMouseDown(_e: React.MouseEvent<HTMLCanvasElement>, _ctx: CanvasRenderingContext2D, _editor: Editor): void {
        this.isDragging = true;
    }
    onMouseMove(e: React.MouseEvent<HTMLCanvasElement>, editor: Editor): void {
        if (!this.isDragging) return;
        const cmp = getCanvasMousePos(e, editor.canvasRef.current)

        let screenX = cmp.x;
        let screenY = cmp.y;

        // delta in screen pixels
        const dx = (screenX - this.dragOffsetX) / editor.cameraRef.current.zoom;
        const dy = (screenY - this.dragOffsetY) / editor.cameraRef.current.zoom;

        this.setFrame(prev => {
            if (e.ctrlKey) {
                // Move rectangle
                return { ...prev, x: prev.x + dx, y: prev.y + dy };
            } else if (e.shiftKey) {
                // Resize proportionally (square)
                const size = prev.w + dy; // simple proportional resize
                return { ...prev, w: size, h: size };
            } else {
                // Resize normally
                return { ...prev, w: prev.w + dx, h: prev.h + dy };
            }
        });

        this.dragOffsetX = screenX;
        this.dragOffsetY = screenY;
    }
    onMouseUp(_e: MouseEvent, _editor: Editor): void {
        this.isDragging = false;
    }
}