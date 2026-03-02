import type { Shape } from "./Shape"

export type SaveData = {
    fileName: string;
    shapes: Shape[];

    gridSubd: number;
    useGrid: boolean;
    snapGrid: boolean;
}