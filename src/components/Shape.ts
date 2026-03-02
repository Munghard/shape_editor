export type Shape = {
    points: Vector2[];
}
export type Vector2 = {
    x: number;
    y: number;
}
export function DrawShape(shape: Shape, cyclic: boolean, canvasWidth: number, canvasHeight: number, strokeColor: string, useStroke: boolean, strokeWidth: number, fillColor: string, useFill: boolean) {
    if (shape.points.length <= 0) return;
    var c = document.getElementById("Canvas") as HTMLCanvasElement;
    if (!c) return;

    var ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.moveTo(shape.points[0].x, shape.points[0].y);

    for (let i = 1; i < shape.points.length; i++) {
        const p = shape.points[i];
        ctx.lineTo(p.x, p.y);
    };
    if (cyclic) {
        ctx.lineTo(shape.points[0].x, shape.points[0].y);
    }

    ctx.lineWidth = strokeWidth;

    if (useStroke) {
        ctx.stroke();
    }
    ctx.fillStyle = fillColor;
    if (useFill) {
        ctx.fill();
    }
}