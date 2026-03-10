import type { Shape } from "../Editor/Shape"

export type SaveData = {
    id: string;
    fileName: string;
    shapes: Shape[];

    gridSubd: number;
    useGrid: boolean;
    snapGrid: boolean;
}