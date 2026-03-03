import type { Camera } from "../components/Camera";
import type { Point } from "../components/Shape";


export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}
export function lerpVec2(a: Point, b: Point, t: number): Point {
    return {
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t)
    };
}
export function ClearCanvas(ctx: CanvasRenderingContext2D) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
}

export function screenToWorld(mouseX: number, mouseY: number, camera: Camera) {
    return {
        x: mouseX / camera.zoom + camera.x,
        y: mouseY / camera.zoom + camera.y
    }
}
export function worldToScreen(worldX: number, worldY: number, camera: Camera) {
    return {
        x: (worldX - camera.x) * camera.zoom,
        y: (worldY - camera.y) * camera.zoom
    };
}