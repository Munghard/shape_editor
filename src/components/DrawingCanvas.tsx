import React, { useEffect, useRef, useState } from "react"
import getHoveredSegment, { lerp, lerpVec2 } from "../Utilities/Utilities";
import { ClearGrid, DrawGrid } from "./Grid";
import { DrawShape, type Shape, type Vector2 } from "./Shape";


type Tool = "Select" | "Move" | "Insert" | "Delete";

export default function DrawingCanvas() {
    // File
    const [fileName, setFileName] = useState<string>("Image");


    // Colors
    const [fillColor, setFillColor] = useState<string>("#afafff");
    const [strokeColor, setStrokeColor] = useState<string>("#ffffff");
    const [bgColor, setBgColor] = useState<string>("#282828");

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null);

    const [shape, setShape] = useState<Shape>({ points: [] });
    const [cyclic, setCyclic] = useState<boolean>(true);

    const [showGrid, setShowGrid] = useState<boolean>(true);
    const [snapToGrid, setSnapToGrid] = useState<boolean>(false);
    const [gridSubdivions, setGridSubdivions] = useState<number>(8);

    const [selectedSegment, setSelectedSegment] = useState<number>(-1);

    const [showKnobs, setShowKnobs] = useState<boolean>(true);
    const [knobSize, setKnobSize] = useState<number>(16);

    //STROKE

    const [useStroke, setUseStroke] = useState<boolean>(true);
    const [strokeWidth, setStrokeWidth] = useState<number>(4);

    //FILL
    const [useFill, setUseFill] = useState<boolean>(true);

    const [selectedPointIndex, setSelectedPointIndex] = useState<number>(-1);
    const [selectedPoint, setSelectedPoint] = useState<Vector2 | null>(shape ? shape.points[selectedPointIndex] : { x: 0, y: 0 });


    const [tool, setTool] = useState<Tool>("Select");

    const canvasWidth = 512 * 1;
    const canvasHeight = 512 * 1;

    useEffect(() => {
        if (shape) {
            DrawShape(shape, cyclic, canvasWidth, canvasHeight, strokeColor, useStroke, strokeWidth, fillColor, useFill);
        }
        const canvas = document.getElementById("Canvas");
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        setCanvasRect(rect);
    }, [shape, knobSize, strokeWidth, cyclic, strokeColor, fillColor, useStroke, useFill]);

    useEffect(() => {
        if (showGrid) {
            DrawGrid(gridSubdivions, canvasWidth, canvasHeight);
        }
        else {
            ClearGrid(canvasWidth, canvasHeight);
        }
    }, [showGrid, gridSubdivions]);

    useEffect(() => {
        if (shape && selectedPointIndex != null && shape.points[selectedPointIndex]) {
            setSelectedPoint(shape.points[selectedPointIndex]);
        } else {
            setSelectedPoint(null);
        }
    }, [selectedPointIndex, shape]);

    useEffect(() => {
        console.log("Tool set to: " + tool)
    }, [tool]);


    function handleRemovePoint(index: number) {
        setShape(prev => ({
            points: (prev?.points ?? []).filter(
                (_p, i) => i !== index)
        }));

        if (selectedPointIndex === index) {
            if (shape !== null) {
                setSelectedPointIndex(shape.points.length - 2);
            }
        }
    }

    function handleMouseMove(e: React.DragEvent<HTMLCanvasElement>) {

        const rect = e.currentTarget.getBoundingClientRect();

        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        const threshold = 10; // pixels
        var seg = getHoveredSegment(shape, threshold, x, y);
        setSelectedSegment(seg);
        console.log("segment: " + seg);


        // get overlay canvas
        var canvas = document.getElementById("CanvasOverlay") as HTMLCanvasElement;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // we are hovering a valid segment
        if (seg !== -1) {
            // draw a knob in the middle
            var start = shape.points[seg];
            var end = shape.points[seg + 1];
            var pos = lerpVec2(start, end, 0.5);
            ctx.beginPath();
            ctx.strokeStyle = "green";
            ctx.arc(pos.x, pos.y, threshold, Math.PI * 2, 0);
            ctx.closePath();
            ctx.stroke();
        }
    }

    function MovePoint(pointIndex: number, newPoint: Vector2) {

        setShape(prev => {
            const updatedPoints = prev.points.map((p, i) =>
                i === pointIndex ? { x: newPoint.x, y: newPoint.y } : p
            );
            return { ...prev, points: updatedPoints };
        });
        setSelectedPointIndex(pointIndex);
    }

    function handleCreatePoint(e: React.MouseEvent<HTMLCanvasElement>) {

        const rect = e.currentTarget.getBoundingClientRect();

        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        if (selectedSegment !== -1) {
            var start = shape.points[selectedSegment];
            var end = shape.points[selectedSegment + 1];
            var pos = lerpVec2(start, end, 0.5);
            insertPointAt(selectedSegment, pos.x, pos.y);
            setSelectedPointIndex(selectedSegment + 1);
        }
        else {
            // CREATE POINT
            if (snapToGrid) {
                const gridSizeX = canvasWidth / gridSubdivions;
                const gridSizeY = canvasHeight / gridSubdivions;

                x = Math.round(x / gridSizeX) * gridSizeX;
                y = Math.round(y / gridSizeY) * gridSizeY;
            }

            setShape(prev => {
                const newPoint = { x, y };
                const points = [...prev.points];

                // Insert at selected index if valid
                if (selectedPointIndex >= 0 && selectedPointIndex < points.length) {
                    points.splice(selectedPointIndex, 0, newPoint);
                } else {
                    points.push(newPoint); // fallback to append
                }

                return { points };
            });


            setSelectedPointIndex(selectedPointIndex);
        }
    }

    function insertPointAt(index: number, x: number, y: number) {
        setShape(prev => {
            const newPoints = [...prev.points];
            newPoints.splice(index + 1, 0, { x, y });

            return { ...prev, points: newPoints };
        });
    }

    function handleLineWidth(e: React.ChangeEvent<HTMLInputElement, Element>) {
        setStrokeWidth(Number(e.target.value))
    }

    function handleKnobSize(e: React.ChangeEvent<HTMLInputElement, Element>) {
        setKnobSize(Number(e.target.value))
    }

    function handleSelectPoint(e: React.ChangeEvent<HTMLInputElement, HTMLInputElement>): void {

        var index = Number(e.target.value);
        var points = shape.points.length;
        index = (index + points) % points;
        if (shape && shape.points.length > index && index > -1) {

            setSelectedPointIndex(index)
            setSelectedPoint(shape.points[index]);
        }
    }

    function startDragging(index: number) {

        function onMouseMove(e: MouseEvent) {
            const rect = canvasRef.current!.getBoundingClientRect();

            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;

            if (snapToGrid) {
                const gridSizeX = canvasWidth / gridSubdivions;
                const gridSizeY = canvasHeight / gridSubdivions;

                x = Math.round(x / gridSizeX) * gridSizeX;
                y = Math.round(y / gridSizeY) * gridSizeY;
            }
            MovePoint(index, { x, y });
        }

        function onMouseUp() {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }

    function handleScroll(e: React.WheelEvent<HTMLCanvasElement>): void {
        return;
        var ctx = e.currentTarget.getContext("2d");
        if (!ctx) return;
        ctx.scale(e.deltaY, e.deltaY)
    }

    function ExportShape(e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        const canvas = document.getElementById("Canvas") as HTMLCanvasElement;
        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = fileName + ".png"
        link.click();
    }

    return (
        <>
            {/* Knobs */}
            <div className="flex flex-row gap-4">
                {/* Tools */}
                <div className="panel ">
                    <div className="flex flex-col gap-2">
                        <h2>Tools</h2>
                        <button className={`${tool === "Select" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Select")} title="Select"><i className="fa-solid fa-arrow-pointer"></i></button>
                        <button className={`${tool === "Move" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Move")} title="Move"><i className="fa-solid fa-arrows-up-down-left-right"></i></button>
                        <button className={`${tool === "Insert" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Insert")} title="Insert"><i className="fa-regular fa-hand-point-left"></i></button>
                        <button className={`${tool === "Delete" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Delete")} title="Delete"><i className="fa-solid fa-eraser"></i></button>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div id="CombinedCanvas" className="relative inline-block">

                        {showKnobs &&
                            shape && shape.points.map((p, i) => {
                                if (canvasRect == null) return;
                                const selected = selectedPointIndex === i;
                                const last = shape.points.length - 1 === i;
                                const first = 0 === i;
                                var _knobSize = selected ? knobSize * 2 : knobSize;
                                var bgColor =
                                    selected ? 'bg-lime-500/80' :
                                        last ? 'bg-red-500/80' :
                                            first ? ' bg-amber-300/50' :
                                                ' bg-blue-300/50';

                                var bgHoverColor =
                                    selected ? 'hover:bg-lime-200/80' :
                                        last ? 'hover:bg-pink-500/80' :
                                            first ? ' hover:bg-yellow-300/50' :
                                                'hover:bg-cyan-300/50'

                                const x = p.x - (_knobSize * 0.5);
                                const y = p.y - (_knobSize * 0.5);
                                return (
                                    <div
                                        key={i}
                                        onMouseDown={() => { startDragging(i); setSelectedPointIndex(i); }}
                                        style={{
                                            top: y,
                                            left: x,
                                            width: _knobSize,
                                            height: _knobSize
                                        }}
                                        className={
                                            `
                                rounded-full
                                absolute z-9999
                                ${bgColor}
                                ${bgHoverColor}
                                border-2 
                                border-white/50
                                hover:border-white
                                `
                                        }></div>
                                )
                            })
                        }

                        {/* Canvas */}
                        <div style={{ width: canvasWidth, height: canvasHeight }} className="relative">

                            <canvas
                                id="CanvasOverlay"
                                width={canvasWidth}
                                height={canvasHeight}
                                style={{ top: 0, left: 0 }}
                                className="absolute  pointer-events-none z-20"
                            />
                            <canvas
                                onClick={handleCreatePoint}
                                onMouseMove={handleMouseMove}
                                onWheel={handleScroll}
                                id="Canvas"
                                ref={canvasRef}
                                width={canvasWidth}
                                height={canvasHeight}
                                style={{ top: 0, left: 0 }}
                                className="border border-black  absolute z-10"
                            />
                            <canvas
                                id="CanvasGrid"
                                width={canvasWidth}
                                height={canvasHeight}
                                style={{ top: 0, left: 0, background: `${bgColor}` }}
                                className="absolute pointer-events-none z-0 "
                            />
                        </div>
                    </div>



                </div>

                {/* Controls */}
                <div className=" panel">

                    {/* Selected point */}
                    <div className=" panel2">
                        <h2 >Selected point</h2>
                        <div className="flex flex-row gap-2 ">
                            <input className="w-16" type="number" value={selectedPointIndex} onChange={handleSelectPoint}></input>
                            <button onClick={() => handleRemovePoint(selectedPointIndex)}>Delete point</button>
                        </div>
                        {selectedPointIndex !== -1 && selectedPoint && shape &&
                            (
                                <>
                                    <div className="flex flex-row gap-2">
                                        <label>X:</label>
                                        <input
                                            type="number"
                                            value={selectedPoint.x.toFixed(3)}
                                            onChange={(e) =>
                                                MovePoint(
                                                    selectedPointIndex,
                                                    { x: Number(e.target.value), y: selectedPoint.y }
                                                )}
                                        ></input>
                                    </div>
                                    <div className="flex flex-row gap-2">
                                        <label>Y:</label>
                                        <input
                                            type="number"
                                            value={selectedPoint.y.toFixed(3)}
                                            onChange={(e) =>
                                                MovePoint(
                                                    selectedPointIndex,
                                                    { x: selectedPoint.x, y: Number(e.target.value) }
                                                )}
                                        ></input>
                                    </div>
                                </>
                            )
                        }
                    </div>
                    <div className="panel2">

                        <h2>Color</h2>

                        {/* Line color */}
                        <div className="flex flex-col ">
                            <label>Stroke</label>
                            <div className="flex flex-row gap-2 ">

                                <input className="colorSelect" type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} />
                                <input type="checkbox" checked={useStroke} onChange={(e) => setUseStroke(e.target.checked)} />
                            </div>
                        </div>

                        {/* fill color */}
                        <div className="flex flex-col ">
                            <label>Fill</label>
                            <div className="flex flex-row gap-2 ">
                                <input className="colorSelect" type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)} />
                                <input type="checkbox" checked={useFill} onChange={(e) => setUseFill(e.target.checked)} />
                            </div>
                        </div>

                        {/* bg color */}
                        <div className="flex flex-col ">
                            <label>Background</label>
                            <input className="colorSelect" type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
                        </div>
                    </div>
                    <div className="panel2">

                        <h2>Shape</h2>
                        {/* Line width */}
                        <div className="flex flex-col ">
                            <label>Stroke width</label>
                            <input type="range" value={strokeWidth} min={1} max={128} onChange={handleLineWidth} />
                        </div>

                        {/* Toggle cyclic */}
                        <div className="flex flex-row gap-2 ">
                            <label>Closed shape</label>
                            <input type="checkbox" checked={cyclic} onChange={(e) => setCyclic(e.target.checked)} />
                        </div>
                    </div>
                    <div className="panel2">

                        <h2>Knobs</h2>
                        {/* Knob size */}
                        <div className="flex flex-row gap-2">
                            <label>Show knobs</label>
                            <input type="checkbox" checked={showKnobs} onChange={(e) => setShowKnobs(e.target.checked)} />
                        </div>
                        <div className="flex flex-col ">
                            <label>Knob size</label>
                            <input type="range" value={knobSize} min={8} max={64} onChange={handleKnobSize} />
                        </div>

                    </div>

                    <div className="panel2">

                        <h2>Grid</h2>
                        {/* Toggle grid */}
                        <div className="flex flex-row gap-2 ">
                            <label>Show grid</label>
                            <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                        </div>
                        {/* Snap to grid */}
                        <div className="flex flex-row gap-2 ">
                            <label>Snap to grid</label>
                            <input type="checkbox" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} />
                        </div>
                        {/* Grid subd */}
                        <div className="flex flex-col ">
                            <label>Grid subdivision</label>
                            <input type="range" value={gridSubdivions} min={2} max={128} onChange={(e) => setGridSubdivions(Number(e.target.value))} />
                        </div>
                    </div>
                    <div className="panel2">

                        <h2>Export</h2>
                        {/* Export */}
                        <div className="flex flex-row gap-2 ">
                            <label>Filename:
                            </label>
                            <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)}></input>
                        </div>
                        <button onClick={ExportShape}>Export</button>
                    </div>
                </div>
            </div>
        </>
    )
}