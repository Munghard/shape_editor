import type { Camera } from "../Editor/Camera";
import type { Path, Point, Shape, Vec2 } from "../Editor/Shape";


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

export function buildPath(ctx: CanvasRenderingContext2D, shape: Shape) {
    ctx.beginPath();
    for (let index = 0; index < shape.paths.length; index++) {

        const points = shape.paths[index].points;

        if (!points || points.length === 0) continue;

        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            ctx.bezierCurveTo(
                prev.out?.x ?? prev.x,
                prev.out?.y ?? prev.y,
                curr.in?.x ?? curr.x,
                curr.in?.y ?? curr.y,
                curr.x, curr.y
            );
        }
        if (shape.cyclic && points.length > 1) {
            const last = points[points.length - 1];
            const first = points[0];

            ctx.bezierCurveTo(
                last.out?.x ?? last.x,
                last.out?.y ?? last.y,
                first.in?.x ?? first.x,
                first.in?.y ?? first.y,
                first.x,
                first.y
            );
            ctx.closePath(); // optional for closed shapes
        }
    }
}

export function CloneShape(shape: Shape): Shape {
    return {
        ...shape,
        paths: shape.paths.map(path => ({
            ...path,
            points: path.points.map(p => ({
                x: p.x,
                y: p.y,
                in: p.in ? { x: p.in.x, y: p.in.y } : undefined,
                out: p.out ? { x: p.out.x, y: p.out.y } : undefined
            }))
        }))
    };
}
export function cubicBezierPoint(t: number, p0: Vec2, c1: Vec2, c2: Vec2, p3: Vec2): Vec2 {
    const u = 1 - t;
    return {
        x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
        y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y
    };
}
export function clonePath(path: Path): Path {
    return {
        ...path,
        points: path.points.map(pt => ({ ...pt }))
    };
}
// ================================================================================================================
// MOVE
// ================================================================================================================

export function MovePoint(p: Point, dx: number, dy: number) {
    p.x += dx;
    p.y += dy;

    if (p.in) {
        p.in.x += dx;
        p.in.y += dy;
    }

    if (p.out) {
        p.out.x += dx;
        p.out.y += dy;
    }
}
// ================================================================================================================
// ROTATE
// ================================================================================================================
export function RotatePoint(p: Point, center: { x: number; y: number; }, cos: number, sin: number) {
    const offsetX = p.x - center.x;
    const offsetY = p.y - center.y;

    // apply rotation
    const rotatedX = offsetX * cos - offsetY * sin;
    const rotatedY = offsetX * sin + offsetY * cos;

    p.x = center.x + rotatedX;
    p.y = center.y + rotatedY;

    if (p.in) {
        const inOffsetX = p.in.x - center.x;
        const inOffsetY = p.in.y - center.y;

        // apply rotation
        const rotatedInX = inOffsetX * cos - inOffsetY * sin;
        const rotatedInY = inOffsetX * sin + inOffsetY * cos;

        p.in.x = center.x + rotatedInX;
        p.in.y = center.y + rotatedInY;
    }
    if (p.out) {
        const outOffsetX = p.out.x - center.x;
        const outOffsetY = p.out.y - center.y;

        // apply rotation
        const rotatedOutX = outOffsetX * cos - outOffsetY * sin;
        const rotatedOutY = outOffsetX * sin + outOffsetY * cos;

        p.out.x = center.x + rotatedOutX;
        p.out.y = center.y + rotatedOutY;
    }
}
// ================================================================================================================
// SCALE
// ================================================================================================================
export function ScalePoint(p: Point, center: { x: number; y: number }, scaleFactor: number) {
    p.x = center.x + (p.x - center.x) * scaleFactor;
    p.y = center.y + (p.y - center.y) * scaleFactor;
    if (p.in) {
        p.in.x = center.x + (p.in.x - center.x) * scaleFactor;
        p.in.y = center.y + (p.in.y - center.y) * scaleFactor;
    }
    if (p.out) {
        p.out.x = center.x + (p.out.x - center.x) * scaleFactor;
        p.out.y = center.y + (p.out.y - center.y) * scaleFactor;
    }
}
