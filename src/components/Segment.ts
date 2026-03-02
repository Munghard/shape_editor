import type { Shape } from "../components/Shape";

export default function getHoveredSegment(icon: Shape, threshold: number, mouseX: number, mouseY: number) {
    if (!icon) return -1;

    for (let i = 0; i < icon.points.length - 1; i++) {
        const a = icon.points[i];
        const b = icon.points[i + 1];

        const dist = distanceToSegment(
            mouseX, mouseY,
            a.x, a.y,
            b.x, b.y
        );

        if (dist < threshold) {
            return i; // insert after this index
        }
    }

    return -1;
}
function distanceToSegment(
    px: number, py: number,
    ax: number, ay: number,
    bx: number, by: number
) {
    const dx = bx - ax;
    const dy = by - ay;

    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) {
        // A and B are the same point
        return Math.hypot(px - ax, py - ay);
    }

    // projection factor (0 → 1)
    let t = ((px - ax) * dx + (py - ay) * dy) / lengthSquared;

    // clamp to segment
    t = Math.max(0, Math.min(1, t));

    const closestX = ax + t * dx;
    const closestY = ay + t * dy;

    return Math.hypot(px - closestX, py - closestY);
}