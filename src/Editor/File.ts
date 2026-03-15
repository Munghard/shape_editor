
import { MAX_RECENT, RECENTFILESKEY } from "../Constants";
import type { SaveData } from "../components/SaveData";
import { DrawShape, type Rect, type Shape } from "./Shape";




export function ExportShape(
    selectedExportScale: string,
    fileName: string,
    shapes: Shape[],
    frame: Rect,
): void {
    const scale = Number(selectedExportScale);


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
    ctx.translate(-frame.x, -frame.y);

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
export function SaveFile(fileName: string, shapes: Shape[], useGrid: boolean, snapGrid: boolean, gridSubd: number, frameRect: Rect): void {
    const saveData: SaveData = {
        id: crypto.randomUUID(),
        fileName,
        shapes,
        useGrid,
        snapGrid,
        gridSubd,
        frameRect,
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

export function LoadFile(): Promise<SaveData> {
    return new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";

        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return reject("No file selected");

            try {
                const text = await file.text();
                const data: SaveData = JSON.parse(text);
                resolve(data);
            } catch (err) {
                reject("Failed to parse JSON");
            }
        };

        input.click();
    });
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