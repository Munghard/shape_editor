import React, { useEffect, useRef, useState } from "react"
import { ClearCanvas, CloneShape, cubicBezierPoint, getCanvasMousePos, getRandomColor, getShapeCenter, lerpVec2, screenToWorld, shapesEqual, worldToScreen } from "../Utilities/Utilities";
import { ClearGrid, DrawGrid } from "./Grid";
import { DrawShape, type Shape, type Point, CreateBaseShape, CreateTriangle, CreateCircle, CreateSquare, type Rect, type Path, CreateEmptyPath } from "./Shape";
import getHoveredSegment from "./Segment";
import { type SaveData } from "./SaveData";
import { ExportShape, LoadFile, RemoveFromLocalStorage, SaveFile } from "./File";
import type { History, HistoryState } from "./History";
import { toolTooltip } from "./ToolTooltips";
import { APP_NAME } from "../Constants";
import { Knob } from "./Knob";
import { Handle } from "./Handle";
import { DrawHandleLines } from "./OverlayCanvas";
import { Panel } from "./Panel";
import { PanelContainer } from "./PanelContainer";

export type Tool = "Select" | "Move" | "Rotate" | "Scale" | "Insert" | "Delete" | "Pan" | "Frame";

export const MAX_RECENT = 5;
export const RECENTFILESKEY = "recentFiles";

export default function Main() {

    document.title = APP_NAME;

    const [loaded, setLoaded] = useState(false);
    // HISTORY
    const [history, setHistory] = useState<History>({
        past: [],
        present: {
            shapeOrder: [],
            shapes: {},
            paths: {},
            points: {}
        },
        future: []
    });
    const { shapeOrder, shapes, paths, points } = history.present;
    // FILE
    const [fileName, setFileName] = useState<string>("NewFile");
    const [frame, setFrame] = useState<Rect>({ x: -500, y: -500, w: 1000, h: 1000 });

    // CANVAS
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null);

    //SHAPE
    const [hiddenShapeIds, setHiddenShapeIds] = useState<string[]>([]);
    const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

    const shape = selectedShapeId ? history.present.shapes[selectedShapeId] : null;

    // PATH
    const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
    // const [hiddenPathIndicies, setHiddenPathIndicies] = useState<number[]>([]);

    // POINT
    const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
    // auto updating selectedpoint logic
    const selectedPoint = selectedPointId ? history.present.points[selectedPointId] : null;
    // multiselect
    // const [selectedPointIds, setSelectedPointIds] = useState<Set<string>>(new Set());

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

    const draggingRef = useRef<{ index: number, handleIn: boolean } | null>(null);
    const dragDeltaRef = useRef<{ index: number; handleIn: boolean; dx: number; dy: number } | null>(null);

    const [tool, setTool] = useState<Tool>("Select");

    const [selectedExportScale, setSelectedExportScale] = useState<string>("1");


    // DRAG
    const [dragging, setDragging] = useState<boolean>(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    // Session LOADING
    useEffect(() => {
        const saved = localStorage.getItem("Session");
        if (!saved) return;
        try {

            const data = JSON.parse(saved) as {
                history: History;
                frame: Rect;
                tool: Tool;
            };
            // Extract each piece
            if (data.history) setHistory(data.history);
            if (data.frame) setFrame(data.frame);
            if (data.tool) setTool(data.tool);


        } catch (error) {
            console.warn("Failed to load session");
        }
        setLoaded(true);
    }, []);

    // Session SAVING
    useEffect(() => {
        if (!loaded) return;
        const SaveData = { history, frame, tool }
        var json = JSON.stringify(SaveData);
        localStorage.setItem("Session", json);

    }, [history, loaded, frame, tool]);

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

    }, [history.present.shapes, knobSize, hiddenShapeIds, selectedPoint]);

    function Draw() {

        const canvas = canvasRef.current
        if (!canvas) return;

        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

        ClearCanvas(ctx);

        ctx.setTransform(cameraRef.current.zoom, 0, 0, cameraRef.current.zoom, -cameraRef.current.x * cameraRef.current.zoom, -cameraRef.current.y * cameraRef.current.zoom)
        Object.values(history.present.shapes).forEach((shape) => { if (!hiddenShapeIds.includes(shape.id)) DrawShape(ctx, shape, history.present.paths, history.present.points) });

        const coCanvas = document.getElementById("CanvasOverlay") as HTMLCanvasElement;
        const coctx = coCanvas.getContext("2d") as CanvasRenderingContext2D;
        if (selectedPoint) {
            ClearCanvas(coctx);
            DrawHandleLines(coctx, selectedPoint, cameraRef.current, coCanvas)
        }
        else {
            ClearCanvas(coctx);
        }
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

    // ON SELECTED SHAPE CHANGED SET PATHINDEX TO 0 AND POINT INDEX TO "NULL" ELSE CRASH
    useEffect(() => {
        if (selectedShapeId !== null) {
            setSelectedPathId(null);
            setSelectedPointId(null);
        }
        else {

            setSelectedPathId(null);
            setSelectedPointId(null);
        }
    }, [selectedShapeId]);




    // HOTKEYS
    useEffect(() => {
        function handleKeyDown(e: globalThis.KeyboardEvent) {
            if (e.repeat) return;
            const active = document.activeElement;
            if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
                return; // skip hotkeys while typing
            }

            const key = e.key.toLowerCase();
            // 1️⃣ Special keys
            if (key === "delete") {
                if (selectedShapeId !== null) {
                    DeleteShape(selectedShapeId);
                }
                e.preventDefault();
                return;
            }
            if (e.code === "Space") {
                setTool("Pan");
                e.preventDefault();
                return;
            }

            // 2️⃣ Modifiers
            if (e.ctrlKey && !e.shiftKey && key === "z") {
                undo();
                e.preventDefault();
                return;
            }
            if (e.ctrlKey && e.shiftKey && key === "z") {
                redo();
                e.preventDefault();
                return;
            }
            if (e.ctrlKey && key === "d") {
                if (shape) {
                    const cloned = CloneShape(shape, paths, points);
                    AddNewShape("", cloned.shape);

                    // merge cloned paths and points into state
                    commit(prev => ({
                        ...prev,
                        paths: { ...prev.paths, ...cloned.paths },
                        points: { ...prev.points, ...cloned.points }
                    }));
                }
                e.preventDefault();
                return;
            }

            // 3️⃣ Single keys
            switch (key) {
                case "q": setTool("Select"); break;
                case "d": setTool("Delete"); break;
                case "f": setTool("Frame"); break;
                case "s": setTool("Scale"); break;
                case "r": setTool("Rotate"); break;
                case "a": setTool("Move"); break;
                case "w": setTool("Insert"); break;
            }
        }

        function handleKeyUp(e: globalThis.KeyboardEvent): void {
            if (e.code === "Space") {
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
    }, [shape, selectedShapeId]);


    // RESIZE CANVASES ON CHANGE
    useEffect(() => {
        const resizeHandler = () => {
            resizeCanvases(); // resize + redraw
        };

        const canvasContainer = document.getElementById("canvas-container");
        if (!canvasContainer) return;

        // Watch for container size changes
        const observer = new ResizeObserver(resizeHandler);
        observer.observe(canvasContainer);

        // Also handle window resize
        window.addEventListener("resize", resizeHandler);

        // Initial call
        resizeCanvases();

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", resizeHandler);
        };
    }, [canvasRef.current]);

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

        if (showGrid) ReDrawGrid();
        Draw(); // redraw after resizing
    }

    function changeDetected(): boolean {
        const current = history.present.shapes;
        const lastPast = history.past[history.past.length - 1]?.shapes;

        if (!lastPast) return false;

        return !shapesEqual(
            Object.values(current),
            Object.values(lastPast),
            history.present.paths,
            history.past[history.past.length - 1].paths,
            history.present.points,
            history.past[history.past.length - 1].points
        );
    }

    function handleAddCurveToPoint(pointId: string) {
        if (!selectedPathId) return;

        commit(prev => {
            const path = prev.paths[selectedPathId];
            if (!path) return prev;

            const n = path.pointIds.length;
            const index = path.pointIds.indexOf(pointId);
            if (index === -1) return prev;

            const prevId = path.pointIds[(index - 1 + n) % n];
            const nextId = path.pointIds[(index + 1) % n];

            const p = prev.points[pointId];
            const prevPoint = prev.points[prevId];
            const nextPoint = prev.points[nextId];

            const newP = lerpVec2(p, prevPoint, 0.5);
            const newN = lerpVec2(p, nextPoint, 0.5);

            const updatedPoint: Point = {
                ...p,
                in: { x: newP.x, y: newP.y },
                out: { x: newN.x, y: newN.y }
            };

            return {
                ...prev,
                points: { ...prev.points, [pointId]: updatedPoint }
            };
        });
    }
    function handleRemovePoint(pointId: string) {
        if (!selectedPathId) return;

        commit(prev => {
            const path = prev.paths[selectedPathId];
            if (!path) return prev;

            // remove the point ID from the path
            const newPointIds = path.pointIds.filter(pid => pid !== pointId);
            const newPath = { ...path, pointIds: newPointIds };

            // remove the point from the points table
            const { [pointId]: _, ...newPoints } = prev.points;

            return {
                ...prev,
                paths: { ...prev.paths, [selectedPathId]: newPath },
                points: newPoints
            };
        });

        // update selection
        setSelectedPointId(prev => (prev === pointId ? null : prev));
    }

    // ================================================================================================================
    // MOVE 
    // ================================================================================================================
    function MovePoint(p: Point, dx: number, dy: number) {
        p.x += dx;
        p.y += dy;

        if (p.in) {
            p.in.x += dx;
            p.in.y += dy;
        }

        if (p.out) {
            p.out.x += dx;
            p.out.y += dy;
        }
    }
    // ================================================================================================================
    // ROTATE
    // ================================================================================================================
    function RotatePoint(p: Point, center: { x: number; y: number; }, cos: number, sin: number) {
        const offsetX = p.x - center.x;
        const offsetY = p.y - center.y;

        // apply rotation
        const rotatedX = offsetX * cos - offsetY * sin;
        const rotatedY = offsetX * sin + offsetY * cos;

        p.x = center.x + rotatedX;
        p.y = center.y + rotatedY;

        if (p.in) {
            const inOffsetX = p.in.x - center.x;
            const inOffsetY = p.in.y - center.y;

            // apply rotation
            const rotatedInX = inOffsetX * cos - inOffsetY * sin;
            const rotatedInY = inOffsetX * sin + inOffsetY * cos;

            p.in.x = center.x + rotatedInX;
            p.in.y = center.y + rotatedInY;
        }
        if (p.out) {
            const outOffsetX = p.out.x - center.x;
            const outOffsetY = p.out.y - center.y;

            // apply rotation
            const rotatedOutX = outOffsetX * cos - outOffsetY * sin;
            const rotatedOutY = outOffsetX * sin + outOffsetY * cos;

            p.out.x = center.x + rotatedOutX;
            p.out.y = center.y + rotatedOutY;
        }
    }
    // ================================================================================================================
    // SCALE
    // ================================================================================================================
    function ScalePoint(p: Point, center: { x: number; y: number }, scaleFactor: number) {
        p.x = center.x + (p.x - center.x) * scaleFactor;
        p.y = center.y + (p.y - center.y) * scaleFactor;
        if (p.in) {
            p.in.x = center.x + (p.in.x - center.x) * scaleFactor;
            p.in.y = center.y + (p.in.y - center.y) * scaleFactor;
        }
        if (p.out) {
            p.out.x = center.x + (p.out.x - center.x) * scaleFactor;
            p.out.y = center.y + (p.out.y - center.y) * scaleFactor;
        }
    }

    function handleMouseMove(e: React.DragEvent<HTMLCanvasElement>) {

        if (!canvasRef.current) return;

        var cmp = getCanvasMousePos(e, canvasRef.current)

        let screenX = cmp.x;
        let screenY = cmp.y;

        if (tool === "Move" && dragging && lastMouseRef.current) {
            // return if no shape selected

            // move all points in paths in shape

            if (!selectedShapeId) return;

            const dx = (screenX - dragOffset.current.x) / cameraRef.current.zoom;
            const dy = (screenY - dragOffset.current.y) / cameraRef.current.zoom;

            const shapeIdsToChange = e.ctrlKey ?
                Object.keys(history.present.shapes) : [selectedShapeId]

            shapeIdsToChange.forEach(shapeId => {
                const shape = history.present.shapes[shapeId];
                if (!shape) return;

                shape.pathIds.forEach(pathId => {
                    const path = history.present.paths[pathId];
                    if (!path) return;

                    path.pointIds.forEach(pointId => {
                        const p = history.present.points[pointId];
                        if (!p) return;

                        // mutate in place
                        p.x += dx;
                        p.y += dy;
                    });
                });
            });


            dragOffset.current = { x: screenX, y: screenY };
            Draw();
            ReDrawGrid();

        }
        else if (tool === "Rotate" && dragging && lastMouseRef.current) {
            if (!selectedShapeId) return;

            const dy = screenY - lastMouseRef.current.y;

            lastMouseRef.current = { x: screenX, y: screenY };


            const shapeIdsToChange = e.ctrlKey ?
                Object.keys(history.present.shapes) : [selectedShapeId]

            shapeIdsToChange.forEach(shapeId => {
                const shape = history.present.shapes[shapeId];
                if (!shape) return;

                const center = getShapeCenter(shape, paths, points);

                // Rotate based on vertical mouse delta (dy)
                // You can tweak the factor to control sensitivity
                const angle = dy * 0.01; // radians
                const sin = Math.sin(angle);
                const cos = Math.cos(angle);
                shape.pathIds.forEach(pathId => {
                    const path = history.present.paths[pathId];
                    if (!path) return;

                    path.pointIds.forEach(pointId => {
                        const p = history.present.points[pointId];
                        if (!p) return;

                        // mutate in place
                        RotatePoint(p, center, cos, sin);
                    });
                });
            });
            dragOffset.current = { x: screenX, y: screenY };
            Draw();
        }
        else if (tool === "Scale" && dragging && lastMouseRef.current) {
            if (!selectedShapeId) return;
            // const dx = screenX - lastMouseRef.current.x;
            const dy = screenY - lastMouseRef.current.y;

            lastMouseRef.current = { x: screenX, y: screenY };

            const shapeIdsToChange = e.ctrlKey ?
                Object.keys(history.present.shapes) : [selectedShapeId]

            shapeIdsToChange.forEach(shapeId => {
                const shape = history.present.shapes[shapeId];
                if (!shape) return;

                const center = getShapeCenter(shape, paths, points);

                const scaleFactor = Math.max(0.1, 1 + dy * 0.01);

                shape.pathIds.forEach(pathId => {
                    const path = history.present.paths[pathId];
                    if (!path) return;

                    path.pointIds.forEach(pointId => {
                        const p = history.present.points[pointId];
                        if (!p) return;

                        // mutate in place
                        ScalePoint(p, center, scaleFactor);
                    });
                });
            });
            dragOffset.current = { x: screenX, y: screenY };
            Draw();
        }
        else if (tool === "Frame" && dragging && lastMouseRef.current) {
            if (!lastMouseRef.current) return

            // delta in screen pixels
            const dx = (screenX - lastMouseRef.current.x) / cameraRef.current.zoom;
            const dy = (screenY - lastMouseRef.current.y) / cameraRef.current.zoom;

            // convert to world units by dividing by zoom once
            if (e.ctrlKey) {
                setFrame(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            }
            else if (e.shiftKey) {
                setFrame(prev => ({ ...prev, w: prev.h + dy, h: prev.h + dy }));
            }
            else {
                setFrame(prev => ({ ...prev, w: prev.w + dx, h: prev.h + dy }));
            }

            lastMouseRef.current = { x: screenX, y: screenY }


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
        else if (tool === "Insert") {
            if (!selectedPathId) return;
            if (!selectedShapeId) return;
            const threshold = 10; // pixels
            const worldPos = screenToWorld(screenX, screenY, cameraRef.current);
            var seg = getHoveredSegment(paths, points, threshold, worldPos.x, worldPos.y, selectedPathId);
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
                const path = paths[selectedPathId];
                const pointIds = path.pointIds;
                const shapePoints = Object.values(pointIds).map(pid => points[pid]);


                const n = shapePoints.length;
                const start = shapePoints[seg];
                const end = shapePoints[(seg + 1) % n]; // loops back to first point if last

                const c1 = start.out ?? start;
                const c2 = end.in ?? end;

                var pos = cubicBezierPoint(0.5, start, c1, c2, end);

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
    // ================================================================================================================
    // POINT HANDLES  
    // ================================================================================================================
    function startHandleDrag(e: React.MouseEvent, index: number, handleIn: boolean) {
        if (!canvasRef.current) return;
        lastMouseRef.current = getCanvasMousePos(e, canvasRef.current);
        draggingRef.current = { index, handleIn };
        window.addEventListener("mousemove", onHandleMouseMove);
        window.addEventListener("mouseup", stopHandleDrag);
        e.preventDefault();
    }

    // POINT HANDLES
    function onHandleMouseMove(e: MouseEvent) {
        if (!draggingRef.current) return;
        handleDrag(e as unknown as React.MouseEvent, draggingRef.current.index, draggingRef.current.handleIn);
    }


    // POINT HANDLES
    function handleDrag(e: React.MouseEvent, index: number, handleIn: boolean) {
        if (!canvasRef.current || !lastMouseRef.current || !selectedShapeId || !selectedPathId) return;

        const cmp = getCanvasMousePos(e, canvasRef.current);
        const mouseWorld = screenToWorld(cmp.x, cmp.y, cameraRef.current);
        const lastWorld = screenToWorld(lastMouseRef.current.x, lastMouseRef.current.y, cameraRef.current);

        const dx = mouseWorld.x - lastWorld.x;
        const dy = mouseWorld.y - lastWorld.y;

        dragDeltaRef.current = { index, handleIn, dx, dy };

        // Apply delta for live preview by mutating history.present.shapes
        const shape = shapes[selectedShapeId];
        if (!shape) return;

        const path = paths[selectedPathId];
        if (!path) return;

        const point = points[index];
        if (!point) return;

        // safely update live preview
        const newIn = handleIn && point.in ? { x: point.in.x + dx, y: point.in.y + dy } : point.in;
        const newOut = !handleIn && point.out ? { x: point.out.x + dx, y: point.out.y + dy } : point.out;

        point.in = newIn;
        point.out = newOut;

        lastMouseRef.current = cmp;
    }

    function stopHandleDrag() {
        // if no drag is in progress, just remove listeners and exit
        if (!draggingRef.current || !dragDeltaRef.current || !selectedPathId) {
            window.removeEventListener("mousemove", onHandleMouseMove);
            window.removeEventListener("mouseup", stopHandleDrag);
            dragDeltaRef.current = null;
            draggingRef.current = null;
            return;
        }

        // safe to commit now
        const { index, handleIn, dx, dy } = dragDeltaRef.current;

        commit(prev => {
            const path = prev.paths[selectedPathId];
            if (!path) return prev;

            const pointId = path.pointIds[index];
            const p = prev.points[pointId];
            if (!p) return prev;

            const updatedPoint: Point = {
                ...p,
                in: handleIn && p.in ? { x: p.in.x + dx, y: p.in.y + dy } : p.in,
                out: !handleIn && p.out ? { x: p.out.x + dx, y: p.out.y + dy } : p.out
            };

            return {
                ...prev,
                points: { ...prev.points, [pointId]: updatedPoint }
            };
        });
        dragDeltaRef.current = null;
        draggingRef.current = null;
        window.removeEventListener("mousemove", onHandleMouseMove);
        window.removeEventListener("mouseup", stopHandleDrag);
    }
    // =================================================================================================================
    // POINT HANDLES
    // =================================================================================================================

    function handleKnobMouseDown(e: React.MouseEvent<HTMLDivElement>, id: string) {
        const knob = e.currentTarget as HTMLDivElement;
        knob.style.pointerEvents = "none";
        knob.style.display = "none";

        if (tool === "Delete") {
            handleRemovePoint(id)
        };
        if (tool === "Select" || tool === "Move" || tool === "Insert") {
            startDragging(id);
            setSelectedPointId(id);
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

        if (tool === "Pan" || tool === "Scale" || tool === "Rotate" || tool === "Frame") {
            lastMouseRef.current = { x: screenX, y: screenY }
        }
        if (tool === "Select" || tool === "Move" || tool === "Scale" || tool === "Rotate") {
            selectShapeAt(ctx, screenX, screenY);
        }
        else if (tool === "Insert") {
            let targetId = selectedShapeId;
            if (e.shiftKey) {
                const newShape = AddNewShape("empty"); // this should also select it
                targetId = newShape.id;

            }
            else if (e.ctrlKey) {
                AddNewPath();
            }
            else {
                ClearOverlayCanvas();
                if (targetId)
                    handleCreatePoint(e, targetId);

            }
        }

        if (selectedShapeId !== null) { // this doesnt work because selectedshapeindex is never -1 so drag is always set on click

            dragOffset.current = { x: screenX, y: screenY };
        }
        setDragging(true);
    }

    function ClearOverlayCanvas() {
        var co = document.getElementById("CanvasOverlay") as HTMLCanvasElement;
        var coctx = co.getContext("2d") as CanvasRenderingContext2D;
        ClearCanvas(coctx);
    }

    function handleMouseUp(_e: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
        setDragging(false);


        if (changeDetected()) {

            commit(prev => prev);
        }
    }

    function selectShapeAt(ctx: CanvasRenderingContext2D, x: number, y: number) {
        const prevShapeId = selectedShapeId;
        const prevPathId = selectedPathId;

        setSelectedShapeId(null);
        setSelectedPathId(null);
        setSelectedPointId(null);

        // iterate shapes in reverse order
        const shapesArray = Object.values(history.present.shapes);
        for (let i = shapesArray.length - 1; i >= 0; i--) {
            const shape = shapesArray[i];
            buildPath(ctx, shape, history.present.paths, history.present.points);

            if (ctx.isPointInPath(x, y)) {
                setSelectedShapeId(shape.id);

                let nextPathId: string | null = null;

                if (shape.id === prevShapeId && prevPathId) {
                    const pathIds = shape.pathIds;
                    const index = pathIds.indexOf(prevPathId);
                    nextPathId = pathIds[(index + 1) % pathIds.length];
                } else {
                    // default to first path
                    nextPathId = shape.pathIds[0] ?? null;
                }

                setSelectedPathId(nextPathId);
                break;
            }
        }
    }
    function buildPath(ctx: CanvasRenderingContext2D, shape: Shape, paths: Record<string, Path>, points: Record<string, Point>) {
        ctx.beginPath();
        shape.pathIds.forEach(pathId => {
            const path = paths[pathId];
            if (!path) return;

            const pts = path.pointIds.map(pid => points[pid]).filter(Boolean);
            if (pts.length === 0) return;

            ctx.moveTo(pts[0].x, pts[0].y);

            for (let i = 1; i < pts.length; i++) {
                const prev = pts[i - 1];
                const curr = pts[i];
                ctx.bezierCurveTo(
                    prev.out?.x ?? prev.x,
                    prev.out?.y ?? prev.y,
                    curr.in?.x ?? curr.x,
                    curr.in?.y ?? curr.y,
                    curr.x, curr.y
                );
            }
            if (shape.cyclic && pts.length > 1) {
                const last = pts[pts.length - 1];
                const first = pts[0];

                ctx.bezierCurveTo(
                    last.out?.x ?? last.x,
                    last.out?.y ?? last.y,
                    first.in?.x ?? first.x,
                    first.in?.y ?? first.y,
                    first.x,
                    first.y
                );
                ctx.closePath(); // optional for closed shapes
            }
        });
    }


    function MovePointById(pointId: string, newPoint: Point) {
        if (changeDetected()) {
            commit(prev => {
                const p = prev.points[pointId];
                if (!p) return prev;

                return {
                    ...prev,
                    points: {
                        ...prev.points,
                        [pointId]: {
                            ...p,
                            x: newPoint.x,
                            y: newPoint.y
                        }
                    }
                };
            });
        }

        setSelectedPointId(pointId);
    }

    function handleCreatePoint(e: React.MouseEvent<HTMLCanvasElement>, targetShapeId: string) {
        if (!canvasRef.current) return;
        if (!selectedPathId) return;

        let shapeId = targetShapeId;
        let pathId = selectedPathId;
        let shape = history.present.shapes[shapeId];


        // if no shape exists, create one
        if (!shape) {
            const newShape = CreateBaseShape(); // should generate id + empty pathIds
            commit(prev => {
                return {
                    ...prev,
                    shapes: { ...prev.shapes, [newShape.id]: newShape }
                };
            });

            shape = newShape;
            shapeId = newShape.id;
            pathId = newShape.pathIds[0]; // first path id
            setSelectedShapeId(shapeId);
            setSelectedPathId(pathId);
        }

        const path = history.present.paths[pathId];
        if (!path) return;

        const cam = cameraRef.current;
        const cmp = getCanvasMousePos(e, canvasRef.current);
        let x = cmp.x / cam.zoom + cam.x;
        let y = cmp.y / cam.zoom + cam.y;

        // create the new point
        let newPoint: Point;

        if (selectedSegment !== -1) {
            // insert along existing segment
            const n = path.pointIds.length;
            const start = history.present.points[path.pointIds[selectedSegment]];
            const end = history.present.points[path.pointIds[(selectedSegment + 1) % n]];

            const c1 = start.out ?? start;
            const c2 = end.in ?? end;

            const newPointId = crypto.randomUUID();
            newPoint = { id: newPointId, ...cubicBezierPoint(0.5, start, c1, c2, end) };

            // insert point in points table
            commit(prev => {
                const points = { ...prev.points, [newPointId]: newPoint };
                const newPath = {
                    ...prev.paths[pathId],
                    pointIds: [
                        ...prev.paths[pathId].pointIds.slice(0, selectedSegment + 1),
                        newPointId,
                        ...prev.paths[pathId].pointIds.slice(selectedSegment + 1)
                    ]
                };

                return {
                    ...prev,
                    points,
                    paths: { ...prev.paths, [pathId]: newPath }
                };
            });

            setSelectedPointId(newPoint.id);
            startDragging(newPoint.id);

        } else {
            // insert at end, possibly snap to grid
            if (snapToGrid) {
                const spacing = 1000 / gridSubdivions;
                x = Math.round(x / spacing) * spacing;
                y = Math.round(y / spacing) * spacing;
            }

            const newPointId = crypto.randomUUID();
            newPoint = { x, y, id: newPointId };

            commit(prev => {
                const points = { ...prev.points, [newPointId]: newPoint };
                const newPath = { ...prev.paths[pathId], pointIds: [...prev.paths[pathId].pointIds, newPointId] };

                return {
                    ...prev,
                    points,
                    paths: { ...prev.paths, [pathId]: newPath }
                };
            });

            setSelectedPointId(newPointId);
            startDragging(newPointId);
        }
    }

    // function insertPointAt(index: number, x: number, y: number) {
    //     const newPoint = { x, y };


    //     commit(prev =>
    //         prev.map((s, i) => {
    //             if (i !== selectedShapeId) return s;

    //             const newPaths = [...s.pathIds];
    //             const currentPath = newPaths[selectedPathId];

    //             const newPoints = [...currentPath.points];
    //             newPoints.splice(index + 1, 0, newPoint);

    //             newPaths[selectedPathId] = {
    //                 ...currentPath,
    //                 points: newPoints
    //             };

    //             return { ...s, pathIds: newPaths };
    //         })
    //     );
    // }


    function handleKnobSize(e: React.ChangeEvent<HTMLInputElement, Element>) {
        setKnobSize(Number(e.target.value))
    }

    function handleSelectPoint(e: React.ChangeEvent<HTMLInputElement>): void {
        if (!selectedPathId) return;

        const path = paths[selectedPathId];
        if (!path) return;

        const pointCount = path.pointIds.length;
        let index = Number(e.target.value);
        index = (index + pointCount) % pointCount; // wrap around cyclically

        if (index >= 0 && index < pointCount) {
            const pointId = path.pointIds[index];
            setSelectedPointId(pointId); // select by ID, not index
        }
    }

    function startDragging(id: string) {
        if (!canvasRef.current) return;

        if (selectedShapeId === null || selectedPathId === null) return;

        const startPoint = points[id];

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

            const dx = x - points[id].x;
            const dy = y - points[id].y;

            const p = points[id];

            p.x = x;
            p.y = y;

            if (p.in) {
                p.in.x += dx;
                p.in.y += dy;
            }

            if (p.out) {
                p.out.x += dx;
                p.out.y += dy;
            }
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


        ExportShape(selectedExportScale, fileName, shapes, paths, points, frame);
    }

    function handleSave(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        SaveFile(fileName, shapeOrder, shapes, paths, points, showGrid, snapToGrid, gridSubdivions);
    }
    function handleLoad(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        LoadFile(setFileName, commit, setShowGrid, setSnapToGrid, setGridSubdivisions);
    }

    function handleClickAddShape(shape: string): void {
        AddNewShape(shape);
    }

    function AddNewShape(shapeName: string, shape: Shape | null = null): Shape {
        // create new shape
        let newShape: Shape = shape ?? CreateBaseShape();

        if (!shape) {
            if (shapeName === "circle") newShape = CreateBaseShape([CreateCircle()]);
            else if (shapeName === "square") newShape = CreateBaseShape([CreateSquare()]);
            else if (shapeName === "triangle") newShape = CreateBaseShape([CreateTriangle()]);
        }

        // build tables for the shape’s paths and points
        const shapePaths: Record<string, Path> = {};
        const shapePoints: Record<string, Point> = {};

        newShape.pathIds.forEach(pathId => {
            const path = CreateEmptyPath(); // or pull from somewhere if you have default paths
            path.id = pathId;
            shapePaths[pathId] = path;

            path.pointIds.forEach(pid => {
                const pt = { id: "", x: 0, y: 0 }; // or pull from default points
                pt.id = pid;
                shapePoints[pid] = pt;
            });
        });

        commit(prev => ({
            ...prev,
            shapes: { ...prev.shapes, [newShape.id]: newShape },
            paths: { ...prev.paths, ...shapePaths },
            points: { ...prev.points, ...shapePoints }
        }));

        setSelectedShapeId(newShape.id);
        setSelectedPathId(null);

        return newShape;
    }

    function DeleteSelectedShape(): void {
        if (selectedShapeId === null) return;
        commit((prev: HistoryState) => {
            const newShapes = { ...prev.shapes };
            delete newShapes[selectedShapeId];
            return {
                ...prev, shapes: newShapes
            };
        });
        setSelectedShapeId(null);
        setSelectedSegment(0);
    }

    function DeleteShape(id: string): void {
        if (id === null) return;
        commit((prev: HistoryState) => {
            const newShapes = { ...prev.shapes };
            delete newShapes[id];
            return {
                ...prev, shapes: newShapes
            };
        });
        setSelectedShapeId(null);
        setSelectedSegment(0);
    }

    // update shape helper
    function updateSelectedShape(updater: (shape: Shape) => Shape) {
        if (!selectedShapeId) return;

        commit((prev: HistoryState) => {
            const shape = prev.shapes[selectedShapeId];
            if (!shape) return prev;

            const newShape = updater(shape);

            const newShapes = { ...prev.shapes };
            newShapes[selectedShapeId] = newShape;

            return {
                ...prev,
                shapes: newShapes
            };
        });
    }
    // function updateShape(index: number, updater: (shape: Shape) => Shape) {
    //     commit(prev =>
    //         prev.map((s, i) => (i === index ? updater(s) : s))
    //     );
    // }

    function handleClickAddNewPath(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        AddNewPath();
    }

    function AddNewPath(): void {
        if (selectedShapeId === null) return;

        commit((prev: HistoryState) => {

            const shape = prev.shapes[selectedShapeId];
            if (!shape) return prev;

            const newPath: Path = ({
                id: crypto.randomUUID(),
                isHole: false,
                pointIds: []
            });

            const newShape: Shape = {
                ...shape, pathIds: [...shape.pathIds, newPath.id]
            }

            const newShapes = { ...prev.shapes };
            newShapes[selectedShapeId] = newShape;

            const newPaths = { ...prev.paths };
            newPaths[newPath.id] = newPath;

            setSelectedPathId(newPath.id);

            return {
                ...prev,
                shapes: newShapes,
                paths: newPaths
            }
        });
    }
    function DeleteSelectedPath(): void {
        if (!selectedShapeId || !selectedPathId) return;

        commit((prev: HistoryState) => {

            const shape = prev.shapes[selectedShapeId];
            if (!shape) return prev;

            const newPathIds = shape.pathIds.filter(id => id !== selectedPathId);

            const newShape: Shape = {
                ...shape,
                pathIds: newPathIds
            };

            const newShapes = { ...prev.shapes };
            newShapes[selectedShapeId] = newShape;

            const newPaths = { ...prev.paths };
            delete newPaths[selectedPathId];

            return {
                ...prev,
                shapes: newShapes,
                paths: newPaths
            };
        });

        setSelectedPathId(null);
    }
    function DeletePath(shapeId: string, pathId: string): void {

        commit((prev: HistoryState) => {

            const shape = prev.shapes[shapeId];
            if (!shape) return prev;

            const newShape: Shape = {
                ...shape,
                pathIds: shape.pathIds.filter(id => id !== pathId)
            };

            const newShapes = { ...prev.shapes };
            newShapes[shapeId] = newShape;

            const newPaths = { ...prev.paths };
            delete newPaths[pathId];

            return {
                ...prev,
                shapes: newShapes,
                paths: newPaths
            };
        });

        setSelectedPathId(null);
    }
    function HideShape(id: string, hide: boolean): void {
        if (hide) {

            setHiddenShapeIds(prev => [...prev, id]);
        }
        else {

            setHiddenShapeIds(prev => prev.filter(p => p !== id));
        }
    }
    // function HidePath(i: number, hide: boolean): void {
    //     if (hide) {

    //         setHiddenPathIndicies(prev => [...prev, i]);
    //     }
    //     else {

    //         setHiddenPathIndicies(prev => prev.filter(p => p !== i));
    //     }
    // }

    function moveForward() {
        commit((prev: HistoryState) => {

            const id = selectedShapeId;
            if (!id) return prev;

            const index = prev.shapeOrder.indexOf(id);
            if (index === -1 || index === prev.shapeOrder.length - 1) return prev;

            const newOrder = [...prev.shapeOrder];

            [newOrder[index], newOrder[index + 1]] =
                [newOrder[index + 1], newOrder[index]];

            setSelectedShapeId(id);

            return {
                ...prev,
                shapeOrder: newOrder
            };
        });
    }
    function moveBackward() {
        commit((prev: HistoryState) => {

            const id = selectedShapeId;
            if (!id) return prev;

            const index = prev.shapeOrder.indexOf(id);
            if (index <= 0) return prev;

            const newOrder = [...prev.shapeOrder];

            [newOrder[index], newOrder[index - 1]] =
                [newOrder[index - 1], newOrder[index]];

            return {
                ...prev,
                shapeOrder: newOrder
            };
        });
    }

    // type Commit = (updater: (prev: Shape[]) => Shape[]) => void;

    function commit(updater: (prev: HistoryState) => HistoryState) {
        setHistory(prev => {
            const newPresent = updater(prev.present);

            return {
                past: [...prev.past, prev.present], // shallow copy of previous present
                present: newPresent,
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
    function setShapeName(name: string, id: string): void {
        commit((prev: HistoryState) => {
            const shape = prev.shapes[id];
            if (!shape) return prev;

            const newShape = { ...shape, name };

            const newShapes = {
                ...prev.shapes,
                [id]: newShape
            };

            return {
                ...prev,
                shapes: newShapes
            }
        });
    }
    function getShapeIdOfPath(pathId: string): string | null {
        const shapes = history.present.shapes;
        for (const shapeId in shapes) {
            if (shapes[shapeId].pathIds.includes(pathId)) {
                return shapeId;
            }
        }
        return null; // not found
    }

    function clearDocument(): void {
        setHistory({
            past: [],
            present: {
                shapeOrder: [],
                shapes: {},
                paths: {},
                points: {}
            },
            future: []
        });
        setSelectedPointId(null);
        setSelectedPathId(null);
        setSelectedShapeId(null);
        localStorage.removeItem("Session");
        if (canvasRef.current) ClearCanvas(canvasRef.current.getContext("2d")!);
    }

    function resetCamera() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        var w = canvas.width;
        var h = canvas.height;
        cameraRef.current.x = 0 - w / 2;
        cameraRef.current.y = 0 - h / 2;
        cameraRef.current.zoom = 1;
        Draw();
        ReDrawGrid();
    }

    function centerCamera() {
        const canvas = canvasRef.current;
        if (!canvas || !shape) return;

        const center = getShapeCenter(shape, paths, points);
        const zoom = cameraRef.current.zoom;

        cameraRef.current.x = center.x - canvas.width / (2 * zoom);
        cameraRef.current.y = center.y - canvas.height / (2 * zoom);

        Draw();
        ReDrawGrid();
    }

    return (
        <>
            <div className="flex flex-row justify-between h-screen ">
                <PanelContainer title="TOOLS" left={true}>


                    <button className={`${tool === "Select" ? "selected" : ""} `} onClick={() => setTool("Select")} title="Select(Q)"><i className="fa-solid fa-arrow-pointer"></i></button>
                    <button className={`${tool === "Insert" ? "selected" : ""} `} onClick={() => setTool("Insert")} title="Insert(W)"><i className="fa-solid fa-pencil"></i></button>
                    <button className={`${tool === "Move" ? "selected" : ""} `} onClick={() => setTool("Move")} title="Move(A)"><i className="fa-solid fa-arrows-up-down-left-right"></i></button>
                    <button className={`${tool === "Rotate" ? "selected" : ""} `} onClick={() => setTool("Rotate")} title="Rotate(R)"><i className="fa-solid fa-rotate"></i></button>
                    <button className={`${tool === "Scale" ? "selected" : ""} `} onClick={() => setTool("Scale")} title="Scale(S)"><i className="fa-solid fa-up-right-and-down-left-from-center"></i></button>
                    <button className={`${tool === "Delete" ? "selected" : ""} `} onClick={() => setTool("Delete")} title="Delete(D)"><i className="fa-solid fa-eraser"></i></button>
                    <button className={`${tool === "Pan" ? "selected" : ""} `} onClick={() => setTool("Pan")} title="Pan(Space)"><i className="fa-solid fa-hand"></i></button>
                    <button className={`${tool === "Frame" ? "selected" : ""} `} onClick={() => setTool("Frame")} title="Frame(F)"><i className="fa-solid fa-crop-simple"></i></button>

                </PanelContainer>
                {/* shaped and paths */}
                <PanelContainer title="" left={true}>


                    <Panel title="Shapes">
                        <div className="flex flex-col gap-2">
                            {history.present && selectedShapeId && Object.values(history.present.shapes).map((s) => {
                                return (
                                    <div key={s.id} className="flex flex-row gap-2 justify-between">
                                        <button className={`${s.id === selectedShapeId ? "selected" : ""}`} onClick={() => setSelectedShapeId(s.id)}>{s.name || "shape"} paths: {s.pathIds.length}</button>
                                        <button title="Delete" onClick={() => DeleteShape(s.id)}><i className="fa fa-x"></i></button>
                                        <button title="Hide" className={`${!hiddenShapeIds.includes(s.id) ? "selected" : ""}`} onClick={() => HideShape(s.id, !hiddenShapeIds.includes(s.id))}><i className="fa fa-eye"></i></button>
                                    </div>
                                )
                            })}
                            <br />
                            <h2>Paths</h2>
                            {history.present && history.present.paths && Object.values(history.present.paths).map((p) => {
                                return (
                                    <div key={p.id} className="flex flex-row gap-2 justify-between">
                                        <button className={`${p.id === selectedPathId ? "selected" : ""}`} onClick={() => setSelectedPathId(p.id)}>Path_{p.id} points: {p.pointIds.length}</button>
                                        <button title="Delete" onClick={() => { const shapeId = getShapeIdOfPath(p.id); if (shapeId) DeletePath(shapeId, p.id) }}><i className="fa fa-x"></i></button>
                                        {/* <button className={`${!hiddenPathIndicies.includes(i) ? "selected" : ""}`} onClick={() => HidePath(i, !hiddenPathIndicies.includes(i))}><i className="fa fa-eye"></i></button> */}
                                    </div>
                                )
                            })}
                        </div>
                    </Panel>
                </PanelContainer>


                <div id="middle_column" className="flex flex-col flex-1 w-screen h-screen ">
                    <div className='top-0 shrink-0'>
                        <div className='flex flex-row gap-2'>
                            {/* app icon */}
                            {/* <img className="size-16" src="./donut.png"></img> */}
                            <h2 className='m-4 text-zinc-400 flex text-center'>{APP_NAME} - {fileName}</h2>
                        </div>
                    </div>
                    <div id="canvas-container" className="flex flex-col gap-4 flex-1  overflow-hidden">
                        {/* Tooltip */}
                        <p className="absolute w-50% z-40 p-10 text-zinc-500 pointer-events-none">Tooltip: {toolTooltip(tool)}</p>


                        {/* Knobs */}
                        <div id="Knobs" className="relative flex-1 overflow-hidden">

                            {showKnobs && !dragging && selectedPathId &&
                                shape && paths[selectedPathId]?.pointIds.map((pointId, i) => {
                                    const p = points[pointId];
                                    if (!p) return null;

                                    if (canvasRect == null) return;

                                    const selected = selectedPointId === pointId;
                                    if (!canvasRef.current) return;

                                    const pointScreen = worldToScreen(p.x, p.y, cameraRef.current, canvasRef.current);
                                    const inScreen = p.in && worldToScreen(p.in.x, p.in.y, cameraRef.current, canvasRef.current);
                                    const outScreen = p.out && worldToScreen(p.out.x, p.out.y, cameraRef.current, canvasRef.current);
                                    return (
                                        <div key={p.id}>
                                            <Knob x={pointScreen.x} y={pointScreen.y} id={pointId} selected={selected} size={knobSize} tool={tool} handleKnobMouseDown={handleKnobMouseDown}></Knob>

                                            {
                                                inScreen && selected &&
                                                <Handle x={inScreen.x} y={inScreen.y} handleIn={true} i={i} size={knobSize} startHandleDrag={startHandleDrag}></Handle>
                                            }
                                            {
                                                outScreen && selected &&
                                                <Handle x={outScreen.x} y={outScreen.y} handleIn={false} i={i} size={knobSize} startHandleDrag={startHandleDrag}></Handle>
                                            }
                                        </div>
                                    )
                                })
                            }

                            {/* Export frame */}
                            {tool === "Frame" && canvasRef.current && canvasRef.current &&
                                (() => {
                                    const pos = worldToScreen(frame.x, frame.y, cameraRef.current, canvasRef.current);
                                    return (
                                        <div
                                            style={{ left: pos.x, top: pos.y, width: frame.w * cameraRef.current.zoom, height: frame.h * cameraRef.current.zoom, boxShadow: "0 0 0 10000px rgba(0,0,0,0.4)" }}
                                            className="absolute pointer-events-none z-30 border border-white overflow-visible"
                                        >
                                            <div className="flex flex-col -translate-y-24 absolute ">
                                                <p>W: {frame.w.toFixed(1)},H: {frame.h.toFixed(1)}</p>
                                                <p>drag to scale</p>
                                                <p>ctrl drag to move</p>
                                                <p>shift drag to scale uniform</p>
                                            </div>
                                        </div>

                                    );
                                })()
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
                <PanelContainer title="Controls" left={false}>

                    <div id={"controls-content "} className="flex flex-col gap-4">
                        {/* Selected point */}
                        <Panel title="History">
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

                        </Panel>
                        {selectedPointId !== null &&
                            <Panel title="Selected point">
                                <div className="flex flex-row gap-2 ">
                                    <input className="w-[10ch]" type="number" value={selectedPointId} onChange={handleSelectPoint}></input>
                                    <button title="Delete point" onClick={() => handleRemovePoint(selectedPointId)}><i className="fa-solid fa-x"></i></button>
                                    <button title="Curve point" onClick={() => handleAddCurveToPoint(selectedPointId)}><i className="fa-solid fa-bezier-curve"></i></button>
                                </div>
                                {selectedPointId !== null && selectedPoint && shape &&
                                    (
                                        <div className="flex flex-row gap-2">
                                            <div className="flex flex-row gap-2">
                                                <label>X:</label>
                                                <input
                                                    className="w-[10ch]"
                                                    type="number"
                                                    value={selectedPoint.x.toFixed(3)}
                                                    onChange={(e) =>
                                                        MovePointById(
                                                            selectedPointId,
                                                            { id: selectedPoint.id, x: Number(e.target.value), y: selectedPoint.y }
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
                                                        MovePointById(
                                                            selectedPointId,
                                                            { id: selectedPoint.id, x: selectedPoint.x, y: Number(e.target.value) }
                                                        )}
                                                ></input>
                                            </div>
                                        </div>
                                    )
                                }
                            </Panel>
                        }
                        <Panel title="New shape">
                            <div className="flex flex-row gap-2">
                                <button title="Add empty shape" onClick={() => handleClickAddShape("empty")}><i className="fa fa-plus"></i></button>
                                <button title="Add circle shape" onClick={() => handleClickAddShape("circle")}><i className="fa fa-circle"></i></button>
                                <button title="Add circle shape" onClick={() => handleClickAddShape("square")}><i className="fa fa-square"></i></button>
                                <button title="Add triangle shape" onClick={() => handleClickAddShape("triangle")}><i className="fa fa-play rotate-270"></i></button>
                            </div>
                        </Panel>
                        {
                            shape && selectedShapeId &&

                            <Panel title="Shape">
                                {/* <p>Shapes: {history.present.shapes.length}</p> */}
                                <p>Selected shape:</p>
                                <p className="ml-2 w-[10ch]" >{selectedShapeId}</p>
                                <p>add name here</p>
                                <label>Name: <input type="text" value={shape.name} onChange={(e) => setShapeName(e.target.value, selectedShapeId)}></input></label>
                                <button onClick={(_e) => {
                                    const cloned = CloneShape(shape, paths, points);
                                    AddNewShape("", cloned.shape);

                                    // merge cloned paths and points into your state
                                    commit(prev => ({
                                        ...prev,
                                        paths: { ...prev.paths, ...cloned.paths },
                                        points: { ...prev.points, ...cloned.points }
                                    }));
                                }}>
                                    Duplicate
                                </button>
                                <div className="flex flex-row gap-2">
                                    <p>Order:</p>
                                    <button onClick={moveForward}><i className="fa fa-arrow-up"></i></button>
                                    <button onClick={moveBackward}><i className="fa fa-arrow-down"></i></button>
                                    {Object.values(history.present.shapes).length > 0 && selectedShapeId !== null &&
                                        <button title="Delete shape" onClick={DeleteSelectedShape}><i className="fa fa-circle-minus"></i></button>
                                    }
                                </div>
                            </Panel>
                        }
                        {shape &&
                            <Panel title="Paths">
                                <p>Paths: {shape.pathIds.length}</p>
                                <p>Selected path:</p>
                                <p className="ml-2 w-[10ch]" >{selectedPathId}</p>
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
                                    <div className="flex flex-row gap-2">

                                        <label>Stroke width: </label>
                                        <input className="w-14" type="number" value={shape?.strokeWidth} onChange={(e) => updateSelectedShape(s => ({ ...s, strokeWidth: Number(e.target.value) }))}></input>
                                    </div>
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
                            </Panel>
                        }
                        <Panel title="Colors">
                            <div className="panel2content flex-row!">
                                <div className="flex flex-col">
                                    <h2>Fill</h2>
                                    {Array.from(new Set(Object.values(history.present.shapes).map(shape => shape.fillColor)))
                                        .map((color, i) => (
                                            <input
                                                key={i}
                                                className="colorSelect"
                                                type="color"
                                                value={color}
                                                onChange={(e) => {
                                                    const newColor = e.target.value;
                                                    commit(prev => {
                                                        const newShapes: Record<string, Shape> = {};
                                                        for (const id in prev.shapes) {
                                                            const s = prev.shapes[id];
                                                            newShapes[id] = s.fillColor === color ? { ...s, fillColor: newColor } : s;
                                                        }
                                                        return { ...prev, shapes: newShapes };
                                                    });
                                                }}
                                            />
                                        ))}
                                </div>

                                <div className="flex flex-col">
                                    <h2>Stroke</h2>
                                    {Array.from(new Set(Object.values(history.present.shapes).map(shape => shape.strokeColor)))
                                        .map((color, i) => (
                                            <input
                                                key={i}
                                                className="colorSelect"
                                                type="color"
                                                value={color}
                                                onChange={(e) => {
                                                    const newColor = e.target.value;
                                                    commit(prev => {
                                                        const newShapes: Record<string, Shape> = {};
                                                        for (const id in prev.shapes) {
                                                            const s = prev.shapes[id];
                                                            newShapes[id] = s.strokeColor === color ? { ...s, strokeColor: newColor } : s;
                                                        }
                                                        return { ...prev, shapes: newShapes };
                                                    });
                                                }}
                                            />
                                        ))}
                                </div>

                                <div className="flex flex-col">
                                    <h2>Flip</h2>
                                    {Array.from(
                                        new Set(Object.values(history.present.shapes).map(s => `${s.strokeColor}|${s.fillColor}`))
                                    ).map((pair, i) => {
                                        const [stroke, fill] = pair.split("|");

                                        return (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    commit(prev => {
                                                        const newShapes: Record<string, Shape> = {};
                                                        for (const id in prev.shapes) {
                                                            const s = prev.shapes[id];
                                                            newShapes[id] =
                                                                s.strokeColor === stroke && s.fillColor === fill
                                                                    ? { ...s, strokeColor: fill, fillColor: stroke }
                                                                    : s;
                                                        }
                                                        return { ...prev, shapes: newShapes };
                                                    });
                                                }}
                                            >
                                                {"<->"}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </Panel>


                        <Panel title="Knobs">
                            {/* Knob size */}
                            <div className="flex flex-row gap-2">
                                <label>Show knobs</label>
                                <input type="checkbox" checked={showKnobs} onChange={(e) => setShowKnobs(e.target.checked)} />
                            </div>
                            <div className="flex flex-col ">
                                <label>Knob size: {knobSize}</label>
                                <input type="range" value={knobSize} min={8} max={64} onChange={handleKnobSize} />
                            </div>
                        </Panel>


                        <Panel title="Grid">
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
                        </Panel>
                        <Panel title="Camera">
                            <div className="flex flex-row gap-2">
                                <div className="flex flex-row gap-2">
                                    <label>X: </label><input type="number" className="w-20" value={cameraRef.current.x.toFixed(1)} onChange={(e) => cameraRef.current.x = Number(e.target.value)}></input>
                                </div>
                                <div className="flex flex-row gap-2">
                                    <label>Y: </label><input type="number" className="w-20" value={cameraRef.current.y.toFixed(1)} onChange={(e) => cameraRef.current.y = Number(e.target.value)}></input>
                                </div>
                            </div>
                            <div className="flex flex-row gap-2">
                                <label>Zoom: </label><p className="w-20" >{cameraRef.current.zoom.toFixed(1)}</p>
                            </div>
                            <button onClick={(_e) => { resetCamera() }}>Reset</button>
                            <button onClick={(_e) => { centerCamera() }}>Center</button>
                        </Panel>

                        <Panel title="File">
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
                                <button title="Clear" onClick={() => clearDocument()}><i className="fa-solid fa-file"></i></button>
                            </div>
                            <div className="flex flex-col gap-2">
                                <h2>Export frame</h2>
                                <div className="flex flex-row gap-2">
                                    <label>X:</label><input className="w-20" type="number" value={frame.x} onChange={(e) => setFrame(prev => ({ ...prev, x: Number(e.target.value) }))}></input>
                                    <label>Y:</label><input className="w-20" type="number" value={frame.y} onChange={(e) => setFrame(prev => ({ ...prev, y: Number(e.target.value) }))}></input>
                                </div>
                                <div className="flex flex-row gap-2">
                                    <label>W:</label><input className="w-20" type="number" value={frame.w} onChange={(e) => setFrame(prev => ({ ...prev, w: Number(e.target.value) }))}></input>
                                    <label>H:</label><input className="w-20" type="number" value={frame.h} onChange={(e) => setFrame(prev => ({ ...prev, h: Number(e.target.value) }))}></input>
                                </div>
                            </div>
                            <h2>Recent files</h2>
                            <div className="flex flex-col gap-2">
                                {recentFiles.map((file) =>
                                    <div className="flex flex-row gap-2" key={file.id}>
                                        <button onClick={() => {
                                            commit(() => ({
                                                shapeOrder: file.shapeOrder ?? [],
                                                shapes: file.shapes ?? {},
                                                paths: file.paths ?? {},
                                                points: file.points ?? {}
                                            }));
                                            setFileName(file.fileName);
                                        }}>
                                            {file.fileName}
                                        </button>
                                        <button onClick={() => { RemoveFromLocalStorage(file.id, setRecentFiles) }}>
                                            <i className="fa-solid fa-x"></i>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </Panel>
                    </div>
                </PanelContainer>
            </div>
        </>
    )
}
