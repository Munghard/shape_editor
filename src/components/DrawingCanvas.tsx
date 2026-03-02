import React, { useEffect, useRef, useState } from "react"
import { ClearCanvas, lerpVec2 } from "../Utilities/Utilities";
import { ClearGrid, DrawGrid } from "./Grid";
import { CreateDefaultShape, DrawShape, type Shape, type Vector2 } from "./Shape";
import getHoveredSegment from "./Segment";
import { type SaveData } from "./SaveData";


type Tool = "Select" | "Move" | "Insert" | "Delete";

export default function DrawingCanvas() {
    // File
    const [fileName, setFileName] = useState<string>("Image");

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null);

    //SHAPE

    const [shapeIndex, setShapeIndex] = useState<number>(0);
    const [shapes, setShapes] = useState<Shape[]>([CreateDefaultShape()]);

    const shape = shapes[shapeIndex];

    // VIEW
    const [bgColor, setBgColor] = useState<string>("#282828");
    const [zoom, setZoom] = useState<number>(1);
    const [showGrid, setShowGrid] = useState<boolean>(true);
    const [gridSubdivions, setGridSubdivisions] = useState<number>(8);

    const [selectedSegment, setSelectedSegment] = useState<number>(-1);

    const [showKnobs, setShowKnobs] = useState<boolean>(true);
    const [knobSize, setKnobSize] = useState<number>(16);
    const [snapToGrid, setSnapToGrid] = useState<boolean>(false);

    // EDITOR
    const [selectedPointIndex, setSelectedPointIndex] = useState<number>(-1);
    const [selectedPoint, setSelectedPoint] = useState<Vector2 | null>(shape ? shape.points[selectedPointIndex] : { x: 0, y: 0 });

    const [tool, setTool] = useState<Tool>("Select");

    const canvasWidth = 512 * 1;
    const canvasHeight = 512 * 1;

    useEffect(() => {

        const canvas = document.getElementById("Canvas") as HTMLCanvasElement;
        if (!canvas) return;
        ClearCanvas(canvas, canvasWidth, canvasHeight);

        // DrawShape(shape, canvasWidth, canvasHeight);
        shapes.forEach(shape => DrawShape(shape));


        const rect = canvas.getBoundingClientRect();
        setCanvasRect(rect);
    }, [shapes, knobSize]);

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
        setShapes(prev =>
            prev.map((s, i) =>
                i === shapeIndex
                    ? {
                        ...s,
                        points: s.points.filter((_p, idx) => idx !== index)
                    }
                    : s
            )
        );

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
        // console.log("segment: " + seg);


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
            ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
            ctx.fillStyle = "rgba(0, 255, 255, 0.3)";
            ctx.arc(pos.x, pos.y, threshold, Math.PI * 2, 0);
            ctx.fill();
            ctx.closePath();
            ctx.stroke();
        }
    }

    function MovePoint(pointIndex: number, newPoint: Vector2) {

        setShapes(prev =>
            prev.map((s, i) =>
                i === shapeIndex
                    ? {
                        ...s,
                        points: s.points.map((p, j) =>
                            j === pointIndex ? { x: newPoint.x, y: newPoint.y } : p
                        )
                    }
                    : s
            )
        );

        setSelectedPointIndex(pointIndex);
    }

    function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
        var co = document.getElementById("CanvasOverlay") as HTMLCanvasElement;
        ClearCanvas(co, canvasWidth, canvasHeight);

        handleCreatePoint(e);
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
            startDragging(selectedSegment + 1);
        }
        else {
            // CREATE POINT
            if (snapToGrid) {
                const gridSizeX = canvasWidth / gridSubdivions;
                const gridSizeY = canvasHeight / gridSubdivions;

                x = Math.round(x / gridSizeX) * gridSizeX;
                y = Math.round(y / gridSizeY) * gridSizeY;
            }
            const newPoint = { x, y };

            setShapes(prev =>
                prev.map((s, i) => {
                    if (i !== shapeIndex) return s;

                    const points = [...s.points];

                    if (selectedPointIndex >= 0 && selectedPointIndex < points.length) {
                        points.splice(selectedPointIndex, 0, newPoint);
                    } else {
                        points.push(newPoint);
                    }

                    return { ...s, points };
                })
            );


            setSelectedPointIndex(selectedPointIndex);
            startDragging(selectedPointIndex);
        }
    }

    function insertPointAt(index: number, x: number, y: number) {
        const newPoint = { x, y };

        setShapes(prev =>
            prev.map((s, i) => {
                if (i !== shapeIndex) return s;

                const newPoints = [...s.points];
                newPoints.splice(index + 1, 0, newPoint);

                return { ...s, points: newPoints };
            })
        );
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
        return; // not sure how to handle the zooming yet

        setZoom(prev => {
            const factor = 0.001; // scale down the delta
            let newZoom = prev - e.deltaY * factor; // subtract if you want scrolling up to zoom in
            newZoom = Math.max(0.1, Math.min(newZoom, 5)); // clamp between min/max zoom
            return newZoom;
        });
    }

    function ExportShape(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        const canvas = document.getElementById("Canvas") as HTMLCanvasElement;
        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = fileName + ".png"
        link.click();
    }

    function SaveShape(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        const saveData: SaveData = {
            fileName,
            shapes,
            useGrid: showGrid,
            snapGrid: snapToGrid,
            gridSubd: gridSubdivions
        }
        const json = JSON.stringify(saveData);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = fileName + ".json"
        link.click();

        // clean up
        URL.revokeObjectURL(url);
    }

    function LoadShape(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        // trigger file open dialog
        const input = document.createElement("input")
        input.type = "file";
        input.accept = ".json";
        input.click();

        input.onchange = (event: Event) => {
            const target = event.target as HTMLInputElement;
            if (!target.files || target.files.length === 0) return;

            const file = target.files[0];
            const reader = new FileReader();

            reader.onload = (evt) => {
                if (!evt.target) return;

                try {
                    const text = evt.target.result as string;
                    const loadData: SaveData = JSON.parse(text);

                    // Apply loaded data to state
                    setFileName(loadData.fileName);
                    setShapes(loadData.shapes);
                    setShowGrid(loadData.useGrid);
                    setSnapToGrid(loadData.snapGrid);
                    setGridSubdivisions(loadData.gridSubd);

                } catch (error) {
                    console.log("failed to load file.")
                }
            };
            reader.readAsText(file);
        }
    }

    function AddNewShape(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        const shape: Shape = CreateDefaultShape();

        setShapes(prev => [...prev, shape]);
        setShapeIndex(shapes.length);
    }

    function DeleteSelectedShape(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        setShapes(prev => [...prev.filter(s => s !== shape)]);
        setShapeIndex(prev => Math.max(prev - 1, 0));
    }

    // update shape helper
    function updateSelectedShape(updater: (shape: Shape) => Shape) {
        setShapes(prev =>
            prev.map((s, i) => (i === shapeIndex ? updater(s) : s))
        );
    }

    return (
        <>
            {/* Tools */}
            <div id="TOOLS" className="panel fixed left-0 top-0 overflow-auto h-screen">
                <div className="flex flex-col gap-2">
                    <h2>Tools</h2>
                    <button className={`${tool === "Select" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Select")} title="Select"><i className="fa-solid fa-arrow-pointer"></i></button>
                    <button className={`${tool === "Move" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Move")} title="Move"><i className="fa-solid fa-arrows-up-down-left-right"></i></button>
                    <button className={`${tool === "Insert" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Insert")} title="Insert"><i className="fa-regular fa-hand-point-left"></i></button>
                    <button className={`${tool === "Delete" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Delete")} title="Delete"><i className="fa-solid fa-eraser"></i></button>
                </div>
            </div>
            {/* Knobs */}
            <div className="flex flex-row gap-4">
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
                        <div style={{ width: canvasWidth, height: canvasHeight, scale: zoom }} className="relative" >

                            <canvas
                                id="CanvasOverlay"
                                width={canvasWidth}
                                height={canvasHeight}
                                style={{ top: 0, left: 0 }}
                                className="absolute  pointer-events-none z-20"
                            />
                            <canvas
                                onMouseDown={handleMouseDown}
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
            </div>

            {/* Controls */}
            <div className="panel fixed right-0 top-0 overflow-auto h-screen">
                {/* Selected point */}
                <div className="panel2">
                    <h2 >Selected point</h2>
                    <div className="flex flex-row gap-2 ">
                        <input className="w-[10ch]" type="number" value={selectedPointIndex} onChange={handleSelectPoint}></input>
                        <button title="Delete point" onClick={() => handleRemovePoint(selectedPointIndex)}><i className="fa-solid fa-x"></i></button>
                    </div>
                    {selectedPointIndex !== -1 && selectedPoint && shape &&
                        (
                            <div className="flex flex-row gap-2">
                                <div className="flex flex-row gap-2">
                                    <label>X:</label>
                                    <input
                                        className="w-[10ch]"
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
                                        className="w-[10ch]"
                                        type="number"
                                        value={selectedPoint.y.toFixed(3)}
                                        onChange={(e) =>
                                            MovePoint(
                                                selectedPointIndex,
                                                { x: selectedPoint.x, y: Number(e.target.value) }
                                            )}
                                    ></input>
                                </div>
                            </div>
                        )
                    }

                </div>
                <div className="panel2">

                    <h2>Shape</h2>
                    <p>Shapes: {shapes.length}</p>
                    <p>Current shape index: {shapeIndex}</p>
                    <input className="w-[10ch]" type="number" value={shapeIndex} min={0} max={shapes.length - 1} onChange={(e) => setShapeIndex(Number(e.target.value))}></input>
                    <div className="flex flex-row gap-2">
                        <button title="Add shape" onClick={AddNewShape}><i className="fa fa-circle-plus"></i></button>
                        <button title="Delete shape" onClick={DeleteSelectedShape}><i className="fa fa-circle-minus"></i></button>
                    </div>
                    {/* Line color */}
                    <div className="flex flex-col">
                        <label>Stroke</label>
                        <div className="flex flex-row gap-2">
                            <input
                                className="colorSelect"
                                type="color"
                                value={shape.strokeColor}
                                onChange={(e) =>
                                    updateSelectedShape(s => ({ ...s, strokeColor: e.target.value }))
                                }
                            />
                            <input
                                type="checkbox"
                                checked={shape.useStroke}
                                onChange={(e) =>
                                    updateSelectedShape(s => ({ ...s, useStroke: e.target.checked }))
                                }
                            />
                        </div>
                    </div>

                    {/* Fill color */}
                    <div className="flex flex-col">
                        <label>Fill</label>
                        <div className="flex flex-row gap-2">
                            <input
                                className="colorSelect"
                                type="color"
                                value={shape.fillColor}
                                onChange={(e) =>
                                    updateSelectedShape(s => ({ ...s, fillColor: e.target.value }))
                                }
                            />
                            <input
                                type="checkbox"
                                checked={shape.useFill}
                                onChange={(e) =>
                                    updateSelectedShape(s => ({ ...s, useFill: e.target.checked }))
                                }
                            />
                        </div>
                    </div>
                </div>

                {/* Line width */}
                <div className="flex flex-col">
                    <label>Stroke width</label>
                    <input
                        type="range"
                        value={shape.strokeWidth}
                        min={1}
                        max={128}
                        onChange={(e) =>
                            updateSelectedShape(s => ({ ...s, strokeWidth: Number(e.target.value) }))
                        }
                    />
                </div>

                {/* Toggle cyclic */}
                <div className="flex flex-row gap-2">
                    <label>Closed shape</label>
                    <input
                        type="checkbox"
                        checked={shape.cyclic}
                        onChange={(e) =>
                            updateSelectedShape(s => ({ ...s, cyclic: e.target.checked }))
                        }
                    />
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
                    {/* bg color */}
                    <div className="flex flex-col ">
                        <label>Background</label>
                        <input className="colorSelect" type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
                    </div>
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
                        <input type="range" value={gridSubdivions} min={2} max={128} onChange={(e) => setGridSubdivisions(Number(e.target.value))} />
                    </div>
                </div>

                <div className="panel2">

                    <h2>File</h2>
                    {/* Export */}
                    <div className="flex flex-row gap-2 ">
                        <label>Filename:
                        </label>
                        <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)}></input>
                    </div>

                    <div className="flex flex-row gap-2  ">
                        <button title="Export/Download" onClick={ExportShape}><i className="fa-solid fa-download"></i></button>
                        <button title="Save" onClick={SaveShape}><i className="fa-solid fa-floppy-disk"></i></button>
                        <button title="Load" onClick={LoadShape}><i className="fa-solid fa-folder"></i></button>
                        <button title="New" onClick={() => { setShapes((prev) => ({ ...prev, points: [] })); setSelectedPointIndex(-1); }}><i className="fa-solid fa-file"></i></button>
                    </div>
                </div>
            </div>
        </>
    )
}
