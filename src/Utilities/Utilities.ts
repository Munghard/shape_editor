import type { Camera } from "../components/Camera";
import type { Point, Shape } from "../components/Shape";


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
export function shapesEqual(a: Shape[], b: Shape[]) {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i].paths.length !== b[i].paths.length) return false;
        for (let j = 0; j < a[i].paths.length; j++) {
            if (a[i].paths[j].points.length !== b[i].paths[j].points.length) return false;
            for (let k = 0; k < a[i].paths[j].points.length; k++) {
                const p1 = a[i].paths[j].points[k];
                const p2 = b[i].paths[j].points[k];
                if (p1.x !== p2.x || p1.y !== p2.y) return false;
            }
        }
    }
    return true;
}