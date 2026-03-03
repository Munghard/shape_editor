import React, { useEffect, useRef, useState } from "react"
import { ClearCanvas, lerpVec2 } from "../Utilities/Utilities";
import { ClearGrid, DrawGrid } from "./Grid";
import { CreateDefaultShape, DrawShape, type Shape, type Point } from "./Shape";
import getHoveredSegment from "./Segment";
import { type SaveData } from "./SaveData";


type Tool = "Select" | "Move" | "Insert" | "Delete";

export default function DrawingCanvas() {
    // File
    const [fileName, setFileName] = useState<string>("Image");

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null);

    //SHAPE

    const [selectedShapeIndex, setSelectedShapeIndex] = useState<number>(0);
    const [shapes, setShapes] = useState<Shape[]>([CreateDefaultShape()]);

    const shape = shapes[selectedShapeIndex];

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
    const [selectedPathIndex, setSelectedPathIndex] = useState<number>(0);
    const [selectedPointIndex, setSelectedPointIndex] = useState<number>(0);
    const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);

    const [tool, setTool] = useState<Tool>("Select");

    const [selectedExportScale, setSelectedExportScale] = useState<string>("1");
    const canvasWidth = 512 * 1;
    const canvasHeight = 512 * 1;


    useEffect(() => {
        if (!shape) {
            setSelectedPoint(null);
            return;
        }

        const points = shape.paths[selectedPathIndex]?.points;
        if (!points || selectedPointIndex === null || selectedPointIndex < 0 || selectedPointIndex >= points.length) {
            setSelectedPoint(null);
        } else {
            setSelectedPoint(points[selectedPointIndex]);
        }
    }, [shape, selectedPathIndex, selectedPointIndex]);

    useEffect(() => {

        const canvas = document.getElementById("Canvas") as HTMLCanvasElement;
        if (!canvas) return;
        ClearCanvas(canvas, canvasWidth, canvasHeight);

        // DrawShape(shape, canvasWidth, canvasHeight);
        const c = document.getElementById("Canvas") as HTMLCanvasElement;
        if (!c) return;

        const ctx = c.getContext("2d") as CanvasRenderingContext2D;
        shapes.forEach(shape => DrawShape(ctx, shape));

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
        if (shape && selectedPointIndex != null && shape.paths[selectedPathIndex].points[selectedPointIndex]) {
            setSelectedPoint(shape.paths[selectedPathIndex].points[selectedPointIndex]);
        } else {
            setSelectedPoint(null);
        }
    }, [selectedPointIndex, shape]);


    useEffect(() => {
        console.log("Tool set to: " + tool)
    }, [tool]);


    function handleRemovePoint(index: number) {
        setShapes(prev =>
            prev.map((s, i) => {
                if (i !== selectedShapeIndex) return s;

                const newPaths = [...s.paths];
                const currentPath = newPaths[selectedPathIndex];

                const newPoints = currentPath.points.filter(
                    (_p, idx) => idx !== index
                );

                newPaths[selectedPathIndex] = {
                    ...currentPath,
                    points: newPoints
                };

                return { ...s, paths: newPaths };
            })
        );

        setSelectedPointIndex(prev => {
            if (prev === null) return 0;
            if (prev === index) return 0;
            if (prev > index) return prev - 1;
            return prev;
        });
    }

    function handleMouseMove(e: React.DragEvent<HTMLCanvasElement>) {

        const rect = e.currentTarget.getBoundingClientRect();

        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        const threshold = 10; // pixels
        var seg = getHoveredSegment(shape, threshold, x, y, selectedPathIndex);
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
            var start = shape.paths[selectedPathIndex].points[seg];
            var end = shape.paths[selectedPathIndex].points[seg + 1];
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

    function MovePoint(pointIndex: number, newPoint: Point) {

        setShapes(prev =>
            prev.map((s, i) => {
                if (i !== selectedShapeIndex) return s;

                const newPaths = [...s.paths];
                const currentPath = newPaths[selectedPathIndex];

                const newPoints = currentPath.points.map((p, j) =>
                    j === pointIndex ? { x: newPoint.x, y: newPoint.y } : p
                );

                newPaths[selectedPathIndex] = {
                    ...currentPath,
                    points: newPoints
                };

                return { ...s, paths: newPaths };
            })
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
            var start = shape.paths[selectedPathIndex].points[selectedSegment];
            var end = shape.paths[selectedPathIndex].points[selectedSegment + 1];
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
                    if (i !== selectedShapeIndex) return s;

                    const newPaths = [...s.paths];
                    const currentPath = newPaths[selectedPathIndex];

                    const newPoints = [...currentPath.points];

                    if (selectedPointIndex >= 0 && selectedPointIndex < newPoints.length) {
                        newPoints.splice(selectedPointIndex, 0, newPoint);
                    } else {
                        newPoints.push(newPoint);
                    }

                    newPaths[selectedPathIndex] = {
                        ...currentPath,
                        points: newPoints
                    }
                    return { ...s, paths: newPaths };
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
                if (i !== selectedShapeIndex) return s;

                const newPaths = [...s.paths];
                const currentPath = newPaths[selectedPathIndex];

                const newPoints = [...currentPath.points];
                newPoints.splice(index + 1, 0, newPoint);

                newPaths[selectedPathIndex] = {
                    ...currentPath,
                    points: newPoints
                };

                return { ...s, paths: newPaths };
            })
        );
    }


    function handleKnobSize(e: React.ChangeEvent<HTMLInputElement, Element>) {
        setKnobSize(Number(e.target.value))
    }

    function handleSelectPoint(e: React.ChangeEvent<HTMLInputElement, HTMLInputElement>): void {

        var index = Number(e.target.value);
        var points = shape.paths[selectedPathIndex].points.length;
        index = (index + points) % points;
        if (shape && shape.paths[selectedPathIndex].points.length > index && index > -1) {

            setSelectedPointIndex(index)
            setSelectedPoint(shape.paths[selectedPathIndex].points[index]);
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
        if (!canvas) return;

        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvasWidth * Number(selectedExportScale);
        tempCanvas.height = canvasHeight * Number(selectedExportScale);

        const ctx = tempCanvas.getContext("2d");
        if (!ctx) return;

        // scale context
        ctx.scale(Number(selectedExportScale), Number(selectedExportScale));

        // draw shapes onto temp canvas
        shapes.forEach(shape => DrawShape(ctx, shape)); // adjust DrawShape to accept ctx

        // Export
        const dataUrl = tempCanvas.toDataURL("image/png");
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
        setSelectedShapeIndex(shapes.length);
        setSelectedPathIndex(0);
    }

    function DeleteSelectedShape(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        setShapes(prev => [...prev.filter(s => s !== shape)]);
        setSelectedShapeIndex(prev => Math.max(prev - 1, 0));
    }

    // update shape helper
    function updateSelectedShape(updater: (shape: Shape) => Shape) {
        setShapes(prev =>
            prev.map((s, i) => (i === selectedShapeIndex ? updater(s) : s))
        );
    }

    function AddNewPath(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        setShapes(prev =>
            prev.map((s, i) => {
                if (i !== selectedShapeIndex) return s;

                const newPaths = [
                    ...s.paths,
                    { points: [], isHole: true }
                ];
                return { ...s, paths: newPaths }
            })

        );
        setSelectedPathIndex(shapes[selectedShapeIndex].paths.length);
    }
    function DeleteSelectedPath(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        setShapes(prev =>
            prev.map((s, i) => {
                if (i !== selectedShapeIndex) return s;

                const newPaths = [
                    ...s.paths.filter((_p, i) => i !== selectedPathIndex)
                ];
                return { ...s, paths: newPaths }
            })
        );
        setSelectedPathIndex(prev => Math.max(prev - 1, 0));
    }

    function moveForward() {
        setShapes(prev => {
            const index = selectedShapeIndex;
            if (index === -1 || index >= prev.length - 1) return prev;

            const copy = [...prev];
            [copy[index], copy[index + 1]] =
                [copy[index + 1], copy[index]];

            setSelectedShapeIndex(index + 1);
            return copy;
        });
    }
    function moveBackward() {
        setShapes(prev => {
            const index = selectedShapeIndex;
            if (index <= 0) return prev;

            const copy = [...prev];
            [copy[index], copy[index - 1]] =
                [copy[index - 1], copy[index]];

            setSelectedShapeIndex(index - 1);
            return copy;
        });
    }
    return (
        <>
            <div className="flex flex-row gap-4 justify-between ">
                {/* Tools */}
                <div id="TOOLS" className="panel  overflow-auto h-screen">
                    <div className="flex flex-col gap-2">
                        <h2>Tools</h2>
                        <button className={`${tool === "Select" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Select")} title="Select"><i className="fa-solid fa-arrow-pointer"></i></button>
                        <button className={`${tool === "Insert" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Insert")} title="Insert"><i className="fa-regular fa-hand-point-left"></i></button>
                        <button className={`${tool === "Move" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Move")} title="Move"><i className="fa-solid fa-arrows-up-down-left-right"></i></button>
                        <button className={`${tool === "Delete" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Delete")} title="Delete"><i className="fa-solid fa-eraser"></i></button>
                    </div>
                </div>
                <div id="middle_column" className="flex flex-col gap-2 justify-around ">
                    <div className='top-0 fixed'>
                        <h1 className='mb-10 text-zinc-400'>Shape editor</h1>
                    </div>
                    {/* Knobs */}
                    <div className="flex flex-col gap-4">
                        <div id="CombinedCanvas" className="relative inline-block">

                            {showKnobs &&
                                shape && shape.paths[selectedPathIndex].points.map((p, i) => {
                                    if (canvasRect == null) return;
                                    const selected = selectedPointIndex === i;
                                    var _knobSize = selected ? knobSize * 2 : knobSize;
                                    var bgColor =
                                        selected ? 'bg-zinc-200/90' :
                                            ' bg-zinc-200/50';

                                    var bgHoverColor =
                                        selected ? 'hover:bg-zinc-100/90' :
                                            'hover:bg-zinc-100/50'

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
                <div className="panel overflow-auto h-screen">
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
                        <p>Selected shape:
                            <input className="ml-2 w-[10ch]" type="number" value={selectedShapeIndex} min={0} max={shapes.length - 1} onChange={(e) => { setSelectedShapeIndex(Number(e.target.value)); setSelectedPathIndex(0); setSelectedPointIndex(0); }}></input>
                        </p>
                        <div className="flex flex-row gap-2">
                            <p>Order:</p>
                            <button onClick={moveForward}><i className="fa fa-arrow-up"></i></button>
                            <button onClick={moveBackward}><i className="fa fa-arrow-down"></i></button>
                        </div>
                        <div className="flex flex-row gap-2">
                            <p>Add/Remove shape:</p>
                            <button title="Add shape" onClick={AddNewShape}><i className="fa fa-circle-plus"></i></button>
                            <button title="Delete shape" onClick={DeleteSelectedShape}><i className="fa fa-circle-minus"></i></button>
                        </div>
                    </div>
                    <div className="panel2">


                        <h2>Paths</h2>
                        <p>Path:
                            <input className="ml-2 w-[10ch]" type="number" value={selectedPathIndex} min={0} max={shapes[selectedShapeIndex].paths.length - 1} onChange={(e) => setSelectedPathIndex(Number(e.target.value))}></input>
                        </p>
                        <div className="flex flex-row gap-2">
                            <button title="Add path" onClick={AddNewPath}><i className="fa fa-circle-plus"></i></button>
                            <button title="Delete path" onClick={DeleteSelectedPath}><i className="fa fa-circle-minus"></i></button>
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
                            <select
                                value={selectedExportScale}
                                onChange={e => setSelectedExportScale(e.target.value)}
                            >
                                <option value={"0.1"}>0.1x</option>
                                <option value={"0.25"}>0.25x</option>
                                <option value={"0.5"}>0.5x</option>
                                <option value={"1"}>1x</option>
                                <option value={"2"}>2x</option>
                                <option value={"4"}>4x</option>
                            </select>
                            <button title="Export/Download" onClick={ExportShape}><i className="fa-solid fa-download"></i></button>

                            <button title="Save" onClick={SaveShape}><i className="fa-solid fa-floppy-disk"></i></button>
                            <button title="Load" onClick={LoadShape}><i className="fa-solid fa-folder"></i></button>
                            <button title="New" onClick={() => { setShapes([CreateDefaultShape()]); setSelectedPointIndex(-1); setSelectedPathIndex(0); setSelectedShapeIndex(0) }}><i className="fa-solid fa-file"></i></button>
                        </div>
                    </div>
                </div>
            </div>

        </>
    )
}
