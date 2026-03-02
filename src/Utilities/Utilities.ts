import type { Vector2 } from "../components/Shape";


export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}
export function lerpVec2(a: Vector2, b: Vector2, t: number): Vector2 {
    return {
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t)
    };
}
export function ClearCanvas(c: HTMLCanvasElement, w: number, h: number) {
    var ctx = c.getContext("2d");
    if (ctx) {
        ctx.clearRect(0, 0, w, h);
    }
}