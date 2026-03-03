export function ClearGrid(canvasWidth: number, canvasHeight: number) {
    const canvas = document.getElementById("CanvasGrid") as HTMLCanvasElement;
    canvas.getContext("2d")?.clearRect(0, 0, canvasWidth, canvasHeight);
}

export function DrawGrid(subdivision: number, canvasWidth: number, canvasHeight: number) {
    var c = document.getElementById("CanvasGrid") as HTMLCanvasElement;
    if (!c) return;

    var ctx = c.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.beginPath();

    for (let x = 0; x < subdivision; x++) {
        var step = canvasWidth / subdivision;
        var xPos = x * step;
        ctx.moveTo(xPos, 0);
        ctx.lineTo(xPos, canvasHeight);
        ctx.strokeStyle = "gray";
        // ctx.strokeText(`${xPos.toFixed(1)}`, xPos + 2, 10);
    }

    for (let y = 0; y < subdivision; y++) {
        var step = canvasHeight / subdivision;
        var yPos = y * step;
        ctx.moveTo(0, yPos);
        ctx.lineTo(canvasWidth, yPos);
        ctx.strokeStyle = "gray";
        // ctx.strokeText(`${yPos.toFixed(1)}`, 2, yPos - 2);
    };
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.stroke();
}