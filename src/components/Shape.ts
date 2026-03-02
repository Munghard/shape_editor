export type Shape = {
    points: Vector2[];

    cyclic: boolean;

    strokeWidth: number;
    strokeColor: string;
    useStroke: boolean;

    fillColor: string;
    useFill: boolean;
}
export type Vector2 = {
    x: number;
    y: number;
}
export function CreateDefaultShape(): Shape {
    return {
        points: [],
        cyclic: true,
        fillColor: '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0'),
        strokeColor: "#ffffff",
        strokeWidth: 4,
        useFill: true,
        useStroke: true
    }

}

export function DrawShape(shape: Shape) {
    if (shape.points.length <= 0) return;
    var c = document.getElementById("Canvas") as HTMLCanvasElement;
    if (!c) return;

    var ctx = c.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.strokeStyle = shape.strokeColor;
    ctx.moveTo(shape.points[0].x, shape.points[0].y);

    for (let i = 1; i < shape.points.length; i++) {
        const p = shape.points[i];
        ctx.lineTo(p.x, p.y);
    };
    if (shape.cyclic) {
        ctx.lineTo(shape.points[0].x, shape.points[0].y);
    }

    ctx.lineWidth = shape.strokeWidth;

    if (shape.useStroke) {
        ctx.stroke();
    }
    ctx.fillStyle = shape.fillColor;
    if (shape.useFill) {
        ctx.fill();
    }
}