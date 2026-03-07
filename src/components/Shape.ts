
export type Vec2 = {
    x: number;
    y: number;
}
export type Rect = {
    x: number;
    y: number;
    w: number;
    h: number;
}
export type Path = {
    points: Point[];
    isHole: boolean;
}
export type Shape = {
    name: string;

    paths: Path[];
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
    in?: Vec2;
    out?: Vec2;
}

export function CreateEmptyPath(): Path {
    return {
        points: [],
        isHole: false,
    }
}
// Triangle
export function CreateTriangle(): Path {
    return {
        points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 25, y: 50 }],
        isHole: false
    }
};
// Square
export function CreateSquare(): Path {
    return {
        points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }, { x: 0, y: 50 }],
        isHole: false
    }
};
// Circle
export function CreateCircle(): Path {
    return CirclePath(50, 32);

};
export function CirclePath(radius = 50, segments = 32): Path {
    const points: Point[] = [];
    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        points.push({
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        });
    }
    return {
        points,
        isHole: false
    };
}

export function CreateBaseShape(paths: Path[] = [CreateEmptyPath()]): Shape {

    return {
        name: "shape",
        paths,
        cyclic: true,
        fillColor: '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0'),
        strokeColor: "#ffffff",
        strokeWidth: 4,
        useFill: true,
        useStroke: true
    }

}

export function DrawShape(ctx: CanvasRenderingContext2D, shape: Shape) {
    if (shape.paths.length === 0) return;

    ctx.beginPath();

    shape.paths.forEach(path => {
        const points = path.points;
        if (points.length === 0) return;

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
            ctx.closePath();
        }
    });

    ctx.lineWidth = shape.strokeWidth;
    ctx.strokeStyle = shape.strokeColor;
    ctx.fillStyle = shape.fillColor;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (shape.useFill) ctx.fill("evenodd");
    if (shape.useStroke) ctx.stroke();
}