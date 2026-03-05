
type HandleProps = {
    i: number
    x: number
    y: number
    size: number
    handleIn: boolean
    startHandleDrag: (e: React.MouseEvent, i: number, handleIn: boolean) => void
}

export function Handle({ i, x, y, size, handleIn, startHandleDrag }: HandleProps) {
    var knobSize = size;
    const knobX = x - (knobSize * 0.5);
    const knobY = y - (knobSize * 0.5);

    return (
        <div
            key={i}
            onMouseDown={(e) => startHandleDrag(e, i, handleIn)}
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
                bg-red-500/90
                hover:bg-red-200/90
                border-2
                border-black
                pointer-events-auto
                `
            }></div>
    )
}