import type { ToolEnum } from "./Main";

export function toolTooltip(tool: ToolEnum): string {
    switch (tool) {
        case "Select":
            return "Click to select point or shape, click again to select next path in shape";
        case "Delete":
            return "Click to delete point";
        case "Move":
            return "Drag to move selected shape, hold ctrl to move all shapes";
        case "Rotate":
            return "Drag to rotate selected shape, hold ctrl to rotate all shapes";
        case "Scale":
            return "Drag to scale selected shape, hold ctrl to scale all shapes";
        case "Insert":
            return "Click to insert point, shift click to create new shape, ctrl click to add new path/hole ";
        case "Pan":
            return "Drag to pan";
        case "Frame":
            return "Drag to scale frame, hold shift to scale uniformly, hold ctrl to move frame ";
    }
}