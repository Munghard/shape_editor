import type { Camera } from "./Camera";
import { MAX_RECENT, RECENTFILESKEY } from "./Main";
import type { SaveData } from "./SaveData";
import { DrawShape, type Shape } from "./Shape";




export function ExportShape(ctx: CanvasRenderingContext2D, cameraRef: Camera, selectedExportScale: string, fileName: string, shapes: Shape[]): void {

    // scale context
    ctx.scale(Number(selectedExportScale), Number(selectedExportScale));

    // draw shapes onto temp canvas
    shapes.forEach(shape => DrawShape(ctx, shape, cameraRef)); // adjust DrawShape to accept ctx

    // Export
    const dataUrl = ctx.canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName + ".png"
    link.click();
}

export function SaveFile(fileName: string, shapes: Shape[], useGrid: boolean, snapGrid: boolean, gridSubd: number): void {
    const saveData: SaveData = {
        id: crypto.randomUUID(),
        fileName,
        shapes,
        useGrid,
        snapGrid,
        gridSubd,
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

export function LoadFile(
    setFileName: (fileName: string) => void,
    setShapes: (shapes: Shape[]) => void,
    setShowGrid: (showGrid: boolean) => void,
    setSnapToGrid: (snapToGrid: boolean) => void,
    setGridSubdivisions: (gridsubd: number) => void,
): void {
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


export function AddToRecentFiles(data: string) {
    const stored = localStorage.getItem(RECENTFILESKEY);
    let files: string[] = stored ? JSON.parse(stored) : [];
    files = files.filter(f => f !== data);
    files.unshift(data);
    if (files.length > MAX_RECENT) files.slice(0, MAX_RECENT);
    localStorage.setItem(RECENTFILESKEY, JSON.stringify(files));
}
