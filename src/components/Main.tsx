import React, { useEffect, useRef, useState, type RefObject } from "react"
import { CloneShape, getRandomColor, worldToScreen } from "../Utilities/Utilities";
import { type Point, type Rect, type Path } from "../Editor/Shape";
import { type SaveData } from "./SaveData";
import { ExportShape, LoadFile, RemoveFromLocalStorage, SaveFile } from "../Editor/File";
import type { History } from "../Editor/History";
import { toolTooltip } from "../Tools/ToolTooltips";
import { APP_NAME, RECENTFILESKEY } from "../Constants";
import { Knob } from "./Knob";
import { Handle } from "./Handle";
import { Panel } from "./Panel";
import { PanelContainer } from "./PanelContainer";
import { Editor } from "../Editor/Editor";
import type { Tool } from "../Tools/Tool";
import { SelectTool } from "../Tools/SelectTool";
import { MoveTool } from "../Tools/MoveTool";
import { RotateTool } from "../Tools/RotateTool";
import { ScaleTool } from "../Tools/ScaleTool";
import { InsertTool } from "../Tools/InsertTool";
import { PanTool } from "../Tools/PanTool";
import { FrameTool } from "../Tools/FrameTool";
import { DeleteTool } from "../Tools/DeleteTool";
import { ClearGrid } from "../Editor/Grid";

export type ToolEnum = "Select" | "Move" | "Rotate" | "Scale" | "Insert" | "Delete" | "Pan" | "Frame";



export default function Main() {

    document.title = APP_NAME;

    // HISTORY
    const [history, setHistory] = useState<History>({
        past: [],
        present: { shapes: [] },
        future: []
    });
    const historyRef = useRef<History>(history)

    const [loaded, setLoaded] = useState(false);

    // FILE
    const [fileName, setFileName] = useState<string>("NewFile");
    const [frame, setFrame] = useState<Rect>({ x: -500, y: -500, w: 1000, h: 1000 });

    // CANVAS
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null); // this is for knobs

    // VIEW
    const [bgColor, setBgColor] = useState<string>("#282828");

    const [showGrid, setShowGrid] = useState<boolean>(true);

    const [showKnobs, setShowKnobs] = useState<boolean>(true);
    const [knobSize, setKnobSize] = useState<number>(16);
    const [snapToGrid, setSnapToGrid] = useState<boolean>(false);

    // CAMERA
    const [, setTick] = useState(0); // this is for forcing rerender on zoom
    const cameraRef = useRef({
        x: 0,
        y: 0,
        zoom: 1,
    })
    // EDITOR

    const [recentFiles, setRecentFiles] = useState<SaveData[]>([]);

    const lastMouseRef = useRef<{ x: number; y: number } | null>(null)
    const draggingRef = useRef<{ index: number, handleIn: boolean } | null>(null);
    const dragDeltaRef = useRef<{ index: number; handleIn: boolean; dx: number; dy: number } | null>(null);

    const [toolEnum, setToolEnum] = useState<ToolEnum>("Select");

    function setTool(tool: ToolEnum) {
        setToolEnum(tool);
        if (!editorRef.current) return;
        switch (tool) {
            case "Delete":
                handleToolChange(new DeleteTool());
                break;
            case "Select":
                handleToolChange(new SelectTool());
                break;
            case "Move":
                handleToolChange(new MoveTool());
                break;
            case "Rotate":
                handleToolChange(new RotateTool());
                break;
            case "Scale":
                handleToolChange(new ScaleTool());
                break;
            case "Insert":
                handleToolChange(new InsertTool());
                break;
            case "Pan":
                handleToolChange(new PanTool());
                break;
            case "Frame":
                handleToolChange(new FrameTool(setFrame));
                break;
        }
    }
    const handleToolChange = (tool: Tool) => {
        if (!editorRef.current) return;
        editorRef.current.activeTool = tool;
        setActiveTool(tool);
    }

    const [activeTool, setActiveTool] = useState<Tool | null>(null);
    const editorRef = useRef<Editor | null>(null);

    const tool = editorRef.current ? editorRef.current.activeTool : null;


    const [selectedExportScale, setSelectedExportScale] = useState<string>("1");

    // sync historyRef
    useEffect(() => {
        historyRef.current = history;
    }, [history]);

    // sync snaptogrid
    useEffect(() => {
        if (!editorRef.current) return;
        editorRef.current.snapToGrid = snapToGrid;
    }, [snapToGrid]);

    // create editor
    useEffect(() => {
        if (!canvasRef.current) return; // canvasref is set on the canvas ui component

        editorRef.current = new Editor(
            canvasRef as RefObject<HTMLCanvasElement>,
            cameraRef,
            historyRef,
            draggingRef,
            dragDeltaRef,
            lastMouseRef,
            activeTool,
            setHistory,
            setTick,
        );
        console.log("Editor created");
    }, [canvasRef]);


    // Session LOADING
    useEffect(() => {
        const saved = localStorage.getItem("Session");
        if (saved) {
            try {
                const data = JSON.parse(saved) as { history: History; frame: Rect; tool: ToolEnum };
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

    }, [history, history.present.shapes, loaded, frame, tool]);

    // RECENT FILES
    useEffect(() => {
        const stored = localStorage.getItem(RECENTFILESKEY);
        let filesAsStrings: string[] = stored ? JSON.parse(stored) : [];

        let files: SaveData[] = filesAsStrings.map(f => JSON.parse(f));
        setRecentFiles(files);
        // console.log(files);
    }, [history]);



    // DRAW
    useEffect(() => {
        if (!editorRef.current) return;
        editorRef.current.Draw();
        const canvas = document.getElementById("Canvas") as HTMLCanvasElement;
        const rect = canvas.getBoundingClientRect();
        setCanvasRect(rect);

    }, [history.present.shapes, knobSize, editorRef.current?.hiddenShapeIndicies, editorRef.current?.selectedPointIndex, editorRef.current?.selectedShapeIndex, editorRef.current?.selectedPathIndex]);


    // DRAW GRID
    useEffect(() => {
        if (!editorRef.current) return;
        if (showGrid) {
            editorRef.current.ReDrawGrid();
        }
        else {
            var c = document.getElementById("CanvasGrid") as HTMLCanvasElement;
            var ctx = c.getContext("2d") as CanvasRenderingContext2D;
            ClearGrid(ctx);
        }
    }, [showGrid, editorRef.current?.gridSubdivisions, editorRef.current?.gridAlpha]);


    // HOTKEYS
    useEffect(() => {
        function handleKeyDown(e: globalThis.KeyboardEvent) {
            if (e.repeat) return;
            if (!editorRef.current) return;
            const active = document.activeElement;
            if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
                return; // skip hotkeys while typing
            }

            const key = e.key.toLowerCase();
            // 1️⃣ Special keys
            if (key === "delete") {
                if (editorRef.current.selectedShapeIndex !== -1) {
                    editorRef.current.DeleteShape(editorRef.current.selectedShapeIndex);
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
                editorRef.current.undo();
                e.preventDefault();
                return;
            }
            if (e.ctrlKey && e.shiftKey && key === "z") {
                editorRef.current.redo();
                e.preventDefault();
                return;
            }
            if (e.ctrlKey && key === "d") {
                const shape = editorRef.current.historyRef.current.present.shapes[editorRef.current.selectedShapeIndex];
                if (shape) editorRef.current.AddNewShape("", CloneShape(shape));
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
    }, [editorRef.current?.selectedShapeIndex]);


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

    function resizeCanvases() {
        if (!canvasRef.current) return;
        if (!editorRef.current) return;


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

        if (showGrid) editorRef.current.ReDrawGrid();
        editorRef.current.Draw();
    }



    function handleMouseMove(e: React.DragEvent<HTMLCanvasElement>) {
        if (!editorRef.current) return;
        editorRef.current.onMouseMove(e);
    }

    function handleKnobMouseDown(e: React.MouseEvent<HTMLDivElement>, i: number) {
        if (!tool) return;
        if (!editorRef.current) return;
        // ROUTE TO EDITOR
        editorRef.current.onMouseDownKnob(e, i);

        // UI STUFF
        const knob = e.currentTarget as HTMLDivElement;
        knob.style.pointerEvents = "none";
        knob.style.display = "none";

        function onMouseUp() {
            knob.style.pointerEvents = "auto"; // re-enable after drag
            knob.style.display = "flex";
            window.removeEventListener("mouseup", onMouseUp);
        }

        window.addEventListener("mouseup", onMouseUp);

    }
    function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
        if (!canvasRef.current) return;
        if (!editorRef.current) return;

        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;

        editorRef.current.onMouseDown(e, ctx)
    }



    function handleMouseUp(e: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
        if (!editorRef.current) return;
        editorRef.current.onMouseUp(e);
        if (editorRef.current.changeDetected()) {
            editorRef.current.commit(() => history.present.shapes);
        }
    }

    function handleKnobSize(e: React.ChangeEvent<HTMLInputElement, Element>) {
        setKnobSize(Number(e.target.value))
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
        if (!editorRef.current) return;
        SaveFile(fileName, history.present.shapes, showGrid, snapToGrid, editorRef.current.gridSubdivisions);
    }

    function handleLoad(_e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        if (!editorRef.current) return;

        LoadFile(setFileName, editorRef.current.commit, setShowGrid, setSnapToGrid, editorRef.current?.setGridSubdivisions);
    }

    return (
        <>
            <div className="flex flex-row justify-between h-screen ">
                <PanelContainer title="TOOLS" left={true}>

                    <button className={`${toolEnum === "Select" ? "selected" : ""} `} onClick={() => setTool("Select")} title="Select(Q)"><i className="fa-solid fa-arrow-pointer"></i></button>
                    <button className={`${toolEnum === "Insert" ? "selected" : ""} `} onClick={() => setTool("Insert")} title="Insert(W)"><i className="fa-solid fa-pencil"></i></button>
                    <button className={`${toolEnum === "Move" ? "selected" : ""} `} onClick={() => setTool("Move")} title="Move(A)"><i className="fa-solid fa-arrows-up-down-left-right"></i></button>
                    <button className={`${toolEnum === "Rotate" ? "selected" : ""} `} onClick={() => setTool("Rotate")} title="Rotate(R)"><i className="fa-solid fa-rotate"></i></button>
                    <button className={`${toolEnum === "Scale" ? "selected" : ""} `} onClick={() => setTool("Scale")} title="Scale(S)"><i className="fa-solid fa-up-right-and-down-left-from-center"></i></button>
                    <button className={`${toolEnum === "Delete" ? "selected" : ""} `} onClick={() => setTool("Delete")} title="Delete(D)"><i className="fa-solid fa-eraser"></i></button>
                    <button className={`${toolEnum === "Pan" ? "selected" : ""} `} onClick={() => setTool("Pan")} title="Pan(Space)"><i className="fa-solid fa-hand"></i></button>
                    <button className={`${toolEnum === "Frame" ? "selected" : ""} `} onClick={() => setTool("Frame")} title="Frame(F)"><i className="fa-solid fa-crop-simple"></i></button>

                </PanelContainer>
                {/* shaped and paths */}
                <PanelContainer title="" left={true}>


                    <Panel title="Shapes">
                        <div className="flex flex-col gap-2">
                            {editorRef.current?.historyRef.current.present.shapes && editorRef.current?.historyRef.current.present.shapes.map((s, i) => {
                                return (
                                    <div key={i} className="flex flex-col gap-2 ">
                                        <div key={i} className="flex flex-row gap-2 justify-between">
                                            <button className={`${i === editorRef.current?.selectedShapeIndex ? "selected" : ""}`} onClick={() => editorRef.current?.setSelectedShapeIndex(i)}>{s.name || "shape"} paths: {s.paths.length}</button>
                                            <button title="Delete" onClick={() => editorRef.current?.DeleteShape(i)}><i className="fa fa-x"></i></button>
                                            <button title="Hide" className={`${!editorRef.current?.hiddenShapeIndicies.includes(i) ? "selected" : ""}`} onClick={() => editorRef.current?.HideShape(i, !editorRef.current?.hiddenShapeIndicies.includes(i))}><i className="fa fa-eye"></i></button>

                                        </div>
                                        {i === editorRef.current?.selectedShapeIndex && s.paths.map((s: Path, i: number) => {
                                            return (
                                                <div key={i} className="pl-5 flex flex-row gap-2 justify-between">
                                                    <button className={`${i === editorRef.current?.selectedPathIndex ? "selected" : ""}`} onClick={() => editorRef.current?.setSelectedPathIndex(i)}>Path_{i} points: {s.points.length}</button>
                                                    <button title="Delete" onClick={() => editorRef.current?.DeletePath(editorRef.current?.selectedShapeIndex, i)}><i className="fa fa-x"></i></button>
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
                        <>
                            <p className="absolute w-50% z-40 p-10 text-zinc-500 pointer-events-none">Tooltip: {toolTooltip(toolEnum)}</p>
                            {
                                editorRef.current &&
                                <p className="absolute w-50% z-40 p-20 text-zinc-500 pointer-events-none">
                                    sshi:{editorRef.current?.selectedShapeIndex} editor: {editorRef.current.selectedShapeIndex} spi:{editorRef.current?.selectedPathIndex} spoi:{editorRef.current?.selectedPointIndex} ssei:{editorRef.current?.selectedSegmentIndex} editor history shapes: {editorRef.current.historyRef.current.present.shapes.length}
                                </p>
                            }
                        </>


                        {/* Knobs */}
                        <div id="Knobs" className="relative flex-1 overflow-hidden">

                            {showKnobs &&
                                editorRef.current?.historyRef.current.present.shapes[editorRef.current?.selectedShapeIndex] && editorRef.current?.historyRef.current.present.shapes[editorRef.current?.selectedShapeIndex].paths[editorRef.current?.selectedPathIndex]?.points.map((p: Point, i: number) => {
                                    if (canvasRect == null) return;

                                    const selected = editorRef.current?.selectedPointIndex === i;
                                    if (!canvasRef.current) return;

                                    const pointScreen = worldToScreen(p.x, p.y, cameraRef.current, canvasRef.current);
                                    const inScreen = p.in && worldToScreen(p.in.x, p.in.y, cameraRef.current, canvasRef.current);
                                    const outScreen = p.out && worldToScreen(p.out.x, p.out.y, cameraRef.current, canvasRef.current);
                                    return (
                                        <div key={i}>
                                            <Knob x={pointScreen.x} y={pointScreen.y} i={i} selected={selected} size={knobSize} tool={toolEnum} handleKnobMouseDown={handleKnobMouseDown}></Knob>

                                            {
                                                inScreen && selected &&
                                                <Handle x={inScreen.x} y={inScreen.y} handleIn={true} i={i} size={knobSize} startHandleDrag={(e) => editorRef.current?.startHandleDrag(e, i, true)}></Handle>
                                            }
                                            {
                                                outScreen && selected &&
                                                <Handle x={outScreen.x} y={outScreen.y} handleIn={false} i={i} size={knobSize} startHandleDrag={(e) => editorRef.current?.startHandleDrag(e, i, false)}></Handle>
                                            }
                                        </div>
                                    )
                                })
                            }

                            {/* Export frame */}
                            {toolEnum === "Frame" && canvasRef.current && canvasRef.current && frame &&
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
                                onWheel={editorRef.current?.handleScroll}
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
                                <button disabled={history.past.length < 1} onClick={(_e) => editorRef.current?.undo()} title="Undo" ><i className="fa-solid fa-undo"></i></button>
                                <button disabled={history.future.length < 1} onClick={(_e) => editorRef.current?.redo()} title="Redo" ><i className="fa-solid fa-redo"></i></button>
                            </div>
                            <button onClick={(_e) => setHistory({
                                past: [],
                                present: history.present,
                                future: []
                            })} title="Clear" ><i className="fa-solid fa-rectangle-xmark"></i></button>
                            {/* <input type="range" value={history.past.length} min={0} max={history.past.length + history.future.length}></input> */}

                        </Panel>
                        {editorRef.current?.selectedPointIndex !== -1 &&
                            <Panel title="Selected point">
                                <div className="flex flex-row gap-2 ">
                                    <input className="w-[10ch]" type="number" value={editorRef.current?.selectedPointIndex} onChange={editorRef.current?.handleSelectPoint}></input>
                                    <button title="Delete point" onClick={() => editorRef.current?.handleRemovePoint(editorRef.current?.selectedPointIndex)}><i className="fa-solid fa-x"></i></button>
                                    <button title="Curve point" onClick={() => editorRef.current?.handleAddCurveToPoint(editorRef.current?.selectedPointIndex)}><i className="fa-solid fa-bezier-curve"></i></button>
                                </div>
                                {editorRef.current?.selectedPointIndex !== -1 && editorRef.current?.selectedPointIndex && editorRef.current?.historyRef.current.present.shapes[editorRef.current?.selectedShapeIndex] &&
                                    (
                                        <div className="flex flex-row gap-2">
                                            <div className="flex flex-row gap-2">
                                                <label>X:</label>
                                                <input
                                                    className="w-[10ch]"
                                                    type="number"
                                                    value={editorRef.current?.getSelectedPoint().x.toFixed(3)}
                                                    onChange={(e) =>
                                                        editorRef.current?.MovePointByIndex(
                                                            editorRef.current.selectedPointIndex,
                                                            { x: Number(e.target.value), y: editorRef.current?.getSelectedPoint().y }
                                                        )}
                                                ></input>
                                            </div>
                                            <div className="flex flex-row gap-2">
                                                <label>Y:</label>
                                                <input
                                                    className="w-[10ch]"
                                                    type="number"
                                                    value={editorRef.current?.getSelectedPoint().y.toFixed(3)}
                                                    onChange={(e) =>
                                                        editorRef.current?.MovePointByIndex(
                                                            editorRef.current.selectedPointIndex,
                                                            { x: editorRef.current?.getSelectedPoint().x, y: Number(e.target.value) }
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
                                <button title="Add empty shape" onClick={() => editorRef.current?.handleClickAddShape("empty")}><i className="fa fa-plus"></i></button>
                                <button title="Add circle shape" onClick={() => editorRef.current?.handleClickAddShape("circle")}><i className="fa fa-circle"></i></button>
                                <button title="Add circle shape" onClick={() => editorRef.current?.handleClickAddShape("square")}><i className="fa fa-square"></i></button>
                                <button title="Add triangle shape" onClick={() => editorRef.current?.handleClickAddShape("triangle")}><i className="fa fa-play rotate-270"></i></button>
                            </div>
                        </Panel>
                        {
                            editorRef.current?.getSelectedShape() &&

                            <Panel title="Shape">
                                {/* <p>Shapes: {history.present.shapes.length}</p> */}
                                <p>Selected shape:
                                    <input className="ml-2 w-[10ch]" type="number" value={editorRef.current?.selectedShapeIndex} min={0} max={history.present.shapes.length - 1} onChange={(e) => { editorRef.current?.setSelectedShapeIndex(Number(e.target.value)); editorRef.current?.setSelectedPathIndex(0); editorRef.current?.setSelectedPointIndex(0); }}></input>
                                </p>
                                <label>Name: <input type="text" value={editorRef.current?.getSelectedShape().name} onChange={(e) => editorRef.current?.setShapeName(e.target.value, editorRef.current.selectedShapeIndex)}></input></label>
                                <button onClick={(_e) => editorRef.current?.AddNewShape("", CloneShape(editorRef.current?.getSelectedShape()))}>Duplicate</button>
                                <div className="flex flex-row gap-2">
                                    <p>Order:</p>
                                    <button onClick={editorRef.current?.moveForward}><i className="fa fa-arrow-up"></i></button>
                                    <button onClick={editorRef.current?.moveBackward}><i className="fa fa-arrow-down"></i></button>
                                    {history.present.shapes.length > 0 && editorRef.current.selectedShapeIndex !== -1 &&
                                        <button title="Delete shape" onClick={editorRef.current?.DeleteSelectedShape}><i className="fa fa-circle-minus"></i></button>
                                    }
                                </div>
                            </Panel>
                        }
                        {editorRef.current?.getSelectedShape() &&
                            <Panel title="Paths">
                                <p>Paths: {editorRef.current?.getSelectedShape().paths.length}</p>
                                <p>Selected path:
                                    <input className="ml-2 w-[10ch]" type="number" value={editorRef.current?.selectedPathIndex} min={0} max={history.present.shapes[editorRef.current?.selectedShapeIndex]?.paths.length - 1} onChange={(e) => editorRef.current?.setSelectedPathIndex(Number(e.target.value))}></input>
                                </p>
                                <div className="flex flex-row gap-2">
                                    <button title="Add path" onClick={editorRef.current?.AddNewPath}><i className="fa fa-circle-plus"></i></button>
                                    <button title="Delete path" onClick={editorRef.current?.DeleteSelectedPath}><i className="fa fa-circle-minus"></i></button>
                                </div>
                                {/* Line color */}

                                <div className="flex flex-col">
                                    <label>Stroke</label>
                                    <div className="flex flex-row gap-2">
                                        <input
                                            className="colorSelect"
                                            type="color"
                                            value={editorRef.current?.getSelectedShape()?.strokeColor}
                                            onChange={(e) =>
                                                editorRef.current?.updateSelectedShape(s => ({ ...s, strokeColor: e.target.value }))
                                            }
                                        />
                                        <input
                                            type="checkbox"
                                            checked={editorRef.current?.getSelectedShape()?.useStroke}
                                            onChange={(e) =>
                                                editorRef.current?.updateSelectedShape(s => ({ ...s, useStroke: e.target.checked }))
                                            }
                                        />
                                        <button title="Randomize" onClick={(_e) => editorRef.current?.updateSelectedShape(s => ({ ...s, strokeColor: getRandomColor() }))}><i className="fa-solid fa-dice"></i></button>
                                    </div>
                                </div>


                                {/* Fill color */}
                                <div className="flex flex-col">
                                    <label>Fill</label>
                                    <div className="flex flex-row gap-2">
                                        <input
                                            className="colorSelect"
                                            type="color"
                                            value={editorRef.current?.getSelectedShape()?.fillColor}
                                            onChange={(e) =>
                                                editorRef.current?.updateSelectedShape(s => ({ ...s, fillColor: e.target.value }))
                                            }
                                        />
                                        <input
                                            type="checkbox"
                                            checked={editorRef.current?.getSelectedShape()?.useFill}
                                            onChange={(e) =>
                                                editorRef.current?.updateSelectedShape(s => ({ ...s, useFill: e.target.checked }))
                                            }
                                        />
                                        <button title="Randomize" onClick={(_e) => editorRef.current?.updateSelectedShape(s => ({ ...s, fillColor: getRandomColor() }))}><i className="fa-solid fa-dice"></i></button>
                                    </div>
                                </div>
                                {/* Line width */}
                                <div className="flex flex-col">
                                    <div className="flex flex-row gap-2">

                                        <label>Stroke width: </label>
                                        <input className="w-14" type="number" value={editorRef.current?.getSelectedShape()?.strokeWidth} onChange={(e) => editorRef.current?.updateSelectedShape(s => ({ ...s, strokeWidth: Number(e.target.value) }))}></input>
                                    </div>
                                    <input
                                        type="range"
                                        value={editorRef.current?.getSelectedShape()?.strokeWidth}
                                        min={1}
                                        max={128}
                                        onChange={(e) =>
                                            editorRef.current?.updateSelectedShape(s => ({ ...s, strokeWidth: Number(e.target.value) }))
                                        }
                                    />
                                </div>

                                {/* Toggle cyclic */}
                                <div className="flex flex-row gap-2">
                                    <label>Closed shape</label>
                                    <input
                                        type="checkbox"
                                        checked={editorRef.current?.getSelectedShape()?.cyclic}
                                        onChange={(e) =>
                                            editorRef.current?.updateSelectedShape(s => ({ ...s, cyclic: e.target.checked }))
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
                                                editorRef.current?.commit(prevShapes =>
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
                                                editorRef.current?.commit(prevShapes =>
                                                    prevShapes.map(s =>
                                                        s.strokeColor === color ? { ...s, strokeColor: newColor } : s
                                                    )
                                                );
                                            }}
                                        />
                                    ))}
                                </div>
                                <div className="flex flex-col gap-0.5">
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
                                                    editorRef.current?.commit(prevShapes =>
                                                        prevShapes.map(s =>
                                                            s.strokeColor === stroke && s.fillColor === fill
                                                                ? { ...s, strokeColor: fill, fillColor: stroke }
                                                                : s
                                                        )
                                                    );
                                                }}
                                            >
                                                <i className="fa-solid fa-shuffle"></i>
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
                                    <input className="colorSelect" type="color" value={editorRef.current?.gridColor ?? "#ffffff"} onChange={(e) => { editorRef.current?.setGridColor(e.target.value); editorRef.current?.setTick(t => t + 1); }} />
                                    <div className="flex flex-row gap-2 items-center ">
                                        <p >Alpha:</p>
                                        <input type="number" step={0.1} min={0} max={1} value={editorRef.current?.gridAlpha ?? 0.1} onChange={(e) => { editorRef.current?.setGridAlpha(Number(e.target.value)); editorRef.current?.setTick(t => t + 1); }}></input>
                                    </div>
                                </div>
                                <input type="range" value={editorRef.current?.gridAlpha ?? 0.1} step={0.01} min={0} max={1} onChange={(e) => { editorRef.current?.setGridAlpha(Number(e.target.value)); editorRef.current?.setTick(t => t + 1) }} />
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
                                <label>Grid subdivision: {editorRef.current?.gridSubdivisions ?? 8}</label>
                                <input type="range" value={editorRef.current?.gridSubdivisions ?? 8} min={1} max={128} onChange={(e) => { editorRef.current?.setGridSubdivisions(Number(e.target.value)); editorRef.current?.setTick(t => t + 1); }} />
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
                            <button onClick={(_e) => { editorRef.current?.resetCamera() }}>Reset</button>
                            <button onClick={(_e) => { editorRef.current?.centerCamera() }}>Center</button>
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
                                <button title="Clear" onClick={() => editorRef.current?.clearDocument()}><i className="fa-solid fa-file"></i></button>
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
                                        <button onClick={() => { editorRef.current?.commit(() => file.shapes); setFileName(file.fileName) }} >{file.fileName}</button>
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
