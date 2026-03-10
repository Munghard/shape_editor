import type { Shape, Vec2 } from "../Editor/Shape";

export default function getHoveredSegment(shape: Shape, threshold: number, mouseX: number, mouseY: number, selectedPathIndex: number) {
    if (!shape) return -1;

    const points = shape.paths[selectedPathIndex].points;
    const n = points.length;
    if (n < 2) return -1;

    for (let i = 0; i < n; i++) { // loop all points
        const a = points[i];
        const b = points[(i + 1) % n]; // modulo to loop back to first

        const dist = distancePointToCubicBezier(mouseX, mouseY, a, a.out ?? a, b.in ?? b, b);

        if (dist < threshold) {
            return i; // insert after this index
        }
    }

    return -1;
}
function distancePointToCubicBezier(px: number, py: number, p0: Vec2, c1: Vec2, c2: Vec2, p3: Vec2): number {
    const steps = 20;
    let minDist = Infinity;

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const u = 1 - t;
        const x = u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x;
        const y = u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y;
        const dx = px - x;
        const dy = py - y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < minDist) minDist = d;
    }

    return minDist;
}
// function distanceToSegment(
//     px: number, py: number,
//     ax: number, ay: number,
//     bx: number, by: number
// ) {
//     const dx = bx - ax;
//     const dy = by - ay;

//     const lengthSquared = dx * dx + dy * dy;
//     if (lengthSquared === 0) {
//         // A and B are the same point
//         return Math.hypot(px - ax, py - ay);
//     }

//     // projection factor (0 → 1)
//     let t = ((px - ax) * dx + (py - ay) * dy) / lengthSquared;

//     // clamp to segment
//     t = Math.max(0, Math.min(1, t));

//     const closestX = ax + t * dx;
//     const closestY = ay + t * dy;

//     return Math.hypot(px - closestX, py - closestY);
// }