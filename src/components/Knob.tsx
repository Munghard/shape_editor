import type { Tool } from "./Main";

type KnobProps = {
    id: string
    x: number
    y: number
    size: number
    selected: boolean
    tool: Tool
    handleKnobMouseDown: (e: React.MouseEvent<HTMLDivElement, MouseEvent>, id: string) => void
}

export function Knob({ id, x, y, size, selected, tool, handleKnobMouseDown }: KnobProps) {
    var knobSize = selected ? size * 2 : size;
    const knobX = x - (knobSize * 0.5);
    const knobY = y - (knobSize * 0.5);
    var bgColor =
        selected ? 'bg-zinc-200/90' :
            ' bg-zinc-200/50';

    var bgHoverColor =
        selected ? 'hover:bg-zinc-100/90' :
            'hover:bg-zinc-100/50'
    return (
        <div
            key={id}
            onMouseDown={(e) => handleKnobMouseDown(e, id)}
            style={{
                left: knobX,
                top: knobY,
                width: knobSize,
                height: knobSize
            }}
            className={
                `
                rounded-full
                absolute z-9999
                ${bgColor}
                ${bgHoverColor}
                border-2 
                border-black
                pointer-events-auto
                ${tool === "Delete" ? "cursor-crosshair" : "cursor-pointer"}
                `
            }></div>
    )
}