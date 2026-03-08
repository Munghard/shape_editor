import React, { useEffect, useRef, useState } from "react"
import { ClearCanvas, CloneShape, cubicBezierPoint, getCanvasMousePos, getRandomColor, getShapeCenter, lerpVec2, screenToWorld, shapesEqual, worldToScreen } from "../Utilities/Utilities";
import { ClearGrid, DrawGrid } from "./Grid";
import { DrawShape, type Shape, type Point, CreateBaseShape, CreateTriangle, CreateCircle, CreateSquare, type Rect } from "./Shape";
import getHoveredSegment from "./Segment";
import { type SaveData } from "./SaveData";
import { ExportShape, LoadFile, RemoveFromLocalStorage, SaveFile } from "./File";
import type { History } from "./History";
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

    // HISTORY
    const [history, setHistory] = useState<History>({
        past: [],
        present: { shapes: [] },
        future: []
    });
    const [loaded, setLoaded] = useState(false);

    // FILE
    const [fileName, setFileName] = useState<string>("NewFile");
    const [frame, setFrame] = useState<Rect>({ x: -500, y: -500, w: 1000, h: 1000 });

    // CANVAS
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null); // this is for knobs

    //SHAPE
    const [hiddenShapeIndicies, setHiddenShapeIndicies] = useState<number[]>([]);
    const [selectedShapeIndex, setSelectedShapeIndex] = useState<number>(-1);

    const shape = history.present.shapes[selectedShapeIndex];
    const shapes = history.present.shapes;

    // PATH
    const [selectedPathIndex, setSelectedPathIndex] = useState<number>(-1);
    // const [hiddenPathIndicies, setHiddenPathIndicies] = useState<number[]>([]);

    // POINT
    const [selectedPointIndex, setSelectedPointIndex] = useState<number>(-1);
    // auto updating selectedpoint logic
    const selectedPoint =
        selectedShapeIndex !== -1 &&
            selectedPathIndex !== -1 &&
            selectedPointIndex !== -1
            ? history.present.shapes[selectedShapeIndex]
                ?.paths[selectedPathIndex]
                ?.points[selectedPointIndex]
            : null;

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
        if (saved) {
            try {
                const data = JSON.parse(saved) as { history: History; frame: Rect; tool: Tool };
                if (data.history) setHistory(data.history);
                if (data.frame) setFrame(data.frame);
                if (data.tool) setTool(data.tool);
            } catch (error) {
                console.warn("Failed to load session");
            }
        }
        // always mark as loaded, even if no saved session
        setLoaded(true);
    }, []);

    // Session SAVING
    useEffect(() => {
        if (!loaded) return;
        const SaveData = { history, frame, tool }
        var json = JSON.stringify(SaveData);
        localStorage.setItem("Session", json);

    }, [history, shapes, loaded, frame, tool]);

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

    }, [history.present.shapes, knobSize, hiddenShapeIndicies, selectedPoint, selectedShapeIndex, selectedPathIndex]);

    function Draw() {

        const canvas = canvasRef.current
        if (!canvas) return;

        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

        ClearCanvas(ctx);

        ctx.setTransform(cameraRef.current.zoom, 0, 0, cameraRef.current.zoom, -cameraRef.current.x * cameraRef.current.zoom, -cameraRef.current.y * cameraRef.current.zoom)

        history.present.shapes.forEach((shape, i) => {
            if (!hiddenShapeIndicies.includes(i)) {
                DrawShape(ctx, shape);
            }
        });

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
        if (selectedShapeIndex !== -1) {
            setSelectedPathIndex(0);
            setSelectedPointIndex(-1);
        }
        else {

            setSelectedPathIndex(-1);
            setSelectedPointIndex(-1);
        }
    }, [selectedShapeIndex]);




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
                if (selectedShapeIndex !== -1) {
                    DeleteShape(selectedShapeIndex);
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
                if (shape) AddNewShape("", CloneShape(shape));
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
    }, [shape, selectedShapeIndex]);


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

        return !shapesEqual(current, lastPast);
    }

    function handleAddCurveToPoint(index: number) {
        commit(prevShapes =>
            prevShapes.map((s, i) => {
                if (i !== selectedShapeIndex) return s;

                const newPaths = [...s.paths];
                const currentPath = { ...newPaths[selectedPathIndex] };

                const newPoints = [...currentPath.points];
                const p = { ...newPoints[index] };

                const count = newPoints.length;

                const prevIndex = (index - 1 + count) % count;
                const nextIndex = (index + 1) % count;

                const prev = { ...newPoints[prevIndex] };
                const next = { ...newPoints[nextIndex] };

                const newP = lerpVec2(p, prev, 0.5);
                const newN = lerpVec2(p, next, 0.5);

                p.in = { x: newP.x, y: newP.y };
                p.out = { x: newN.x, y: newN.y };

                newPoints[index] = p;
                currentPath.points = newPoints;

                newPaths[selectedPathIndex] = currentPath;

                return { ...s, paths: newPaths };
            })
        );
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

        if (tool === "Move") {
            // return if no shape selected
            if (!shape) return;
            // move all points in paths in shape
            if (dragging) {
                const dx = (screenX - dragOffset.current.x) / cameraRef.current.zoom;
                const dy = (screenY - dragOffset.current.y) / cameraRef.current.zoom;

                const shape = history.present.shapes[selectedShapeIndex];
                const shapes = history.present.shapes;

                if (e.ctrlKey) {
                    shapes.forEach(shape => {
                        shape.paths.forEach(path => {
                            path.points.forEach(p => {
                                MovePoint(p, dx, dy);
                            });
                        });
                    });
                }
                else {
                    shape.paths.forEach(path => {
                        path.points.forEach(p => {
                            MovePoint(p, dx, dy);
                        });
                    });
                }

                dragOffset.current = { x: screenX, y: screenY };
                Draw();
                // ReDrawGrid();
            }
        }
        else if (tool === "Rotate" && dragging && lastMouseRef.current) {

            // const dx = screenX - lastMouseRef.current.x;
            const dy = screenY - lastMouseRef.current.y;

            lastMouseRef.current = { x: screenX, y: screenY };

            const shape = history.present.shapes[selectedShapeIndex];
            const shapes = history.present.shapes;
            if (!shape) return;

            const center = getShapeCenter(shape);

            // Rotate based on vertical mouse delta (dy)
            // You can tweak the factor to control sensitivity
            const angle = dy * 0.01; // radians
            const sin = Math.sin(angle);
            const cos = Math.cos(angle);
            if (e.ctrlKey) {
                shapes.forEach(shape => {
                    shape.paths.forEach(path => {
                        path.points.forEach(p => {
                            RotatePoint(p, center, cos, sin);
                        });
                    });
                });
            }
            else {
                shape.paths.forEach(path => {
                    path.points.forEach(p => {
                        RotatePoint(p, center, cos, sin);
                    });
                });
            }
            dragOffset.current = { x: screenX, y: screenY };
            Draw();
        }
        if (tool === "Scale" && dragging && lastMouseRef.current) {

            // const dx = screenX - lastMouseRef.current.x;
            const dy = screenY - lastMouseRef.current.y;

            lastMouseRef.current = { x: screenX, y: screenY };

            const shape = history.present.shapes[selectedShapeIndex];
            const shapes = history.present.shapes;
            if (!shape) return;

            const center = getShapeCenter(shape);

            const scaleFactor = Math.max(0.1, 1 + dy * 0.01);

            if (e.ctrlKey) {
                shapes.forEach(shape => {
                    shape.paths.forEach(path => {
                        path.points.forEach(p => {
                            ScalePoint(p, center, scaleFactor);
                        });
                    });
                });
            }
            else {

                shape.paths.forEach(path => {
                    path.points.forEach(p => {
                        ScalePoint(p, center, scaleFactor);
                    });
                });
            }
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

            // Draw()
            // ReDrawGrid();
            // console.log(cameraRef.current.x, cameraRef.current.y)
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
        if (!canvasRef.current || !lastMouseRef.current) return;

        const cmp = getCanvasMousePos(e, canvasRef.current);
        const mouseWorld = screenToWorld(cmp.x, cmp.y, cameraRef.current);
        const lastWorld = screenToWorld(lastMouseRef.current.x, lastMouseRef.current.y, cameraRef.current);

        const dx = mouseWorld.x - lastWorld.x;
        const dy = mouseWorld.y - lastWorld.y;

        dragDeltaRef.current = { index, handleIn, dx, dy };

        // Apply delta for live preview by mutating history.present.shapes
        const shape = history.present.shapes[selectedShapeIndex];
        if (!shape) return;

        const path = shape.paths[selectedPathIndex];
        if (!path) return;

        const point = path.points[index];
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
        if (!draggingRef.current || !dragDeltaRef.current) {
            window.removeEventListener("mousemove", onHandleMouseMove);
            window.removeEventListener("mouseup", stopHandleDrag);
            dragDeltaRef.current = null;
            draggingRef.current = null;
            return;
        }

        // safe to commit now
        const { index, handleIn, dx, dy } = dragDeltaRef.current;

        commit(prevShapes =>
            prevShapes.map((shape, si) => {
                if (si !== selectedShapeIndex) return shape;

                return {
                    ...shape,
                    paths: shape.paths.map((path, pi) => {
                        if (pi !== selectedPathIndex) return path;

                        return {
                            ...path,
                            points: path.points.map((p, i) => {
                                if (i !== index) return p;

                                return {
                                    ...p,
                                    in: handleIn && p.in ? { x: p.in.x + dx, y: p.in.y + dy } : p.in,
                                    out: !handleIn && p.out ? { x: p.out.x + dx, y: p.out.y + dy } : p.out
                                };
                            })
                        };
                    })
                };
            })
        );

        dragDeltaRef.current = null;
        draggingRef.current = null;
        window.removeEventListener("mousemove", onHandleMouseMove);
        window.removeEventListener("mouseup", stopHandleDrag);
    }
    // =================================================================================================================
    // POINT HANDLES
    // =================================================================================================================

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


        if (tool === "Pan" || tool === "Scale" || tool === "Rotate" || tool === "Frame") {
            lastMouseRef.current = { x: screenX, y: screenY }
        }
        if (tool === "Select" || tool === "Move" || tool === "Scale" || tool === "Rotate") {
            var ctx = e.currentTarget.getContext("2d") as CanvasRenderingContext2D;
            selectShapeAt(ctx, screenX, screenY);
        }
        else if (tool === "Insert") {
            let targetIndex = selectedShapeIndex;
            if (e.shiftKey) {
                AddNewShape("empty"); // this should also select it
                targetIndex = history.present.shapes.length;

            }
            else if (e.ctrlKey) {
                AddNewPath();
            }
            else {
                ClearOverlayCanvas();
                handleCreatePoint(e, targetIndex);

            }
        }

        dragOffset.current = { x: screenX, y: screenY };
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

            commit(() => history.present.shapes);
        }
    }

    function selectShapeAt(ctx: CanvasRenderingContext2D, x: number, y: number) {
        let foundShapeIndex = -1;
        let nextPathIndex = -1;

        // loop from top-most shape down
        for (let i = history.present.shapes.length - 1; i >= 0; i--) {
            buildPath(ctx, history.present.shapes[i]);

            if (ctx.isPointInPath(x, y)) {
                foundShapeIndex = i;

                if (i === selectedShapeIndex) {
                    // cycle to next path
                    const pathCount = history.present.shapes[i].paths.length;
                    nextPathIndex = (selectedPathIndex + 1) % pathCount;
                } else {
                    nextPathIndex = 0;
                }

                break;
            }
        }

        // update state **once**, after selection is determined
        setSelectedShapeIndex(foundShapeIndex);
        setSelectedPathIndex(nextPathIndex);
        setSelectedPointIndex(-1);
    }

    function buildPath(ctx: CanvasRenderingContext2D, shape: Shape) {
        ctx.beginPath();
        for (let index = 0; index < shape.paths.length; index++) {

            const points = shape.paths[index].points;

            if (!points || points.length === 0) continue;

            ctx.moveTo(points[0].x, points[0].y);

            for (let i = 1; i < points.length; i++) {
                const prev = points[i - 1];
                const curr = points[i];
                ctx.bezierCurveTo(
                    prev.out?.x ?? prev.x,
                    prev.out?.y ?? prev.y,
                    curr.in?.x ?? curr.x,
                    curr.in?.y ?? curr.y,
                    curr.x, curr.y
                );
            }
            if (shape.cyclic && points.length > 1) {
                const last = points[points.length - 1];
                const first = points[0];

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
        }
    }


    function MovePointByIndex(pointIndex: number, newPoint: Point) {

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

    function handleCreatePoint(e: React.MouseEvent<HTMLCanvasElement>, targetIndex: number) {
        if (!canvasRef.current) return;
        let shapeIndex = targetIndex;
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

            const c1 = start.out ?? start; // fallback if null
            const c2 = end.in ?? end;

            // get midpoint along cubic Bezier
            newPoint = cubicBezierPoint(0.5, start, c1, c2, end);

            insertPointAt(selectedSegment, newPoint.x, newPoint.y);
            setSelectedPointIndex(selectedSegment + 1);
            startDragging(selectedSegment + 1);

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
        }
    }

    function startDragging(index: number) {
        if (!canvasRef.current) return;

        if (selectedShapeIndex === -1 || selectedPathIndex === -1) return;

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

            const dx = x - path.points[index].x;
            const dy = y - path.points[index].y;

            const p = path.points[index];

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


        ExportShape(selectedExportScale, fileName, history.present.shapes, frame);
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

    function AddNewShape(shapeName: string, shape: Shape | null = null): Shape {

        let newShape: Shape = CreateBaseShape();
        if (shape === null) {

            if (shapeName === "empty") {
                newShape = CreateBaseShape();
            }
            if (shapeName === "circle") {
                newShape = CreateBaseShape([CreateCircle()]);
            }
            if (shapeName === "square") {
                newShape = CreateBaseShape([CreateSquare()]);
            }
            if (shapeName === "triangle") {
                newShape = CreateBaseShape([CreateTriangle()]);
            }
        }
        else {
            newShape = shape;

            // this was to add an offset to the duplicated shape but its adding it to the main shape too and i cant be arsed right now
            // const offset = { x: 50, y: 50 };
            // newShape.paths.forEach(pa => pa.points.forEach(po => { po.x += offset.x; po.y += offset.y; }));
        }

        newShape = CloneShape(newShape);

        const newIndex = history.present.shapes.length;

        commit(prev => [...prev, newShape]);

        setSelectedShapeIndex(newIndex);
        setSelectedPathIndex(0);
        return newShape;
    }

    function DeleteSelectedShape(): void {
        if (selectedShapeIndex === -1) return;
        commit(prev => [...prev.filter(s => s !== shape)]);
        setSelectedShapeIndex(prev => Math.max(prev - 1, 0));
        setSelectedSegment(0);
    }
    function DeleteShape(index: number): void {
        if (index === -1) return;
        commit(prev => [...prev.filter((_s, i) => i !== index)]);
        setSelectedShapeIndex(-1);
        setSelectedSegment(0);
    }

    // update shape helper
    function updateSelectedShape(updater: (shape: Shape) => Shape) {
        commit(prev =>
            prev.map((s, i) => (i === selectedShapeIndex ? updater(s) : s))
        );
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
    function DeletePath(shapeIndex: number, pathIndex: number): void {
        commit(prev =>
            prev.map((s, i) => {
                if (i !== shapeIndex) return s;

                const newPaths = [
                    ...s.paths.filter((_p, i) => i !== pathIndex)
                ];
                return { ...s, paths: newPaths }
            })
        );
        setSelectedPathIndex(prev => Math.max(prev - 1, 0));
    }
    function HideShape(i: number, hide: boolean): void {
        if (hide) {

            setHiddenShapeIndicies(prev => [...prev, i]);
        }
        else {

            setHiddenShapeIndicies(prev => prev.filter(p => p !== i));
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
    function setShapeName(name: string, index: number): void {
        commit(prev =>
            prev.map((p, i) =>
                i === index ? { ...p, name } : p
            )
        );
    }

    function clearDocument(): void {
        setHistory({ past: [], present: { shapes: [] }, future: [] });
        setSelectedPointIndex(-1);
        setSelectedPathIndex(-1);
        setSelectedShapeIndex(-1)
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

        const center = getShapeCenter(shape);
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
                            {shapes && shapes.map((s, i) => {
                                return (
                                    <div key={i} className="flex flex-col gap-2 ">
                                        <div key={i} className="flex flex-row gap-2 justify-between">
                                            <button className={`${i === selectedShapeIndex ? "selected" : ""}`} onClick={() => setSelectedShapeIndex(i)}>{s.name || "shape"} paths: {s.paths.length}</button>
                                            <button title="Delete" onClick={() => DeleteShape(i)}><i className="fa fa-x"></i></button>
                                            <button title="Hide" className={`${!hiddenShapeIndicies.includes(i) ? "selected" : ""}`} onClick={() => HideShape(i, !hiddenShapeIndicies.includes(i))}><i className="fa fa-eye"></i></button>

                                        </div>
                                        {i === selectedShapeIndex && s.paths.map((s, i) => {
                                            return (
                                                <div key={i} className="pl-5 flex flex-row gap-2 justify-between">
                                                    <button className={`${i === selectedPathIndex ? "selected" : ""}`} onClick={() => setSelectedPathIndex(i)}>Path_{i} points: {s.points.length}</button>
                                                    <button title="Delete" onClick={() => DeletePath(history.present.shapes.indexOf(shape), i)}><i className="fa fa-x"></i></button>
                                                    {/* <button className={`${!hiddenPathIndicies.includes(i) ? "selected" : ""}`} onClick={() => HidePath(i, !hiddenPathIndicies.includes(i))}><i className="fa fa-eye"></i></button> */}
                                                </div>
                                            )
                                        })}
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

                            {showKnobs && !dragging &&
                                shape && shape.paths[selectedPathIndex]?.points.map((p, i) => {
                                    if (canvasRect == null) return;

                                    const selected = selectedPointIndex === i;
                                    if (!canvasRef.current) return;

                                    const pointScreen = worldToScreen(p.x, p.y, cameraRef.current, canvasRef.current);
                                    const inScreen = p.in && worldToScreen(p.in.x, p.in.y, cameraRef.current, canvasRef.current);
                                    const outScreen = p.out && worldToScreen(p.out.x, p.out.y, cameraRef.current, canvasRef.current);
                                    return (
                                        <div key={i}>
                                            <Knob x={pointScreen.x} y={pointScreen.y} i={i} selected={selected} size={knobSize} tool={tool} handleKnobMouseDown={handleKnobMouseDown}></Knob>

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
                        {selectedPointIndex !== -1 &&
                            <Panel title="Selected point">
                                <div className="flex flex-row gap-2 ">
                                    <input className="w-[10ch]" type="number" value={selectedPointIndex} onChange={handleSelectPoint}></input>
                                    <button title="Delete point" onClick={() => handleRemovePoint(selectedPointIndex)}><i className="fa-solid fa-x"></i></button>
                                    <button title="Curve point" onClick={() => handleAddCurveToPoint(selectedPointIndex)}><i className="fa-solid fa-bezier-curve"></i></button>
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
                                                        MovePointByIndex(
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
                                                        MovePointByIndex(
                                                            selectedPointIndex,
                                                            { x: selectedPoint.x, y: Number(e.target.value) }
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
                            shape &&

                            <Panel title="Shape">
                                {/* <p>Shapes: {history.present.shapes.length}</p> */}
                                <p>Selected shape:
                                    <input className="ml-2 w-[10ch]" type="number" value={selectedShapeIndex} min={0} max={history.present.shapes.length - 1} onChange={(e) => { setSelectedShapeIndex(Number(e.target.value)); setSelectedPathIndex(0); setSelectedPointIndex(0); }}></input>
                                </p>
                                <label>Name: <input type="text" value={shape.name} onChange={(e) => setShapeName(e.target.value, selectedShapeIndex)}></input></label>
                                <button onClick={(_e) => AddNewShape("", CloneShape(shape))}>Duplicate</button>
                                <div className="flex flex-row gap-2">
                                    <p>Order:</p>
                                    <button onClick={moveForward}><i className="fa fa-arrow-up"></i></button>
                                    <button onClick={moveBackward}><i className="fa fa-arrow-down"></i></button>
                                    {history.present.shapes.length > 0 && selectedShapeIndex !== -1 &&
                                        <button title="Delete shape" onClick={DeleteSelectedShape}><i className="fa fa-circle-minus"></i></button>
                                    }
                                </div>
                            </Panel>
                        }
                        {shape &&
                            <Panel title="Paths">
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
                                    {Array.from(
                                        new Set(history.present.shapes.map(shape => shape.fillColor))
                                    ).map((color, i) => (
                                        <input
                                            key={i}
                                            className="colorSelect"
                                            type="color"
                                            value={color}
                                            onChange={(e) => {
                                                const newColor = e.target.value;
                                                commit(prevShapes =>
                                                    prevShapes.map(s =>
                                                        s.fillColor === color ? { ...s, fillColor: newColor } : s
                                                    )
                                                );
                                            }}
                                        />
                                    ))}
                                </div>
                                <div className="flex flex-col">
                                    <h2>Stroke</h2>
                                    {Array.from(
                                        new Set(history.present.shapes.map(shape => shape.strokeColor))
                                    ).map((color, i) => (
                                        <input
                                            key={i}
                                            className="colorSelect"
                                            type="color"
                                            value={color}
                                            onChange={(e) => {
                                                const newColor = e.target.value;
                                                commit(prevShapes =>
                                                    prevShapes.map(s =>
                                                        s.strokeColor === color ? { ...s, strokeColor: newColor } : s
                                                    )
                                                );
                                            }}
                                        />
                                    ))}
                                </div>
                                <div className="flex flex-col">
                                    <h2>Flip</h2>
                                    {Array.from(
                                        new Set(
                                            history.present.shapes.map(s => `${s.strokeColor}|${s.fillColor}`)
                                        )
                                    ).map((pair, i) => {
                                        const [stroke, fill] = pair.split("|");

                                        return (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    commit(prevShapes =>
                                                        prevShapes.map(s =>
                                                            s.strokeColor === stroke && s.fillColor === fill
                                                                ? { ...s, strokeColor: fill, fillColor: stroke }
                                                                : s
                                                        )
                                                    );
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
                                {recentFiles.map((file, index) =>
                                    <div className="flex flex-row gap-2" key={index}>
                                        <button onClick={() => { commit(() => file.shapes); setFileName(file.fileName) }} >{file.fileName}</button>
                                        <button onClick={() => { RemoveFromLocalStorage(file.id, setRecentFiles) }} ><i className="fa-solid fa-x"></i></button>
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
