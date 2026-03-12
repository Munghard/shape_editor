import { DeleteTool } from "../Tools/DeleteTool";
import { FrameTool } from "../Tools/FrameTool";
import { InsertTool } from "../Tools/InsertTool";
import { MoveTool } from "../Tools/MoveTool";
import { PanTool } from "../Tools/PanTool";
import { RotateTool } from "../Tools/RotateTool";
import { ScaleTool } from "../Tools/ScaleTool";
import { SelectTool } from "../Tools/SelectTool";
import type { Tool } from "../Tools/Tool";
import type { Editor } from "./Editor";
import type { Rect } from "./Shape";

export type ToolEnum = "Select" | "Move" | "Rotate" | "Scale" | "Insert" | "Delete" | "Pan" | "Frame";

export class EditorTools {

    editor: Editor;
    frame: Rect;
    setFrame: React.Dispatch<React.SetStateAction<Rect>>;
    setToolEnum: React.Dispatch<React.SetStateAction<ToolEnum>>;
    setActiveTool: React.Dispatch<React.SetStateAction<Tool | null>>;

    constructor(
        editor: Editor,
        frame: Rect,
        setFrame: React.Dispatch<React.SetStateAction<Rect>>,
        setToolEnum: React.Dispatch<React.SetStateAction<ToolEnum>>,
        setActiveTool: React.Dispatch<React.SetStateAction<Tool | null>>
    ) {
        this.editor = editor;
        this.frame = frame;
        this.setFrame = setFrame;
        this.setToolEnum = setToolEnum;
        this.setActiveTool = setActiveTool;
    }

    setTool(tool: ToolEnum) {
        this.setToolEnum(tool);
        switch (tool) {
            case "Delete":
                this.handleToolChange(new DeleteTool());
                break;
            case "Select":
                this.handleToolChange(new SelectTool());
                break;
            case "Move":
                this.handleToolChange(new MoveTool());
                break;
            case "Rotate":
                this.handleToolChange(new RotateTool());
                break;
            case "Scale":
                this.handleToolChange(new ScaleTool());
                break;
            case "Insert":
                this.handleToolChange(new InsertTool());
                break;
            case "Pan":
                this.handleToolChange(new PanTool());
                break;
            case "Frame":
                this.handleToolChange(new FrameTool(this.setFrame));
                break;
        }
    }

    handleToolChange = (tool: Tool) => {
        this.editor.activeTool = tool;
        this.setActiveTool(tool);
    }

}