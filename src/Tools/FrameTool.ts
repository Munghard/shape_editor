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

    onMouseDown(e: React.MouseEvent<HTMLCanvasElement>, ctx: CanvasRenderingContext2D, editor: Editor): void {
        this.isDragging = true;
        const cmp = getCanvasMousePos(e, ctx.canvas);
        editor.lastMouseRef.current = {
            x: cmp.x,
            y: cmp.y,
        };
    }
    onMouseMove(e: React.MouseEvent<HTMLCanvasElement>, editor: Editor): void {
        if (!this.isDragging) return;
        if (!editor.lastMouseRef.current) return;
        if (!editor.canvasRef.current) return;
        const cmp = getCanvasMousePos(e, editor.canvasRef.current)

        let screenX = cmp.x;
        let screenY = cmp.y;

        // delta in screen pixels
        const dx = (screenX - editor.lastMouseRef.current.x) / editor.cameraRef.current.zoom;
        const dy = (screenY - editor.lastMouseRef.current.y) / editor.cameraRef.current.zoom;

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

        editor.lastMouseRef.current.x = screenX;
        editor.lastMouseRef.current.y = screenY;
    }
    onMouseUp(_e: React.MouseEvent<HTMLCanvasElement>, editor: Editor): void {
        this.isDragging = false;
        editor.lastMouseRef.current = null;
    }
}