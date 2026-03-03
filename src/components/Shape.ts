import type { Camera } from "./Camera";

export type Shape = {
    paths: {
        points: Point[];
        isHole: boolean;
    }[]

    cyclic: boolean;

    strokeWidth: number;
    strokeColor: string;
    useStroke: boolean;

    fillColor: string;
    useFill: boolean;
}
export type Point = {
    x: number;
    y: number;
}

export function CreateDefaultShape(): Shape {
    return {
        paths: [{
            points: [],
            isHole: false,
        }],
        cyclic: true,
        fillColor: '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0'),
        strokeColor: "#ffffff",
        strokeWidth: 4,
        useFill: true,
        useStroke: true
    }

}

export function DrawShape(ctx: CanvasRenderingContext2D, shape: Shape, camera: Camera) {
    if (shape.paths.length === 0) return;

    ctx.beginPath();
    ctx.setTransform(
        camera.zoom,
        0, 0,
        camera.zoom,
        -camera.x * camera.zoom,
        -camera.y * camera.zoom
    )

    shape.paths.forEach(path => {
        const points = path.points;
        if (points.length === 0) return;

        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }

        if (shape.cyclic) {
            ctx.closePath();
        }
    });

    ctx.lineWidth = shape.strokeWidth;
    ctx.strokeStyle = shape.strokeColor;
    ctx.fillStyle = shape.fillColor;
    ctx.lineJoin = "round"
    ctx.lineCap = "round"

    if (shape.useFill) {
        ctx.fill("evenodd"); // THIS is where holes work
    }

    if (shape.useStroke) {
        ctx.stroke();
    }
}