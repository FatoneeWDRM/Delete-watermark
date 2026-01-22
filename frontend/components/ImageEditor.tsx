'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
import { FaUndo, FaDownload } from 'react-icons/fa';
import { FaWandMagicSparkles } from 'react-icons/fa6';
import axios from 'axios';
// import { cn } from '@/lib/utils';
// import Image from 'next/image'; // Removed to avoid collision with new Image() constructor

interface ImageEditorProps {
    imageFile: File;
    onReset: () => void;
}

export default function ImageEditor({ imageFile, onReset }: ImageEditorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
    const [brushSize, setBrushSize] = useState(20);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [originalImageObj, setOriginalImageObj] = useState<fabric.Image | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = new fabric.Canvas(canvasRef.current, {
            isDrawingMode: true,
            backgroundColor: 'transparent',
        });

        // Configure Brush
        const brush = new fabric.PencilBrush(canvas);
        brush.color = 'rgba(255, 0, 0, 0.5)';
        brush.width = 20; // Default
        canvas.freeDrawingBrush = brush;

        setFabricCanvas(canvas);

        return () => {
            canvas.dispose();
            setFabricCanvas(null);
        };
    }, []); // Run once on mount

    // Load Image
    useEffect(() => {
        if (!fabricCanvas || !imageFile) return;

        let isCancelled = false;

        const reader = new FileReader();
        reader.onload = (e) => {
            if (isCancelled) return;
            const imgObj = new Image();
            imgObj.src = e.target?.result as string;
            imgObj.onload = () => {
                if (isCancelled) return; // Standard lifecycle check

                const fImg = new fabric.Image(imgObj);

                // Scale to fit window (rough logic, can be improved)
                const maxWidth = window.innerWidth * 0.8;
                const maxHeight = window.innerHeight * 0.6;
                let scale = 1;

                if (fImg.width! > maxWidth || fImg.height! > maxHeight) {
                    scale = Math.min(maxWidth / fImg.width!, maxHeight / fImg.height!);
                }

                fImg.scale(scale);

                try {
                    // Use getScaledWidth/Height for accuracy
                    const scaledWidth = fImg.getScaledWidth();
                    const scaledHeight = fImg.getScaledHeight();

                    fabricCanvas.setDimensions({ width: scaledWidth, height: scaledHeight });

                    // Add image as background, not selectable
                    fImg.set({
                        selectable: false,
                        evented: false,
                        opacity: 1,
                        left: 0,
                        top: 0,
                        originX: 'left',
                        originY: 'top'
                    });

                    fabricCanvas.add(fImg);
                    fabricCanvas.sendObjectToBack(fImg);
                    setOriginalImageObj(fImg);
                    fabricCanvas.renderAll();
                } catch (error) {
                    console.error("Error setting up canvas image:", error);
                }
            };
        };
        reader.readAsDataURL(imageFile);

        return () => {
            isCancelled = true;
        };
    }, [fabricCanvas, imageFile]);

    // Update Brush Size
    useEffect(() => {
        if (fabricCanvas && fabricCanvas.freeDrawingBrush) {
            fabricCanvas.freeDrawingBrush.width = brushSize;
        }
    }, [brushSize, fabricCanvas]);

    const handleProcess = async () => {
        if (!fabricCanvas) return;
        setIsProcessing(true);

        try {
            // 1. Get Mask
            // We need to isolate the drawing. 
            // Hide original image
            if (originalImageObj) originalImageObj.visible = false;
            fabricCanvas.backgroundColor = 'black';

            // Change drawing color to white for mask
            const objects = fabricCanvas.getObjects();
            objects.forEach((obj: fabric.Object) => { // Fixed type from any to fabric.Object
                if (obj !== originalImageObj) { // simplistic check
                    obj.set('stroke', 'white');
                }
            });
            fabricCanvas.renderAll();

            const maskDataUrl = fabricCanvas.toDataURL({
                format: 'png',
                multiplier: 1
            });

            // Restore for user
            if (originalImageObj) originalImageObj.visible = true;
            fabricCanvas.backgroundColor = 'transparent';
            objects.forEach((obj: fabric.Object) => { // Fixed type from any to fabric.Object
                if (obj !== originalImageObj) {
                    obj.set('stroke', 'rgba(255, 0, 0, 0.5)');
                }
            });
            fabricCanvas.renderAll();

            // 2. Prepare Form Data
            // Convert DataURLs to Blobs
            const maskBlob = await (await fetch(maskDataUrl)).blob();

            const formData = new FormData();
            formData.append('image', imageFile);
            formData.append('mask', maskBlob, 'mask.png');

            // 3. Send to Backend
            const response = await axios.post(`${API_URL}/process-image`, formData, {
                responseType: 'arraybuffer'
            });

            // 4. Display result
            const blob = new Blob([response.data], { type: 'image/png' });
            const url = URL.createObjectURL(blob);
            setProcessedImage(url);

        } catch (e) {
            console.error("Processing failed", e);
            alert("Failed to process image");
        } finally {
            setIsProcessing(false);
        }
    };

    const clearMask = () => {
        if (!fabricCanvas) return;
        const objects = fabricCanvas.getObjects();
        objects.forEach(obj => {
            if (obj !== originalImageObj) {
                fabricCanvas.remove(obj);
            }
        });
    };

    return (
        <div className="flex flex-col items-center gap-4 w-full max-w-6xl mx-auto p-4">

            <div className="flex justify-between w-full items-center mb-4 bg-secondary p-3 rounded-lg">
                <div className="flex items-center gap-4">
                    <label className="text-sm">Brush Size: {brushSize}px</label>
                    <input
                        type="range"
                        min="5"
                        max="100"
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                        className="w-32"
                    />
                </div>

                <div className="flex gap-2">
                    <button onClick={clearMask} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded flex items-center gap-2">
                        <FaUndo /> Clear Mask
                    </button>
                    <button
                        onClick={handleProcess}
                        disabled={isProcessing}
                        className="px-6 py-2 bg-primary hover:bg-blue-600 font-bold rounded flex items-center gap-2"
                    >
                        {isProcessing ? 'Processing...' : <><FaWandMagicSparkles /> Remove Watermark</>}
                    </button>
                </div>
            </div>

            <div className="flex gap-4 w-full justify-center flex-wrap">
                {/* Canvas Area */}
                <div className="border border-gray-700 relative shadow-2xl rounded-lg overflow-hidden flex justify-center items-center bg-zinc-900">
                    <canvas ref={canvasRef} />
                </div>

                {/* Result Area */}
                {processedImage && (
                    <div className="border border-green-500/50 relative shadow-2xl rounded-lg overflow-hidden flex justify-center items-center bg-zinc-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={processedImage} alt="Processed" className="max-w-full max-h-[80vh] object-contain" />
                        <a
                            href={processedImage}
                            download="processed_image.png"
                            className="absolute bottom-4 right-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow-lg flex items-center gap-2 font-bold"
                        >
                            <FaDownload /> Download
                        </a>
                    </div>
                )}
            </div>

            <button onClick={onReset} className="mt-8 text-gray-400 hover:text-white underline">
                Upload new image
            </button>

        </div>
    );
}
