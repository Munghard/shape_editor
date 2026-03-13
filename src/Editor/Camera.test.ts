import React from 'react';
import { EditorCamera } from './Camera';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';


describe('EditorCamera', () => {
    let editorCamera: EditorCamera;


    beforeEach(() => {
        const mockEditor = {
            canvasRef: { current: document.createElement('canvas') },
            setTick: jest.fn(),
            Draw: jest.fn(),
            editorGrid: { ReDrawGrid: jest.fn() },
        } as any; // 'as any' to bypass type issues for the mock

        editorCamera = new EditorCamera(mockEditor);
        mockEditor.editorCamera = editorCamera;
        editorCamera.camera = { x: 0, y: 0, zoom: 1 };
    });

    it('should zoom in when wheel event with negative deltaY is received', () => {
        const mockWheelEvent = { deltaY: -1 } as React.WheelEvent<HTMLCanvasElement>;
        editorCamera.zoomInOut(mockWheelEvent);

        expect(editorCamera.camera.zoom).toBeGreaterThan(1);
    });

    it('should zoom out when wheel event with positive deltaY is received', () => {
        const mockWheelEvent = { deltaY: 1 } as React.WheelEvent<HTMLCanvasElement>;
        editorCamera.zoomInOut(mockWheelEvent);

        expect(editorCamera.camera.zoom).toBeLessThan(1);
    });

    it('should reset camera position correctly', () => {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;

        const mockEditor = {
            canvasRef: { current: canvas },
            setTick: jest.fn(),
            Draw: jest.fn(),
            editorGrid: { ReDrawGrid: jest.fn() },
        } as any;

        editorCamera = new EditorCamera(mockEditor);
        editorCamera.camera = { x: 4846, y: 157, zoom: 1 };
        mockEditor.editorCamera = editorCamera;
        editorCamera.resetCamera();

        expect(editorCamera.camera.x).toBe(-canvas.width / 2);
        expect(editorCamera.camera.y).toBe(-canvas.height / 2);
        expect(editorCamera.camera.zoom).toBe(1);
    });
});
