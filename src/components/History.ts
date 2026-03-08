import type { Path, Point, Shape } from "./Shape";

export type HistoryState = {
    shapeOrder: string[];
    shapes: Record<string, Shape>;
    paths: Record<string, Path>;
    points: Record<string, Point>;
};

export type History = {
    past: HistoryState[];
    present: HistoryState;
    future: HistoryState[];
};