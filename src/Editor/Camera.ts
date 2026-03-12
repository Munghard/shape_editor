import { getCanvasMousePos, getShapeCenter } from "../Utilities/Utilities";
import type { Editor } from "./Editor";

export type Camera = {
    x: number
    y: number
    zoom: number
}

export class EditorCamera {
    editor: Editor;
    constructor(editor: Editor) {
        this.editor = editor;
    }

    camera: Camera = { x: 0, y: 0, zoom: 1 };


    zoomInOut = (e: React.WheelEvent): void => {
        if (!this.editor.canvasRef.current) return;

        var cmp = getCanvasMousePos(e, this.editor.canvasRef.current)

        const canvasX = cmp.x;
        const canvasY = cmp.y;

        const cam = this.editor.editorCamera.camera;

        // mouse position in world coordinates
        const worldX = cam.x + canvasX / cam.zoom;
        const worldY = cam.y + canvasY / cam.zoom;

        const zoomFactor = 1.2;
        const delta = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;

        // apply zoom
        cam.zoom *= delta;
        cam.zoom = Math.max(0.1, Math.min(cam.zoom, 10));

        // adjust camera so the world point under the mouse stays fixed
        cam.x = worldX - (canvasX / cam.zoom);
        cam.y = worldY - (canvasY / cam.zoom);

        this.editor.setTick(t => t + 1); // force React to re-render knobs

        this.editor.Draw();
        this.editor.editorGrid.ReDrawGrid();
    }

    resetCamera() {
        const canvas = this.editor.canvasRef.current;
        if (!canvas) return;
        var w = canvas.width;
        var h = canvas.height;
        this.editor.editorCamera.camera.x = 0 - w / 2;
        this.editor.editorCamera.camera.y = 0 - h / 2;
        this.editor.editorCamera.camera.zoom = 1;
        this.editor.Draw();
        this.editor.editorGrid.ReDrawGrid();
    }

    centerCamera() {
        const canvas = this.editor.canvasRef.current;
        if (!canvas || !this.editor.shape) return;

        const center = getShapeCenter(this.editor.shape);
        const zoom = this.editor.editorCamera.camera.zoom;

        this.editor.editorCamera.camera.x = center.x - canvas.width / (2 * zoom);
        this.editor.editorCamera.camera.y = center.y - canvas.height / (2 * zoom);

        this.editor.Draw();
        this.editor.editorGrid.ReDrawGrid();
    }
}