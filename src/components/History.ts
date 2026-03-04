import type { Shape } from "./Shape";

export type HistoryState = {
    shapes: Shape[];
};

export type History = {
    past: HistoryState[];
    present: HistoryState;
    future: HistoryState[];
};