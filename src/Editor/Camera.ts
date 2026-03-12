import { getShapeCenter } from "../Utilities/Utilities";
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