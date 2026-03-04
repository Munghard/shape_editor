import React, { useEffect, useRef, useState } from "react"
import { ClearCanvas, getCanvasMousePos, getRandomColor, getShapeCenter, lerpVec2, screenToWorld, shapesEqual, worldToScreen } from "../Utilities/Utilities";
import { ClearGrid, DrawGrid } from "./Grid";
import { DrawShape, type Shape, type Point, CreateBaseShape, CreateTriangle, CreateCircle, CreateSquare } from "./Shape";
import getHoveredSegment from "./Segment";
import { type SaveData } from "./SaveData";
import { ExportShape, LoadFile, RemoveFromLocalStorage, SaveFile } from "./File";
import type { History } from "./History";

type Tool = "Select" | "Move" | "Rotate" | "Scale" | "Insert" | "Delete" | "Pan";

export const MAX_RECENT = 5;
export const RECENTFILESKEY = "recentFiles";

export default function Main() {


    // HISTORY
    const [history, setHistory] = useState<History>({
        past: [],
        present: { shapes: [] },
        future: []
    });

    // FILE
    const [fileName, setFileName] = useState<string>("NewFile");

    // CANVAS
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null);

    //SHAPE
    const [selectedShapeIndex, setSelectedShapeIndex] = useState<number>(0);

    const shape = history.present.shapes[selectedShapeIndex];

    // VIEW
    const [bgColor, setBgColor] = useState<string>("#282828");
    const [gridColor, setGridColor] = useState<string>("#ffffff");
    const [gridAlpha, setGridAlpha] = useState<number>(0.1);

    const [showGrid, setShowGrid] = useState<boolean>(true);
    const [gridSubdivions, setGridSubdivisions] = useState<number>(8);

    const [selectedSegment, setSelectedSegment] = useState<number>(-1);

    const [showKnobs, setShowKnobs] = useState<boolean>(true);
    const [knobSize, setKnobSize] = useState<number>(16);
    const [snapToGrid, setSnapToGrid] = useState<boolean>(false);

    // CAMERA
    const [, setTick] = useState(0); // this is for forcing rerender on zoom
    const lastMouseRef = useRef<{ x: number; y: number } | null>(null)
    const cameraRef = useRef({
        x: 0,
        y: 0,
        zoom: 1,
    })
    // EDITOR


    const [recentFiles, setRecentFiles] = useState<SaveData[]>([]);

    const [selectedPathIndex, setSelectedPathIndex] = useState<number>(0);
    const [selectedPointIndex, setSelectedPointIndex] = useState<number>(-1);
    const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);

    const [tool, setTool] = useState<Tool>("Select");

    const [selectedExportScale, setSelectedExportScale] = useState<string>("1");


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



    // DRAW
    useEffect(() => {
        Draw();
        const canvas = document.getElementById("Canvas") as HTMLCanvasElement;
        const rect = canvas.getBoundingClientRect();
        setCanvasRect(rect);

    }, [history.present.shapes, knobSize]);

    function Draw() {

        const canvas = document.getElementById("Canvas") as HTMLCanvasElement;
        if (!canvas) return;

        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

        ClearCanvas(ctx);
        history.present.shapes.forEach(shape => DrawShape(ctx, shape, cameraRef.current));
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
    }, [showGrid, gridSubdivions, gridAlpha, gridColor]);


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



    // HOTKEYS
    useEffect(() => {
        function handleKeyDown(e: globalThis.KeyboardEvent) {
            if (e.repeat) return;
            const active = document.activeElement;
            if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
                return; // skip hotkeys while typing
            }

            const key = e.key.toLowerCase();

            if (e.ctrlKey && !e.shiftKey && key === "z") {
                undo();
                e.preventDefault();
            }
            if (e.ctrlKey && e.shiftKey && key === "z") {
                redo();
                e.preventDefault();
            }
            if (e.key === "s") {
                setTool("Scale");
                e.preventDefault();
            }
            if (e.key === "r") {
                setTool("Rotate");
                e.preventDefault();
            }
            if (e.key === "Control") {
                setTool("Move");
                e.preventDefault();
            }
            if (e.code === "Space") {
                setTool("Pan");
                e.preventDefault();
            }
            if (e.key === "Shift") {
                setTool("Insert");
                e.preventDefault();
            }
            if (e.key === "Alt") {
                setTool("Delete");
                e.preventDefault();
            }

        }

        function handleKeyUp(e: globalThis.KeyboardEvent): void {
            if (e.key === "Control") {
                setTool("Select");
                e.preventDefault();
            }
            if (e.code === "Space") {
                setTool("Select");
                e.preventDefault();
            }
            if (e.key === "Shift") {
                setTool("Select");
                e.preventDefault();
            }
            if (e.key === "Alt") {
                setTool("Select");
                e.preventDefault();
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        }
    }, []);

    // RESIZE CANVASES
    useEffect(() => {
        resizeCanvases();
        window.addEventListener("resize", resizeCanvases);
        return () => window.removeEventListener("resize", resizeCanvases);
    }, []);

    useEffect(() => {

        if (canvasRef.current) {
            cameraRef.current.x = -canvasRef.current.width / 2;
            cameraRef.current.y = -canvasRef.current.height / 2;
        }
    }, [canvasRef.current]);

    function ReDrawGrid() {
        var c = document.getElementById("CanvasGrid") as HTMLCanvasElement;
        var ctx = c.getContext("2d") as CanvasRenderingContext2D;
        ClearCanvas(ctx);
        DrawGrid(ctx, gridColor, gridAlpha, gridSubdivions, cameraRef.current);
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
    function changeDetected(): boolean {
        const current = history.present.shapes;
        const lastPast = history.past[history.past.length - 1]?.shapes;

        return !shapesEqual(current, lastPast);
    }

    function handleRemovePoint(index: number) {

        commit(prevShapes =>
            prevShapes.map((s, i) => {
                if (i !== selectedShapeIndex) return s;

                const newPaths = [...s.paths];
                const currentPath = { ...newPaths[selectedPathIndex] };

                currentPath.points = currentPath.points.filter(
                    (_p, idx) => idx !== index
                );

                newPaths[selectedPathIndex] = currentPath;

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

        var cmp = getCanvasMousePos(e, canvasRef.current)

        let screenX = cmp.x;
        let screenY = cmp.y;

        if (tool === "Rotate" && dragging && lastMouseRef.current) {

            // const dx = screenX - lastMouseRef.current.x;
            const dy = screenY - lastMouseRef.current.y;

            lastMouseRef.current = { x: screenX, y: screenY };

            const shape = history.present.shapes[selectedShapeIndex];
            if (!shape) return;

            const center = getShapeCenter(shape);

            // Rotate based on vertical mouse delta (dy)
            // You can tweak the factor to control sensitivity
            const angle = dy * 0.01; // radians

            shape.paths.forEach(path => {
                path.points.forEach(p => {
                    const offsetX = p.x - center.x;
                    const offsetY = p.y - center.y;

                    // apply rotation
                    const rotatedX = offsetX * Math.cos(angle) - offsetY * Math.sin(angle);
                    const rotatedY = offsetX * Math.sin(angle) + offsetY * Math.cos(angle);

                    p.x = center.x + rotatedX;
                    p.y = center.y + rotatedY;
                });
            });
            Draw();
        }
        if (tool === "Scale" && dragging && lastMouseRef.current) {
            console.log("scaling before shape");

            // const dx = screenX - lastMouseRef.current.x;
            const dy = screenY - lastMouseRef.current.y;

            lastMouseRef.current = { x: screenX, y: screenY };

            const shape = history.present.shapes[selectedShapeIndex];
            if (!shape) return;

            const center = getShapeCenter(shape);

            const scaleFactor = Math.max(0.1, 1 + dy * 0.01);

            shape.paths.forEach(path => {
                path.points.forEach(p => {
                    p.x = center.x + (p.x - center.x) * scaleFactor;
                    p.y = center.y + (p.y - center.y) * scaleFactor;
                });
            });
            console.log("scaling");
            Draw();
        }
        else if (tool === "Pan" && dragging && lastMouseRef.current) {
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
        else if (tool === "Move") {
            // return if no shape selected
            if (!shape) return;
            // move all points in paths in shape
            if (dragging) {
                const dx = (screenX - dragOffset.current.x) / cameraRef.current.zoom;
                const dy = (screenY - dragOffset.current.y) / cameraRef.current.zoom;

                setHistory(prev => {
                    const copy = [...prev.present.shapes];
                    const shape = { ...copy[selectedShapeIndex] };
                    shape.paths = shape.paths.map(path => ({
                        ...path,
                        points: path.points.map(pt => ({ x: pt.x + dx, y: pt.y + dy }))
                    }));
                    copy[selectedShapeIndex] = shape;

                    return {
                        ...prev,
                        present: { shapes: copy },
                    };
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

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // we are hovering a valid segment
            if (seg !== -1) {
                // draw a knob in the middle
                const path = shape.paths[selectedPathIndex];
                const n = path.points.length;
                const start = path.points[seg];
                const end = path.points[(seg + 1) % n]; // loops back to first point if last

                var pos = lerpVec2(start, end, 0.5);
                const { x, y } = worldToScreen(pos.x, pos.y, cameraRef.current, canvasRef.current);
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

    function handleKnobMouseDown(e: React.MouseEvent<HTMLDivElement>, i: number) {
        const knob = e.currentTarget as HTMLDivElement;
        knob.style.pointerEvents = "none";
        knob.style.display = "none";

        if (tool === "Delete") {
            handleRemovePoint(i)
        };
        if (tool === "Select" || tool === "Move" || tool === "Insert") {
            startDragging(i);
            setSelectedPointIndex(i);
        }

        function onMouseUp() {
            knob.style.pointerEvents = "auto"; // re-enable after drag
            knob.style.display = "flex";
            window.removeEventListener("mouseup", onMouseUp);
        }

        window.addEventListener("mouseup", onMouseUp);


    }
    function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
        if (!canvasRef.current) return;

        var cmp = getCanvasMousePos(e, canvasRef.current)

        const screenX = cmp.x;
        const screenY = cmp.y;
        var ctx = e.currentTarget.getContext("2d") as CanvasRenderingContext2D;

        if (tool === "Pan" || tool === "Scale" || tool === "Rotate") {
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


        if (changeDetected()) {

            commit(() => history.present.shapes);
        }
    }

    function selectShapeAt(ctx: CanvasRenderingContext2D, x: number, y: number) {
        const prevShape = selectedShapeIndex;
        const prevPath = selectedPathIndex;

        setSelectedShapeIndex(-1);
        setSelectedPathIndex(-1);
        setSelectedPointIndex(-1);

        for (let i = history.present.shapes.length - 1; i >= 0; i--) {
            buildPath(ctx, history.present.shapes[i]);

            if (ctx.isPointInPath(x, y)) {

                setSelectedShapeIndex(i);

                let nextPathIndex = 0;

                if (i === prevShape) {
                    // cycle to next path
                    const pathCount = history.present.shapes[i].paths.length;
                    nextPathIndex = (prevPath + 1) % pathCount;
                }

                setSelectedPathIndex(nextPathIndex);
                break;
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

        if (changeDetected()) {


            commit(prevShapes =>
                prevShapes.map((shape, i) => {
                    if (i !== selectedShapeIndex) return shape;

                    // copy all paths
                    const newPaths = shape.paths.map((path, pi) => {
                        if (pi !== selectedPathIndex) return path;

                        // copy points, replacing the moved point
                        const newPoints = path.points.map((pt, pj) =>
                            pj === pointIndex ? { x: newPoint.x, y: newPoint.y } : { ...pt }
                        );

                        return { ...path, points: newPoints };
                    });

                    return { ...shape, paths: newPaths };
                })
            );
        }

        setSelectedPointIndex(pointIndex);
    }

    function handleCreatePoint(e: React.MouseEvent<HTMLCanvasElement>) {
        if (!canvasRef.current) return;
        let shapeIndex = selectedShapeIndex;
        let pathIndex = selectedPathIndex;
        let _shape = history.present.shapes[shapeIndex];

        // if no shape exists, create one
        if (!_shape) {
            const newShape = CreateBaseShape();


            commit(prev => {
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

        const cam = cameraRef.current;

        var cmp = getCanvasMousePos(e, canvasRef.current)

        const canvasX = cmp.x;
        const canvasY = cmp.y;

        let x = canvasX / cam.zoom + cam.x;
        let y = canvasY / cam.zoom + cam.y;

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
                if (!canvasRef.current) return;

                const spacing = 1000 / gridSubdivions;

                x = Math.round(x / spacing) * spacing;
                y = Math.round(y / spacing) * spacing;
            }

            newPoint = { x, y };


            commit(prev =>
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


        commit(prev =>
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
        if (!canvasRef.current) return;

        const shape = history.present.shapes[selectedShapeIndex];
        const path = shape.paths[selectedPathIndex];
        const startPoint = path.points[index];

        let offsetX = 0;
        let offsetY = 0;

        function onMouseMove(e: MouseEvent) {
            if (!canvasRef.current) return;
            const camera = cameraRef.current;

            var cmp = getCanvasMousePos(e, canvasRef.current)
            // convert mouse to world coordinates
            let mouseWorldX = (cmp.x) / camera.zoom + camera.x;
            let mouseWorldY = (cmp.y) / camera.zoom + camera.y;

            if (offsetX === 0 && offsetY === 0) {
                offsetX = startPoint.x - mouseWorldX;
                offsetY = startPoint.y - mouseWorldY;
            }

            let x = mouseWorldX + offsetX;
            let y = mouseWorldY + offsetY;

            if (snapToGrid) {
                const spacing = 1000 / gridSubdivions; // same as DrawGrid
                x = Math.round(x / spacing) * spacing;
                y = Math.round(y / spacing) * spacing;
            }

            path.points[index] = { x, y };
            Draw();
            ReDrawGrid();
        }

        function onMouseUp() {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }

    function handleScroll(e: React.WheelEvent): void {
        if (!canvasRef.current) return;

        var cmp = getCanvasMousePos(e, canvasRef.current)

        const canvasX = cmp.x;
        const canvasY = cmp.y;

        const cam = cameraRef.current;

        // mouse position in world coordinates
        const worldX = cam.x + canvasX / cam.zoom;
        const worldY = cam.y + canvasY / cam.zoom;

        const zoomFactor = 1.2;
        const delta = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;

        // apply zoom
        cam.zoom *= delta;
        cam.zoom = Math.max(0.1, Math.min(cam.zoom, 10));

        // adjust camera so the world point under the mouse stays fixed
        cam.x = worldX - (canvasX / cam.zoom);
        cam.y = worldY - (canvasY / cam.zoom);

        setTick(t => t + 1); // force React to re-render knobs

        Draw();
        ReDrawGrid();

    }

    function handleExport(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        if (!canvasRef.current) return;

        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvasRef.current?.width * Number(selectedExportScale);
        tempCanvas.height = canvasRef.current?.height * Number(selectedExportScale);

        const ctx = tempCanvas.getContext("2d");
        if (!ctx) return;

        ExportShape(ctx, cameraRef.current, selectedExportScale, fileName, history.present.shapes);
    }
    function handleSave(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        SaveFile(fileName, history.present.shapes, showGrid, snapToGrid, gridSubdivions);
    }
    function handleLoad(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        LoadFile(setFileName, commit, setShowGrid, setSnapToGrid, setGridSubdivisions);
    }

    function handleClickAddShape(shape: string): void {
        AddNewShape(shape);
    }

    function AddNewShape(shape: string): Shape {

        let newShape: Shape = CreateBaseShape();
        if (shape === "empty") {
            newShape = CreateBaseShape();
        }
        if (shape === "circle") {
            newShape = CreateBaseShape([CreateCircle()]);
        }
        if (shape === "square") {
            newShape = CreateBaseShape([CreateSquare()]);
        }
        if (shape === "triangle") {
            newShape = CreateBaseShape([CreateTriangle()]);
        }

        commit(prev => [...prev, newShape]);
        setSelectedShapeIndex(history.present.shapes.length);
        setSelectedPathIndex(0);
        return newShape;
    }

    function DeleteSelectedShape(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        if (selectedShapeIndex === -1) return;
        commit(prev => [...prev.filter(s => s !== shape)]);
        setSelectedShapeIndex(prev => Math.max(prev - 1, 0));
        setSelectedSegment(0);
    }
    function DeleteShape(index: number): void {
        if (index === -1) return;
        commit(prev => [...prev.filter((_s, i) => i !== index)]);
        setSelectedShapeIndex(prev => Math.max(prev - 1, 0));
        setSelectedSegment(0);
    }

    // update shape helper
    function updateSelectedShape(updater: (shape: Shape) => Shape) {
        commit(prev =>
            prev.map((s, i) => (i === selectedShapeIndex ? updater(s) : s))
        );
    }

    function handleClickAddNewPath(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        AddNewPath();
    }
    function AddNewPath(): void {
        if (history.present.shapes.length < 1) return;
        commit(prev =>
            prev.map((s, i) => {
                if (i !== selectedShapeIndex) return s;

                const newPaths = [
                    ...s.paths,
                    { points: [], isHole: true }
                ];
                return { ...s, paths: newPaths }
            })

        );
        setSelectedPathIndex(history.present.shapes[selectedShapeIndex].paths.length);
    }
    function DeleteSelectedPath(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        commit(prev =>
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
    function DeletePath(index: number): void {
        commit(prev =>
            prev.map((s, i) => {
                if (i !== index) return s;

                const newPaths = [
                    ...s.paths.filter((_p, i) => i !== index)
                ];
                return { ...s, paths: newPaths }
            })
        );
        setSelectedPathIndex(prev => Math.max(prev - 1, 0));
    }

    function moveForward() {
        commit(prev => {
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
        commit(prev => {
            const index = selectedShapeIndex;
            if (index <= 0) return prev;

            const copy = [...prev];
            [copy[index], copy[index - 1]] =
                [copy[index - 1], copy[index]];

            setSelectedShapeIndex(index - 1);
            return copy;
        });
    }

    // type Commit = (updater: (prev: Shape[]) => Shape[]) => void;

    function commit(updater: (prevShapes: Shape[]) => Shape[]) {
        setHistory(prev => {
            const newShapes = updater(prev.present.shapes).map(s => ({
                ...s,
                paths: s.paths.map(p => ({ ...p, points: [...p.points] }))
            }));

            return {
                past: [...prev.past, JSON.parse(JSON.stringify(prev.present))], // deep copy
                present: { shapes: newShapes },
                future: []
            };
        });
    }

    function undo() {
        setHistory(prev => {
            if (prev.past.length === 0) return prev;

            const previous = prev.past[prev.past.length - 1];

            return {
                past: prev.past.slice(0, -1),
                present: previous,
                future: [prev.present, ...prev.future]
            };
        });
    }
    function redo() {
        setHistory(prev => {
            if (prev.future.length === 0) return prev;

            const next = prev.future[0];

            return {
                past: [...prev.past, prev.present],
                present: next,
                future: prev.future.slice(1)
            };
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
                        <button className={`${tool === "Insert" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Insert")} title="Insert"><i className="fa-solid fa-pencil"></i></button>
                        <button className={`${tool === "Move" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Move")} title="Move"><i className="fa-solid fa-arrows-up-down-left-right"></i></button>
                        <button className={`${tool === "Rotate" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Rotate")} title="Rotate"><i className="fa-solid fa-rotate"></i></button>
                        <button className={`${tool === "Scale" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Scale")} title="Scale"><i className="fa-solid fa-up-right-and-down-left-from-center"></i></button>
                        <button className={`${tool === "Delete" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Delete")} title="Delete"><i className="fa-solid fa-eraser"></i></button>
                        <button className={`${tool === "Pan" ? "bg-zinc-600!" : "bg-zinc-900!"} border-2!`} onClick={() => setTool("Pan")} title="Pan"><i className="fa-solid fa-hand"></i></button>
                    </div>
                </div>
                {/* shaped and paths */}
                <div id="paths" className="panel">
                    <div className="flex flex-col gap-2">
                        <h2>Shapes</h2>
                        {history.present && history.present.shapes.map((_s, i) => {
                            return (
                                <div key={i} className="flex flex-row gap-2">
                                    <button onClick={() => setSelectedShapeIndex(i)}>Shape-{i} paths: {_s.paths.length}</button>
                                    <button onClick={() => DeleteShape(i)}>X</button>
                                </div>
                            )
                        })}
                        <br />
                        <h2>Paths</h2>
                        {shape && shape.paths.map((_s, i) => {
                            return (
                                <div key={i} className="flex flex-row gap-2">
                                    <button onClick={() => setSelectedPathIndex(i)}>Path_{i} points: {_s.points.length}</button>
                                    <button onClick={() => DeletePath(i)}>X</button>
                                </div>
                            )
                        })}
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

                            {showKnobs && !dragging &&
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
                                    if (!canvasRef.current) return;

                                    const { x, y } = worldToScreen(p.x, p.y, cameraRef.current, canvasRef.current);
                                    const knobX = x - (_knobSize * 0.5);
                                    const knobY = y - (_knobSize * 0.5);
                                    return (
                                        <div
                                            key={i}
                                            onMouseDown={(e) => handleKnobMouseDown(e, i)}
                                            style={{
                                                top: knobY,
                                                left: knobX,
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
                                pointer-events-auto
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

                                className="absolute inset-0 z-10 pointer-events-all"
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
                    <div className="panel2">
                        <h2 className="panel2header">History</h2>
                        <div className="panel2content">
                            <div className="flex flex-row gap-2">
                                <p>undos: {history.past.length}</p>
                                <p>redos: {history.future.length}</p>
                            </div>
                            <div className="flex flex-row gap-2">
                                <button disabled={history.past.length < 1} onClick={(_e) => undo()} title="Undo" ><i className="fa-solid fa-undo"></i></button>
                                <button disabled={history.future.length < 1} onClick={(_e) => redo()} title="Redo" ><i className="fa-solid fa-redo"></i></button>
                            </div>
                            <button onClick={(_e) => setHistory({
                                past: [],
                                present: history.present,
                                future: []
                            })} title="Clear" ><i className="fa-solid fa-rectangle-xmark"></i></button>
                            {/* <input type="range" value={history.past.length} min={0} max={history.past.length + history.future.length}></input> */}

                        </div>
                    </div>
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
                            <p>Shapes: {history.present.shapes.length}</p>
                            <div className="flex flex-row gap-2">
                                <button title="Add empty shape" onClick={() => handleClickAddShape("empty")}><i className="fa fa-plus"></i></button>
                                <button title="Add circle shape" onClick={() => handleClickAddShape("circle")}><i className="fa fa-circle"></i></button>
                                <button title="Add circle shape" onClick={() => handleClickAddShape("square")}><i className="fa fa-square"></i></button>
                                <button title="Add triangle shape" onClick={() => handleClickAddShape("triangle")}><i className="fa fa-play rotate-270"></i></button>
                            </div>
                            <p>Selected shape:
                                <input className="ml-2 w-[10ch]" type="number" value={selectedShapeIndex} min={0} max={history.present.shapes.length - 1} onChange={(e) => { setSelectedShapeIndex(Number(e.target.value)); setSelectedPathIndex(0); setSelectedPointIndex(0); }}></input>
                            </p>
                            {shape &&

                                <div className="flex flex-row gap-2">
                                    <p>Order:</p>
                                    <button onClick={moveForward}><i className="fa fa-arrow-up"></i></button>
                                    <button onClick={moveBackward}><i className="fa fa-arrow-down"></i></button>
                                    {history.present.shapes.length > 0 && selectedShapeIndex !== -1 &&
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
                                <p>Paths: {shape.paths.length}</p>
                                <p>Selected path:
                                    <input className="ml-2 w-[10ch]" type="number" value={selectedPathIndex} min={0} max={history.present.shapes[selectedShapeIndex]?.paths.length - 1} onChange={(e) => setSelectedPathIndex(Number(e.target.value))}></input>
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
                                        <button onClick={(_e) => updateSelectedShape(s => ({ ...s, strokeColor: getRandomColor() }))}>Randomize</button>
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
                                        <button onClick={(_e) => updateSelectedShape(s => ({ ...s, fillColor: getRandomColor() }))}>Randomize</button>
                                    </div>
                                </div>
                                {/* Line width */}
                                <div className="flex flex-col">
                                    <label>Stroke width: {shape?.strokeWidth}</label>
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
                                <label>Knob size: {knobSize}</label>
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

                            <p>Grid</p>
                            <div className="flex flex-col ">
                                {/* this could be a component */}
                                <div className="flex flex-row gap-2 items-center">
                                    <input className="colorSelect" type="color" value={gridColor} onChange={(e) => setGridColor(e.target.value)} />
                                    <div className="flex flex-row gap-2 items-center ">
                                        <p >Alpha:</p>
                                        <input type="number" step={0.1} min={0} max={1} value={gridAlpha} onChange={(e) => setGridAlpha(Number(e.target.value))}></input>
                                    </div>
                                </div>
                                <input type="range" value={gridAlpha} step={0.01} min={0} max={1} onChange={(e) => setGridAlpha(Number(e.target.value))} />
                                {/* this could be a component */}
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
                                <label>Grid subdivision: {gridSubdivions}</label>
                                <input type="range" value={gridSubdivions} min={1} max={128} onChange={(e) => setGridSubdivisions(Number(e.target.value))} />
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
                                <button title="Export/Download" onClick={handleExport}><i className="fa-solid fa-download"></i></button>
                                <button title="Save" onClick={handleSave}><i className="fa-solid fa-floppy-disk"></i></button>
                                <button title="Load" onClick={handleLoad}><i className="fa-solid fa-folder"></i></button>
                                <button title="New" onClick={() => { commit(() => [CreateBaseShape()]); setSelectedPointIndex(-1); setSelectedPathIndex(0); setSelectedShapeIndex(0) }}><i className="fa-solid fa-file"></i></button>
                            </div>
                            <div className="flex flex-col gap-2">
                                {recentFiles.map((file, index) =>
                                    <div className="flex flex-row gap-2" key={index}>
                                        <button onClick={() => { commit(() => file.shapes); setFileName(file.fileName) }} >{file.fileName}</button>
                                        <button onClick={() => { RemoveFromLocalStorage(file.id, setRecentFiles) }} ><i className="fa-solid fa-x"></i></button>
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
