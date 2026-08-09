"use client"
import { useState, useRef, useEffect, useCallback } from "react";
import { Stage, Layer, Line } from "react-konva"
import { ref, onValue, set, push, onChildAdded, get } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { rtdb, auth } from "@/lib/firebaseConfigs";

export default function DrawingArea({ roomCode}) {
    const [lines, setLines] = useState([]);           // completed strokes (static layer)
    const [activeLine, setActiveLine] = useState(null); // current stroke being drawn (active layer)
    const isDrawing = useRef(false);
    const [pencilStrokeWidth, setPencilStrokeWidth] = useState(2);
    const [color, setColor] = useState("#000000");
    const containerRef = useRef();
    const [strokeDropdownOpen, setStrokeDropdownOpen] = useState(false);
    const lastSentPointIndex = useRef(0); // tracks which points have been sent to Firebase
    const throttleTimer = useRef(null);
    const activeLineRef = useRef(null); // ref mirror of activeLine for use inside throttled callbacks
    const lastUndoTimestamp = useRef(null);
    const [isDrawer, setIsDrawer] = useState(false);
    const [user, setUser] = useState(null);
    const [playerIds, setPlayerIds] = useState(null);
    const [whoseTurn, setWhoseTurn] = useState(null);
    
    // ─── CHECK if current user is the drawer
    // This effect runs whenever the user or playerIds changes, and sets isDrawer to true if the current user is the first player in the list. 
    // NOTE: This sets the first player in the list as the drawer. Later on, the drawer will change after every round.
    useEffect(() => {
        if (user && playerIds && whoseTurn !== null && user.uid === playerIds[whoseTurn]) {
            setIsDrawer(true);
        } else {
            setIsDrawer(false);
        }
    }, [user, playerIds, whoseTurn]);


    // ─── LISTEN for strokes from other players ───────────────────────────────

    useEffect(() => {
        onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            }
        })

        const whoseTurnRef = ref(rtdb, `room/${roomCode}/whoseTurn`);
        onValue(whoseTurnRef, (snapshot) => {
            console.log("whoseTurn updated:", snapshot.val());
            setWhoseTurn(snapshot.val());
        });

        async function fetchPlayers() {
            const playersRef = ref(rtdb, `room/${roomCode}/players`);
            const snapshot = await get(playersRef);
            const idArray = snapshot.val();
            setPlayerIds(idArray);
        }
        fetchPlayers();
        
        const drawingLinesRef = ref(rtdb, `room/${roomCode}/drawingLines`); 
        // onChildAdded fires once per existing stroke on mount, then for each new one.
        // This means we only process NEW strokes, not the whole array every time.
        const unsubscribe = onChildAdded(drawingLinesRef, (snapshot) => {
            /* const stroke = snapshot.val();
            if (stroke) {
                setLines(prev => [...prev, stroke]);
            } */

            const stroke = snapshot.val(); 
            // console.log(stroke);
            const key = snapshot.key; // 👈 save the key
            if (stroke) {
                setLines(prev => [...prev, { ...stroke, _key: key }]);
            }
            // console.log(lines);
        });

        const clearRef = ref(rtdb, `room/${roomCode}/clearTimestamp`);
        const unsubscribeClear = onValue(clearRef, (snapshot) => {
            if (snapshot.val() !== null) {
                setLines([]);
                setActiveLine(null);
            }
        });


        const undoRef = ref(rtdb, `room/${roomCode}/undoTimestamp`);
        const unsubscribeUndo = onValue(undoRef, (snapshot) => {
            const val = snapshot.val();
            if (val !== null && val !== lastUndoTimestamp.current) {
                lastUndoTimestamp.current = val;
                setLines(prev => prev.slice(0, -1));
            }
        });

        return () => {
            unsubscribe();
            unsubscribeClear();
            unsubscribeUndo();

        }
    }, [roomCode]);


    // ─── SEND the completed stroke to Firebase (only on mouse/touch up) ───────
    const pushStrokeToFirebase = useCallback(async (stroke) => {
        const drawingLinesRef = ref(rtdb, `room/${roomCode}/drawingLines`);
        await push(drawingLinesRef, stroke); // push() adds a new child, doesn't overwrite
    }, [roomCode]); 

    // ─── THROTTLED point sender (during active drawing) ───────────────────────
    // Sends only new points to Firebase at most every 30ms instead of every frame.
    const throttledSendPoints = useCallback((points) => {
        if (throttleTimer.current) return; // already scheduled, skip
        throttleTimer.current = setTimeout(() => {
            throttleTimer.current = null;
            // Nothing to do here — we push the full stroke on mouseUp instead.
            // This throttle just limits how often we update the active line state.
        }, 30);
    }, []);

    // ─── DRAWING HANDLERS ─────────────────────────────────────────────────────
    const handleMouseDown = (e) => {
        if (!isDrawer) return; // only the drawer can draw
        isDrawing.current = true;
        lastSentPointIndex.current = 0;

        const pos = e.target.getStage().getPointerPosition();
        const newLine = {
            points: [pos.x, pos.y],
            strokeWidth: pencilStrokeWidth,
            strokeColor: color
        };
        activeLineRef.current = newLine;
        setActiveLine(newLine);
    };

    const handleMouseMove = (e) => {
        if (!isDrawing.current || !isDrawer) return;

        const stage = e.target.getStage();
        const point = stage.getPointerPosition();

        // Update active line locally (instant, no Firebase involved)
        const updated = {
            ...activeLineRef.current,
            points: [...activeLineRef.current.points, point.x, point.y]
        };
        activeLineRef.current = updated;

        // Throttle the React state update so Konva doesn't re-render every frame
        if (!throttleTimer.current) {
            throttleTimer.current = setTimeout(() => {
                throttleTimer.current = null;
                setActiveLine({ ...activeLineRef.current }); // trigger re-render of active layer only
            }, 16); // ~60fps cap
        }
    };

    const handleMouseUp = () => {
        if (!isDrawing.current || !isDrawer) return;
        isDrawing.current = false;

        const finishedLine = activeLineRef.current;
        if (!finishedLine) return;

        // Move stroke from active layer to static layer locally
        // setLines(prev => [...prev, finishedLine]);
        setActiveLine(null);
        activeLineRef.current = null;

        // Only NOW push to Firebase — one write per stroke, not per point
        pushStrokeToFirebase(finishedLine);
    };

    // ─── UNDO / CLEAR ─────────────────────────────────────────────────────────
    const undo = () => {
        if (lines.length === 0) return;
        const lastKey = lines[lines.length - 1]._key;
        set(ref(rtdb, `room/${roomCode}/undoTimestamp`), Date.now());
        // Delete just that one stroke from the database
        set(ref(rtdb, `room/${roomCode}/drawingLines/${lastKey}`), null);
    };

    const clearCanvas = () => {
        setLines([]);
        setActiveLine(null);
        // Write a clear signal instead of nuking the whole node
        set(ref(rtdb, `room/${roomCode}/clearTimestamp`), Date.now()); 
        set(ref(rtdb, `room/${roomCode}/drawingLines`), null);
    };

    // ─── UI HANDLERS ──────────────────────────────────────────────────────────
    const toggleDropDown = () => setStrokeDropdownOpen(!strokeDropdownOpen);
    const handleColorChange = (e) => setColor(e.target.value);
    const handleStrokeWidth = (width) => setPencilStrokeWidth(width);

    return (
        <div ref={containerRef} className="bg-white w-[320px] h-[300px]">
            {isDrawer && (
                <div className="flex items-center gap-2">
                    <button onClick={undo} className="h-[20px]">↪️</button>
                    <button onClick={clearCanvas} className="h-[20px]">🗑️</button>

                    <div className="w-[70px] h-[20px] relative" onClick={toggleDropDown}>
                        {!strokeDropdownOpen ? (
                            <span className={`w-[60px] h-[${pencilStrokeWidth}px] bg-black absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-5`}></span>
                        ) : null}

                        {strokeDropdownOpen ? (
                            <div className="bg-pink-300 w-[70px] h-[100px] flex items-center justify-center flex-col">
                                {[2, 4, 6, 8].map(w => (
                                    <div key={w} className="w-[60px] h-[20px] flex items-center justify-center z-10" onClick={() => handleStrokeWidth(w)}>
                                        <span className={`w-[60px] h-[${w}px] bg-black flex items-center justify-center`}></span>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <input type="color" value={color} onChange={handleColorChange} />
                </div>
            )}

            <Stage
                width={320}
                height={269}
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                onMouseMove={handleMouseMove}
                onTouchMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchEnd={handleMouseUp}
            >
                {/* Static layer: completed strokes — never re-renders during active drawing */}
                <Layer listening={false}>
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

                {/* Active layer: only the stroke currently being drawn */}
                <Layer>
                    {activeLine && (
                        <Line
                            points={activeLine.points}
                            stroke={activeLine.strokeColor || "black"}
                            strokeWidth={activeLine.strokeWidth || 2}
                            tension={0.5}
                            lineCap="round"
                            lineJoin="round"
                            globalCompositeOperation="source-over"
                        />
                    )}
                </Layer>
            </Stage>
        </div>
    );
}
