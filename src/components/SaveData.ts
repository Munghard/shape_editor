import type { Shape } from "./Shape"

export type SaveData = {
    id: string;
    fileName: string;
    shapes: Shape[];

    gridSubd: number;
    useGrid: boolean;
    snapGrid: boolean;
}