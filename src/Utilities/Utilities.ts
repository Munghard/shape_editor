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
export function worldToScreen(worldX: number, worldY: number, camera: Camera, canvas: HTMLCanvasElement) {
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    return {
        x: (worldX - camera.x) * camera.zoom * scaleX,
        y: (worldY - camera.y) * camera.zoom * scaleY
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
export function getRandomColor(): string {
    return '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
}
export function hexToRgba(hex: string, alpha: number) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
export function getShapeCenter(shape: Shape) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    shape.paths.forEach(path => {
        path.points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
    });

    return {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2
    };
}
export function getCanvasMousePos(e: MouseEvent | React.MouseEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: ((e.clientX - rect.left) / rect.width) * canvas.width,
        y: ((e.clientY - rect.top) / rect.height) * canvas.height
    };
}