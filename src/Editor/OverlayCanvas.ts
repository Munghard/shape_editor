import { worldToScreen } from "../Utilities/Utilities";
import type { Camera } from "../Editor/Camera";
import type { Point } from "./Shape";

export function DrawHandleLines(ctx: CanvasRenderingContext2D, point: Point, camera: Camera, canvas: HTMLCanvasElement) {
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]); // optional dashed lines

    const screenPoint = worldToScreen(point.x, point.y, camera, canvas);

    if (point.in) {
        const screenIn = worldToScreen(point.in.x, point.in.y, camera, canvas);
        ctx.beginPath();
        ctx.moveTo(screenPoint.x, screenPoint.y);
        ctx.lineTo(screenIn.x, screenIn.y);
        ctx.stroke();
    }

    if (point.out) {
        const screenOut = worldToScreen(point.out.x, point.out.y, camera, canvas);
        ctx.beginPath();
        ctx.moveTo(screenPoint.x, screenPoint.y);
        ctx.lineTo(screenOut.x, screenOut.y);
        ctx.stroke();
    }


    ctx.setLineDash([]);
}