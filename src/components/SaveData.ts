import type { Path, Point, Shape } from "./Shape"

export type SaveData = {
    id: string;
    fileName: string;
    shapeOrder: string[],
    shapes: Record<string, Shape>;
    paths: Record<string, Path>;
    points: Record<string, Point>;

    gridSubd: number;
    useGrid: boolean;
    snapGrid: boolean;
}