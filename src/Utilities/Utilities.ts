import type { Camera } from "../components/Camera";
import type { Path, Point, Shape, Vec2 } from "../components/Shape";


export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}
export function lerpVec2(a: Point, b: Point, t: number): { x: number, y: number } {
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
export function shapesEqual(
    a: Shape[],
    b: Shape[],
    pathsA: Record<string, Path>,
    pathsB: Record<string, Path>,
    pointsA: Record<string, Point>,
    pointsB: Record<string, Point>
) {
    if (!a || !b || a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
        const shapeA = a[i];
        const shapeB = b[i];

        if (shapeA.pathIds.length !== shapeB.pathIds.length) return false;

        for (let j = 0; j < shapeA.pathIds.length; j++) {
            const pathA = pathsA[shapeA.pathIds[j]];
            const pathB = pathsB[shapeB.pathIds[j]];
            if (!pathA || !pathB) return false;

            if (pathA.pointIds.length !== pathB.pointIds.length) return false;

            for (let k = 0; k < pathA.pointIds.length; k++) {
                const pointA = pointsA[pathA.pointIds[k]];
                const pointB = pointsB[pathB.pointIds[k]];

                if (!pointA || !pointB) return false;

                if (pointA.x !== pointB.x || pointA.y !== pointB.y) return false;
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
export function getShapeCenter(
    shape: Shape,
    paths: Record<string, Path>,
    points: Record<string, Point>
) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    shape.pathIds.forEach(pathId => {
        const path = paths[pathId];
        if (!path) return;

        path.pointIds.forEach(pointId => {
            const p = points[pointId];
            if (!p) return;

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
export function CloneShape(shape: Shape, paths: Record<string, Path>, points: Record<string, Point>) {
    // clone shape itself
    const newShape: Shape = {
        ...shape,
        pathIds: [...shape.pathIds] // just copy the IDs
    };

    // deep clone paths and points if needed
    const newPaths: Record<string, Path> = {};
    const newPoints: Record<string, Point> = {};

    shape.pathIds.forEach(pathId => {
        const path = paths[pathId];
        if (!path) return;

        // clone path
        const clonedPath: Path = {
            ...path,
            pointIds: [...path.pointIds]
        };
        newPaths[pathId] = clonedPath;

        // clone points
        path.pointIds.forEach(pointId => {
            const pt = points[pointId];
            if (!pt) return;

            newPoints[pointId] = {
                id: crypto.randomUUID(),
                x: pt.x,
                y: pt.y,
                in: pt.in ? { x: pt.in.x, y: pt.in.y } : undefined,
                out: pt.out ? { x: pt.out.x, y: pt.out.y } : undefined
            };
        });
    });

    return { shape: newShape, paths: newPaths, points: newPoints };
}
export function cubicBezierPoint(t: number, p0: Vec2, c1: Vec2, c2: Vec2, p3: Vec2): Vec2 {
    const u = 1 - t;
    return {
        x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
        y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y
    };
}