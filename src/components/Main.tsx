import React, { useEffect, useRef, useState } from "react"
import { ClearCanvas, lerpVec2, screenToWorld, worldToScreen } from "../Utilities/Utilities";
import { ClearGrid, DrawGrid } from "./Grid";
import { CreateDefaultShape, DrawShape, type Shape, type Point } from "./Shape";
import getHoveredSegment from "./Segment";
import { type SaveData } from "./SaveData";

type Tool = "Select" | "Move" | "Insert" | "Delete" | "Pan";

export default function Main() {
    // File
    const [fileName, setFileName] = useState<string>("Image");

    // CANVAS
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null);

    //SHAPE
    const [selectedShapeIndex, setSelectedShapeIndex] = useState<number>(0);
    const [shapes, setShapes] = useState<Shape[]>([]);

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

    // CAMERA

    const lastMouseRef = useRef<{ x: number; y: number } | null>(null)
    const cameraRef = useRef({
        x: 0,
        y: 0,
        zoom: 1,
    })
    // EDITOR
    const MAX_RECENT = 5;
    const RECENTFILESKEY = "recentFiles";
    const [recentFiles, setRecentFiles] = useState<SaveData[]>([]);

    const [selectedPathIndex, setSelectedPathIndex] = useState<number>(0);
    const [selectedPointIndex, setSelectedPointIndex] = useState<number>(-1);
    const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);

    const [tool, setTool] = useState<Tool>("Select");

    const [selectedExportScale, setSelectedExportScale] = useState<string>("1");
    const canvasWidth = 512 * 1;
    const canvasHeight = 512 * 1;

    // DRAG
    const [dragging, setDragging] = useState<boolean>(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    // RECENT FILES
    useEffect(() => {
        const stored = localStorage.getItem(RECENTFILESKEY);
        let filesAsStrings: string[] = stored ? JSON.parse(stored) : [];

        let files: SaveData[] = filesAsStrings.map(f => JSON.parse(f));
        setRecentFiles(files);
        // console.log(files);
    }, [shape]);

    // SELECTED POINT
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

    // DRAW
    useEffect(() => {
        Draw();
        const canvas = document.getElementById("Canvas") as HTMLCanvasElement;
        const rect = canvas.getBoundingClientRect();
        setCanvasRect(rect);

    }, [shapes, knobSize]);

    function Draw() {

        const canvas = document.getElementById("Canvas") as HTMLCanvasElement;
        if (!canvas) return;

        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

        ClearCanvas(ctx);
        shapes.forEach(shape => DrawShape(ctx, shape, cameraRef.current));
    }

    // DRAW GRID
    useEffect(() => {
        if (showGrid) {
            ReDrawGrid();
        }
        else {
            var c = document.getElementById("CanvasGrid") as HTMLCanvasElement;
            var ctx = c.getContext("2d") as CanvasRenderingContext2D;
            ClearGrid(ctx);
        }
    }, [showGrid, gridSubdivions]);

    // SET SELECTED POINT
    useEffect(() => {
        if (shape && selectedPointIndex != null && shape.paths[selectedPathIndex].points[selectedPointIndex]) {
            setSelectedPoint(shape.paths[selectedPathIndex].points[selectedPointIndex]);
        } else {
            setSelectedPoint(null);
        }
    }, [selectedPointIndex, shape]);

    // RESIZE CANVASES
    useEffect(() => {
        resizeCanvases();
        window.addEventListener("resize", resizeCanvases);
        return () => window.removeEventListener("resize", resizeCanvases);
    }, []);

    function ReDrawGrid() {
        var c = document.getElementById("CanvasGrid") as HTMLCanvasElement;
        var ctx = c.getContext("2d") as CanvasRenderingContext2D;
        ClearCanvas(ctx);
        DrawGrid(ctx, gridSubdivions, cameraRef.current);
    }

    function resizeCanvases() {
        if (!canvasRef.current) return;

        const canvases = [
            canvasRef.current,
            document.getElementById("CanvasOverlay") as HTMLCanvasElement,
            document.getElementById("CanvasGrid") as HTMLCanvasElement
        ];

        const parent = canvasRef.current.parentElement!;
        const dpr = window.devicePixelRatio || 1;

        canvases.forEach(canvas => {
            if (!canvas) return;
            canvas.width = parent.clientWidth * dpr;
            canvas.height = parent.clientHeight * dpr;

            canvas.style.width = `${parent.clientWidth}px`;
            canvas.style.height = `${parent.clientHeight}px`;

            const ctx = canvas.getContext("2d");
            if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        });

        Draw(); // redraw after resizing
        if (showGrid) ReDrawGrid();
    }

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

        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();

        let screenX = e.clientX - rect.left;
        let screenY = e.clientY - rect.top;

        if (tool === "Pan" && dragging && lastMouseRef.current) {
            if (!lastMouseRef.current) return

            // delta in screen pixels
            const dx = screenX - lastMouseRef.current.x;
            const dy = screenY - lastMouseRef.current.y;

            // convert to world units by dividing by zoom once
            cameraRef.current.x -= dx / cameraRef.current.zoom;
            cameraRef.current.y -= dy / cameraRef.current.zoom;

            lastMouseRef.current = { x: screenX, y: screenY }

            Draw()
            ReDrawGrid();
            // console.log(cameraRef.current.x, cameraRef.current.y)
        }
        if (tool === "Move") {
            // return if no shape selected
            if (!shape) return;
            // move all points in paths in shape
            if (dragging) {
                const dx = (screenX - dragOffset.current.x) / cameraRef.current.zoom;
                const dy = (screenY - dragOffset.current.y) / cameraRef.current.zoom;

                setShapes(prev => {
                    const copy = [...prev];
                    const shape = copy[selectedShapeIndex];

                    shape.paths.forEach(path =>
                        path.points.forEach(pt => {
                            pt.x += dx / 2;
                            pt.y += dy / 2;
                        })
                    );

                    return copy;
                });
                dragOffset.current = { x: screenX, y: screenY };
                Draw();
                ReDrawGrid();
            }
        }

        else if (tool === "Insert") {

            const threshold = 10; // pixels
            const worldPos = screenToWorld(screenX, screenY, cameraRef.current);
            var seg = getHoveredSegment(shape, threshold, worldPos.x, worldPos.y, selectedPathIndex);
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
                const path = shape.paths[selectedPathIndex];
                const n = path.points.length;
                const start = path.points[seg];
                const end = path.points[(seg + 1) % n]; // loops back to first point if last

                var pos = lerpVec2(start, end, 0.5);
                const { x, y } = worldToScreen(pos.x, pos.y, cameraRef.current);
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.beginPath();
                ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
                ctx.lineWidth = 2;
                ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
                ctx.arc(x, y, threshold, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        }
    }

    function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
        const rect = e.currentTarget.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        var ctx = e.currentTarget.getContext("2d") as CanvasRenderingContext2D;

        if (tool === "Pan") {
            lastMouseRef.current = { x: screenX, y: screenY }
        }
        if (tool === "Select" || tool === "Move") {
            selectShapeAt(ctx, screenX, screenY);
        }
        else if (tool === "Insert") {
            var co = document.getElementById("CanvasOverlay") as HTMLCanvasElement;
            var coctx = co.getContext("2d") as CanvasRenderingContext2D;
            ClearCanvas(coctx);
            handleCreatePoint(e);
        }

        if (selectedShapeIndex !== -1) { // this doesnt work because selectedshapeindex is never -1 so drag is always set on click

            dragOffset.current = { x: screenX, y: screenY };
        }
        setDragging(true);
    }
    function handleMouseUp(_e: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
        setDragging(false);
    }

    function selectShapeAt(ctx: CanvasRenderingContext2D, x: number, y: number) {
        setSelectedShapeIndex(-1);
        setSelectedPathIndex(-1);
        setSelectedPointIndex(-1);

        for (let i = shapes.length - 1; i >= 0; i--) {
            buildPath(ctx, shapes[i]);
            if (ctx.isPointInPath(x, y)) {
                setSelectedShapeIndex(i);
                setSelectedPathIndex(0);
                break; // stop at first (topmost) hit
            }
        }
    }

    function buildPath(ctx: CanvasRenderingContext2D, shape: Shape) {
        ctx.beginPath();
        for (let index = 0; index < shape.paths.length; index++) {

            const points = shape.paths[index].points;

            if (!points || points.length === 0) continue;

            ctx.moveTo(points[0].x, points[0].y);

            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.closePath(); // optional for closed shapes
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


    function handleCreatePoint(e: React.MouseEvent<HTMLCanvasElement>) {
        let shapeIndex = selectedShapeIndex;
        let pathIndex = selectedPathIndex;
        let _shape = shapes[shapeIndex];

        // if no shape exists, create one
        if (!_shape) {
            const newShape = CreateDefaultShape();

            setShapes(prev => {
                const newShapes = [...prev, newShape];
                // update selection immediately for next render
                setSelectedShapeIndex(newShapes.length - 1);
                setSelectedPathIndex(0);

                // update local variables for this function
                _shape = newShape;
                shapeIndex = newShapes.length - 1;
                pathIndex = 0;

                return newShapes;
            });
        }

        const path = _shape.paths[pathIndex];
        if (!path) return;

        const rect = e.currentTarget.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        let newPoint: Point;

        if (selectedSegment !== -1) {
            const n = path.points.length;
            const start = path.points[selectedSegment];
            const end = path.points[(selectedSegment + 1) % n];

            if (end) {
                newPoint = lerpVec2(start, end, 0.5);
                insertPointAt(selectedSegment, newPoint.x, newPoint.y);
                setSelectedPointIndex(selectedSegment + 1);
                startDragging(selectedSegment + 1);
            } else {
                newPoint = { x: start.x + 10, y: start.y };
                insertPointAt(path.points.length, newPoint.x, newPoint.y);
                setSelectedPointIndex(path.points.length - 1);
                startDragging(path.points.length - 1);
            }
        } else {
            if (snapToGrid) {
                const gridSizeX = canvasWidth / gridSubdivions;
                const gridSizeY = canvasHeight / gridSubdivions;

                x = Math.round(x / gridSizeX) * gridSizeX;
                y = Math.round(y / gridSizeY) * gridSizeY;
            }

            newPoint = { x, y };
            setShapes(prev =>
                prev.map((s, i) => {
                    if (i !== shapeIndex) return s;

                    const newPaths = [...s.paths];
                    const currentPath = newPaths[pathIndex];
                    const newPoints = [...currentPath.points, newPoint];

                    newPaths[pathIndex] = { ...currentPath, points: newPoints };
                    return { ...s, paths: newPaths };
                })
            );

            setSelectedPointIndex(path.points.length);
            startDragging(path.points.length);
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
        shapes.forEach(shape => DrawShape(ctx, shape, cameraRef.current)); // adjust DrawShape to accept ctx

        // Export
        const dataUrl = tempCanvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = fileName + ".png"
        link.click();
    }

    function SaveShape(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        const saveData: SaveData = {
            id: crypto.randomUUID(),
            fileName,
            shapes,
            useGrid: showGrid,
            snapGrid: snapToGrid,
            gridSubd: gridSubdivions
        }
        const json = JSON.stringify(saveData);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        AddToRecentFiles(json);

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

                    AddToRecentFiles(text);
                } catch (error) {
                    console.log("failed to load file.")
                }
            };
            reader.readAsText(file);
        }
    }


    function AddToRecentFiles(data: string) {
        const stored = localStorage.getItem(RECENTFILESKEY);
        let files: string[] = stored ? JSON.parse(stored) : [];
        files = files.filter(f => f !== data);
        files.unshift(data);
        if (files.length > MAX_RECENT) files.slice(0, MAX_RECENT);
        localStorage.setItem(RECENTFILESKEY, JSON.stringify(files));
    }

    function handleClickAddShape(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        AddNewShape();
    }
    function AddNewShape(): Shape {
        const shape: Shape = CreateDefaultShape();

        setShapes(prev => [...prev, shape]);
        setSelectedShapeIndex(shapes.length);
        setSelectedPathIndex(0);
        return shape;
    }

    function DeleteSelectedShape(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        if (selectedShapeIndex === -1) return;
        setShapes(prev => [...prev.filter(s => s !== shape)]);
        setSelectedShapeIndex(prev => Math.max(prev - 1, 0));
    }

    // update shape helper
    function updateSelectedShape(updater: (shape: Shape) => Shape) {
        setShapes(prev =>
            prev.map((s, i) => (i === selectedShapeIndex ? updater(s) : s))
        );
    }

    function handleClickAddNewPath(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        AddNewPath();
    }
    function AddNewPath(): void {
        if (shapes.length < 1) return;
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


    function RemoveFromLocalStorage(id: string) {
        // document. alert if you want to delete
        const stored = localStorage.getItem(RECENTFILESKEY);
        if (!stored) return;

        try {
            const filesAsStrings: string[] = JSON.parse(stored);

            // Remove matching file
            const filtered = filesAsStrings.filter(str => {
                const file: SaveData = JSON.parse(str);
                return file.id !== id;
            });

            localStorage.setItem(RECENTFILESKEY, JSON.stringify(filtered));

            // Update state (important so UI refreshes)
            const parsedFiles: SaveData[] = filtered.map(f => JSON.parse(f));
            setRecentFiles(parsedFiles);

        } catch (e) {
            console.error("Failed removing recent file", e);
        }
    }



    return (
        <>
            <div className="flex flex-row gap-4 justify-between ">
                {/* Tools */}
                <div id="TOOLS" className="panel  overflow-auto h-screen">
                    <div className="flex flex-col gap-2">
                        <h2>Tools</h2>
                        <button className={`${tool === "Select" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Select")} title="Select"><i className="fa-solid fa-arrow-pointer"></i></button>
                        <button className={`${tool === "Insert" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Insert")} title="Insert"><i className="fa-solid fa-pencil"></i></button>
                        <button className={`${tool === "Move" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Move")} title="Move"><i className="fa-solid fa-arrows-up-down-left-right"></i></button>
                        <button className={`${tool === "Delete" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Delete")} title="Delete"><i className="fa-solid fa-eraser"></i></button>
                        <button className={`${tool === "Pan" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Pan")} title="Pan"><i className="fa-solid fa-hand"></i></button>
                    </div>
                </div>
                <div id="middle_column" className="flex flex-col flex-1 w-screen h-screen ">
                    <div className='top-0 shrink-0'>
                        <div className='flex flex-row gap-2'>
                            {/* app icon */}
                            {/* <img className="size-16" src="./donut.png"></img> */}
                            <h1 className='mb-10 text-zinc-400 flex text-center'>LIGMA - {fileName}</h1>
                        </div>
                    </div>
                    {/* Knobs */}
                    <div className="flex flex-col gap-4 flex-1 overflow-hidden">
                        <div id="Knobs" className="relative flex-1 overflow-hidden">

                            {showKnobs &&
                                shape && shape.paths[selectedPathIndex]?.points.map((p, i) => {
                                    if (canvasRect == null) return;
                                    const selected = selectedPointIndex === i;
                                    var _knobSize = selected ? knobSize * 2 : knobSize;
                                    var bgColor =
                                        selected ? 'bg-zinc-200/90' :
                                            ' bg-zinc-200/50';

                                    var bgHoverColor =
                                        selected ? 'hover:bg-zinc-100/90' :
                                            'hover:bg-zinc-100/50'

                                    const x = p.x - (_knobSize * 0.5) - cameraRef.current.x;
                                    const y = p.y - (_knobSize * 0.5) - cameraRef.current.y;
                                    return (
                                        <div
                                            key={i}
                                            onMouseDown={() => { if (tool === "Delete") { handleRemovePoint(i) }; if (tool === "Select" || tool === "Move") { startDragging(i); setSelectedPointIndex(i); } }}
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
                                border-black
                                ${tool === "Delete" ? "cursor-crosshair" : "cursor-pointer"}
                                `
                                            }></div>
                                    )
                                })
                            }

                            {/* Canvas */}


                            <canvas
                                id="CanvasOverlay"
                                className="absolute inset-0 pointer-events-none z-20"
                            />
                            <canvas
                                onMouseDown={handleMouseDown}
                                onMouseUp={handleMouseUp}
                                onMouseMove={handleMouseMove}
                                onWheel={handleScroll}
                                id="Canvas"
                                ref={canvasRef}

                                className="absolute inset-0 z-10"
                            />
                            <canvas
                                id="CanvasGrid"
                                style={{ background: `${bgColor}` }}
                                className="absolute inset-0 pointer-events-none z-0 "
                            />
                        </div>
                    </div>
                </div>
                {/* Controls */}
                <div className="panel overflow-scroll h-screen">
                    {/* Selected point */}
                    {selectedPointIndex !== -1 &&
                        <div className="panel2">
                            <h2 className="panel2header">Selected point</h2>
                            <div className="panel2content">
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
                        </div>
                    }
                    <div className="panel2">
                        <h2 className="panel2header">Shape</h2>
                        <div className="panel2content">
                            <p>Shapes: {shapes.length}</p>
                            <div className="flex flex-row gap-2">
                                <button title="Add shape" onClick={handleClickAddShape}><i className="fa fa-circle-plus"></i></button>
                            </div>
                            <p>Selected shape:
                                <input className="ml-2 w-[10ch]" type="number" value={selectedShapeIndex} min={0} max={shapes.length - 1} onChange={(e) => { setSelectedShapeIndex(Number(e.target.value)); setSelectedPathIndex(0); setSelectedPointIndex(0); }}></input>
                            </p>
                            {shape &&

                                <div className="flex flex-row gap-2">
                                    <p>Order:</p>
                                    <button onClick={moveForward}><i className="fa fa-arrow-up"></i></button>
                                    <button onClick={moveBackward}><i className="fa fa-arrow-down"></i></button>
                                    {shapes.length > 0 && selectedShapeIndex !== -1 &&
                                        <button title="Delete shape" onClick={DeleteSelectedShape}><i className="fa fa-circle-minus"></i></button>
                                    }
                                </div>
                            }
                        </div>
                    </div>
                    {shape && <>
                        <div className="panel2">
                            <h2 className="panel2header">Paths</h2>
                            <div className="panel2content">
                                <p>Path:
                                    <input className="ml-2 w-[10ch]" type="number" value={selectedPathIndex} min={0} max={shapes[selectedShapeIndex]?.paths.length - 1} onChange={(e) => setSelectedPathIndex(Number(e.target.value))}></input>
                                </p>
                                <div className="flex flex-row gap-2">
                                    <button title="Add path" onClick={handleClickAddNewPath}><i className="fa fa-circle-plus"></i></button>
                                    <button title="Delete path" onClick={DeleteSelectedPath}><i className="fa fa-circle-minus"></i></button>
                                </div>
                                {/* Line color */}

                                <div className="flex flex-col">
                                    <label>Stroke</label>
                                    <div className="flex flex-row gap-2">
                                        <input
                                            className="colorSelect"
                                            type="color"
                                            value={shape?.strokeColor}
                                            onChange={(e) =>
                                                updateSelectedShape(s => ({ ...s, strokeColor: e.target.value }))
                                            }
                                        />
                                        <input
                                            type="checkbox"
                                            checked={shape?.useStroke}
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
                                            value={shape?.fillColor}
                                            onChange={(e) =>
                                                updateSelectedShape(s => ({ ...s, fillColor: e.target.value }))
                                            }
                                        />
                                        <input
                                            type="checkbox"
                                            checked={shape?.useFill}
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
                                        value={shape?.strokeWidth}
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
                                        checked={shape?.cyclic}
                                        onChange={(e) =>
                                            updateSelectedShape(s => ({ ...s, cyclic: e.target.checked }))
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </>}
                    <div className="panel2">
                        <h2 className="panel2header">Knobs</h2>
                        <div className="panel2content">
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
                    </div>
                    <div className="panel2">
                        <h2 className="panel2header">Grid</h2>
                        <div className="panel2content">
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
                    </div>
                    <div className="panel2">
                        <h2 className="panel2header">File</h2>
                        <div className="panel2content">
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
                            <div className="flex flex-col gap-2">
                                {recentFiles.map((file, index) =>
                                    <div className="flex flex-row gap-2" key={index}>
                                        <button onClick={() => { setShapes(file.shapes); setFileName(file.fileName) }} >{file.fileName}</button>
                                        <button onClick={() => { RemoveFromLocalStorage(file.id) }} ><i className="fa-solid fa-x"></i></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
