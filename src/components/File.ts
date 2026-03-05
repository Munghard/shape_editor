
import { MAX_RECENT, RECENTFILESKEY } from "./Main";
import type { SaveData } from "./SaveData";
import { DrawShape, type Rect, type Shape } from "./Shape";




export function ExportShape(
    selectedExportScale: string,
    fileName: string,
    shapes: Shape[],
    frame: Rect,
    canvas: HTMLCanvasElement,
): void {
    const scale = Number(selectedExportScale);

    const rect = canvas.getBoundingClientRect();
    const canvasOffsetX = rect.x;
    const canvasOffsetY = rect.y;

    // 1. Create canvas at the final output size
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = frame.w * scale;
    tempCanvas.height = frame.h * scale;

    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return;

    // 2. Clear and reset transformations
    ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.save();

    // 3. Apply Export Scale
    ctx.scale(scale, scale);

    // 4. Translate the context so that the Frame's Top-Left (x, y) 
    // becomes the Canvas's (0, 0)
    ctx.translate(-frame.x - canvasOffsetX, -frame.y - canvasOffsetY);

    // 5. Draw shapes in their original global coordinates
    // We no longer need to manually map/offset every point in the shapes!
    shapes.forEach(shape => {
        DrawShape(ctx, shape);
    });

    ctx.restore();

    // 6. Export
    const dataUrl = tempCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${fileName}.png`;
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
    commit: (updater: (shapes: Shape[]) => Shape[]) => void,
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
                commit(() => loadData.shapes);
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

export function RemoveFromLocalStorage(id: string, setRecentFiles: (files: SaveData[]) => void) {
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