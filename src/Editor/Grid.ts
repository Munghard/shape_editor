import { APP_NAME } from "../Constants";
import { hexToRgba } from "../Utilities/Utilities";
import type { Camera } from "../Editor/Camera";

export function ClearGrid(ctx: CanvasRenderingContext2D) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
}

export function DrawGrid(ctx: CanvasRenderingContext2D, color: string, alpha: number, subdivision: number, camera: Camera) {
    const canvas = ctx.canvas;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // reset transform and clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    ctx.beginPath();

    // apply camera transform
    ctx.setTransform(
        camera.zoom,
        0, 0,
        camera.zoom,
        -camera.x * camera.zoom,
        -camera.y * camera.zoom
    );

    ctx.font = "120px Verdana";
    ctx.fillStyle = "rgb(60,60,60)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(APP_NAME, 0, 0);


    // define grid spacing in world units
    const spacing = 1000 / subdivision; // e.g., 100 world units per grid line

    // start lines at nearest multiple of spacing
    const startX = Math.floor(camera.x / spacing) * spacing;
    const startY = Math.floor(camera.y / spacing) * spacing;

    // draw vertical lines
    ctx.font = "16px Verdana";
    const endX = camera.x + canvasWidth / camera.zoom;
    for (let x = startX; x <= endX; x += spacing) {
        ctx.moveTo(x, camera.y);
        ctx.lineTo(x, camera.y + canvasHeight / camera.zoom);
        ctx.fillText(x.toFixed(1).toString(), x, camera.y + 30);
    }

    // draw horizontal lines
    const endY = camera.y + canvasHeight / camera.zoom;
    for (let y = startY; y <= endY; y += spacing) {
        ctx.moveTo(camera.x, y);
        ctx.lineTo(camera.x + canvasWidth / camera.zoom, y);
        ctx.fillText(y.toFixed(1).toString(), camera.x + 30, y);
    }
    const colorWithAlpha = hexToRgba(color, alpha);

    ctx.lineWidth = 1 / camera.zoom; // keep line width constant on zoom
    ctx.strokeStyle = colorWithAlpha;
    ctx.stroke();
}