"use client"
import { useState, useRef } from "react";
import { Stage, Layer, Line } from "react-konva"


export default function DrawingArea() {
	const [lines, setLines] = useState([]);
    const isDrawing = useRef(false);
    const [pencilStrokeWidth, setPencilStrokeWidth] = useState(2);
    const [color, setColor] = useState("#ffffff");

    const handleMouseDown = (e) => {
        isDrawing.current = true;
        const pos = e.target.getStage().getPointerPosition();
        setLines([...lines, { points: [pos.x, pos.y], strokeWidth: pencilStrokeWidth, strokeColor:color }]);

    }

    const handleMouseMove = (e) => {
        if (!isDrawing.current) return;

        const stage = e.target.getStage();
        const point = stage.getPointerPosition();

        const lastLine = lines[lines.length - 1];
        lastLine.points = lastLine.points.concat([point.x, point.y]);


        const updatedLines = lines.slice(0, -1).concat(lastLine);
        setLines(updatedLines);
    }

    const handleMouseUp = (e) => {
        isDrawing.current = false;
    }

    const undo = () => {
        if (lines.length === 0) return;
        setLines(prevLines => prevLines.slice(0, -1));
    }

    const clearCanvas = () => {
        setLines([]);
    }

    const handleColorChange = (e) => {
        setColor(e.target.value);
    }

    return (
        <>
            <button onClick={undo}>
                ↪️
            </button>
            <button onClick={clearCanvas}>
                🗑️
            </button>

            <select
                value={pencilStrokeWidth}
                onChange={(e) => setPencilStrokeWidth(Number(e.target.value))}
            >
                <option value={1}>1 px</option>
                <option value={2}>2 px</option>
                <option value={4}>4 px</option>
                <option value={6}>6 px</option>
            </select>

            <input type="color" value={color} onChange={handleColorChange}/>


            <Stage
                width={700}
                height={700}
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                onMouseMove={handleMouseMove}
                onTouchMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchEnd={handleMouseUp}
            >
                <Layer>
                    {lines.map((line, i) => (
                        <Line
                            key={i}
                            points={line.points}
                            stroke={line.strokeColor || "black"}
                            strokeWidth={line.strokeWidth || 2}
                            tension={0.5}
                            lineCap="round"
                            lineJoin="round"
                            globalCompositeOperation="source-over"
                        />
                    ))}
                </Layer>
            </Stage>
        </>
    )
}
