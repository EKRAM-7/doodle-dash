"use client"

import { auth, db, rtdb } from "@/lib/firebaseConfigs";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get, set, onValue, update } from "firebase/database";
import { doc, getDocs, collection, getDoc } from "firebase/firestore";
import { useEffect, useState, useRef } from "react";

import Players from "./Players";
import DrawingArea from "./DrawingArea";
import WordSelectionScreen from "./WordSelectionScreen";

export default function ClientRoom({ roomCode }) {

    let [playerIds, setPlayerIds] = useState([]);
    let [playerNames, setPlayerNames] = useState([]);
    let [user, setUser] = useState(null);
    let [drawTime, setDrawTime] = useState(10);
    let [wordSelectionTime, setWordSelectionTime] = useState(10);
    let [breakTime, setBreakTime] = useState(10);
    let [gameState, setGameState] = useState("waiting");
    let [whoseTurn, setWhoseTurn] = useState(null);
    let [isDrawer, setIsDrawer] = useState(false);
    let [phaseStartedAt, setPhaseStartedAt] = useState(null);
    let [selectedWord, setSelectedWord] = useState("");
    let [guessInput, setGuessInput] = useState("");
    let [scoreBoard, setScoreBoard] = useState({});

    useEffect(() => {
        if (user && playerIds && whoseTurn !== null && gameState !== "waiting" && user.uid === playerIds[whoseTurn]) {
            setIsDrawer(true);
        } else {
            setIsDrawer(false);
        }
    }, [user, playerIds, whoseTurn, gameState]);

    useEffect(() => {
        onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            }
        })
        const gameStateRef = ref(rtdb, `room/${roomCode}/gameState`);
        // set(ref(rtdb, `room/${roomCode}/gameState`), "waiting");

        async function initGameStateIfNeeded() {
            const snapshot = await get(gameStateRef);
            if (snapshot.val() === "not-started") { // only true for a brand-new room
                await set(gameStateRef, "waiting");
            }
        }
        initGameStateIfNeeded();

        // --- Below are the onValue listeners for the gameState, phaseStartedAt, players, whoseTurn, and selectedWord ---

        // This listener updates the gameState state variable whenever the gameState in the database changes.
        onValue(gameStateRef, (snapshot) => {
            setGameState(snapshot.val());
        })

        // This listener updates the phaseStartedAt state variable whenever the phaseStartedAt in the database changes.
        const phaseStartedAtRef = ref(rtdb, `room/${roomCode}/phaseStartedAt`);
        onValue(phaseStartedAtRef, (snapshot) => {
            setPhaseStartedAt(snapshot.val());
        });

        // This listener updates the playerIds and playerNames state variables whenever the players in the database change.
        const playersRef = ref(rtdb, `room/${roomCode}/players`);
        onValue(playersRef, async (snapshot) => {
            fetchPlayers();
            // Also add/remove the player to/from the scoreBoard object in the rtdb
            updateScoreBoard();
        })

        // This listener updates the whoseTurn state whenever the whoseTurn in the database changes.
        const whoseTurnRef = ref(rtdb, `room/${roomCode}/whoseTurn`);
        onValue(whoseTurnRef, (snapshot) => {
            setWhoseTurn(snapshot.val());
        });

        // This listener updates the selectedWord state whenever the selectedWord in the database changes. 
        const selectedWordRef = ref(rtdb, `room/${roomCode}/selectedWord`);
        onValue(selectedWordRef, (snapshot) => {
            setSelectedWord(snapshot.val());
        });

        // This function fetches the player IDs and their corresponding usernames from the database and updates the state variables playerIds and playerNames.
        async function fetchPlayers() {
            let playersRef = ref(rtdb, `room/${roomCode}/players`);
            let snapshot = await get(playersRef);
            let idArray = snapshot.val();
            let playerNamesArray = [];
            for (let id of idArray) {
                let playerNameRef = doc(db, "users", id);
                let docSnap = await getDoc(playerNameRef);
                docSnap = docSnap.data().username;
                playerNamesArray.push(docSnap);
            }
            setPlayerIds(idArray);
            setPlayerNames(playerNamesArray);

        }

        fetchPlayers();


    }, [])

    // This function updates the scoreBoard in the database to ensure that all players have an entry in the scoreBoard, even if they haven't scored any points yet. It fetches the current scoreBoard from the database, checks if each player ID is present, and if not, adds it with a score of 0. Finally, it updates the scoreBoard in the database.
    async function updateScoreBoard() {
        const snapshot = await get(ref(rtdb, `room/${roomCode}/scoreBoard`));
        const tempScoreBoard = snapshot.val()
        console.log(tempScoreBoard);
        const playersRef = ref(rtdb, `room/${roomCode}/players`);
        const playersSnapshot = await get(playersRef);
        const playerIds = playersSnapshot.val()
        for (let id of playerIds) {
            //  console.log(tempScoreBoard[id]);
            console.log(id);

        }
        await set(ref(rtdb, `room/${roomCode}/scoreBoard`), tempScoreBoard);
        setScoreBoard(tempScoreBoard);
    }



    // This useEffect will run whenever the gameState changes. If the gameState is "selection_phase", it will start a timer for the word selection phase. If the gameState is "drawing_phase", it will start a timer for the drawing phase.
    useEffect(() => {

        if (gameState === "break") {
            const breakInterval = setInterval(() => {
                const remainingTime = getRemainingTime(phaseStartedAt, 10);
                setBreakTime(remainingTime);

                if (remainingTime === 0) {
                    clearInterval(breakInterval);
                    setGameState("selection_phase");
                    set(ref(rtdb, `room/${roomCode}/gameState`), "selection_phase"); // Update the gameState in the database to "selection_phase" when the waiting timer runs out
                    set(ref(rtdb, `room/${roomCode}/phaseStartedAt`), Date.now()); // Update phaseStartedAt for the selection phase
                }

            }, 1000)

            return () => clearInterval(breakInterval);
        }

        if (gameState === "selection_phase") {

            const wordSelectionInterval = setInterval(() => {
                // Calculate the remaining time based on the phaseStartedAt timestamp and the duration of the word selection phase (10 seconds, will later be changed**)
                const remainingTime = getRemainingTime(phaseStartedAt, 10);
                setWordSelectionTime(remainingTime);

                // Time's up logic: If the remaining time is 0, clear the interval and transition to the drawing phase.
                if (remainingTime === 0) {
                    clearInterval(wordSelectionInterval);
                    setGameState("drawing_phase");
                    set(ref(rtdb, `room/${roomCode}/gameState`), "drawing_phase"); // Update the gameState in the database to "drawing_phase" when the word selection timer runs out
                    set(ref(rtdb, `room/${roomCode}/phaseStartedAt`), Date.now()); // Update phaseStartedAt for the drawing phase
                }
            }, 1000)

            return () => clearInterval(wordSelectionInterval);

        }

        if (gameState === "drawing_phase") {

            const drawInterval = setInterval(async () => {
                const remainingTime = getRemainingTime(phaseStartedAt, 10);
                setDrawTime(remainingTime);

                if (remainingTime === 0) {
                    clearInterval(drawInterval);

                    const whoseTurnRef = ref(rtdb, `room/${roomCode}/whoseTurn`);
                    const currentWhoseTurnSnapshot = await get(whoseTurnRef);

                    if (currentWhoseTurnSnapshot.val() === playerIds.length - 1) {
                        await set(whoseTurnRef, 0);
                    } else {
                        await set(whoseTurnRef, currentWhoseTurnSnapshot.val() + 1);
                    }

                    // setGameState("selection_phase");
                    setGameState("break");
                    // set(ref(rtdb, `room/${roomCode}/gameState`), "selection_phase");
                    set(ref(rtdb, `room/${roomCode}/gameState`), "break");
                    set(ref(rtdb, `room/${roomCode}/phaseStartedAt`), Date.now());
                    set(ref(rtdb, `room/${roomCode}/selectedWord`), ""); // Clear the selected word in the database when the drawing phase ends
                    set(ref(rtdb, `room/${roomCode}/drawingLines`), []); // Clear the drawing lines in the database when the drawing phase ends, so that the canvas appears blank after every round
                    set(ref(rtdb, `room/${roomCode}/round`), (await get(ref(rtdb, `room/${roomCode}/round`))).val() + 1); // Increment the round number in the database when the drawing phase ends

                    const roundSnapshot = await get(ref(rtdb, `room/${roomCode}/round`));

                    const scoreBoardSnapshot = await get(ref(rtdb, `room/${roomCode}/scoreBoard`));
                    let scoreBoardReset = {}
                    for (let id in scoreBoardSnapshot.val()) {
                        scoreBoardReset[id] = 0;
                    }
                    if (roundSnapshot.val() > 3) {
                        set(ref(rtdb, `room/${roomCode}`), {
                            gameState: 'waiting',
                            players: playerIds,
                            drawingLines: [],
                            selectedWord: "",
                            whoseTurn: 0,
                            scoreBoard: scoreBoardReset,
                            round: 0
                        })
                    }



                }
            }, 1000)

            return () => clearInterval(drawInterval);
        }

    }, [gameState, phaseStartedAt, playerIds])


    function getRemainingTime(phaseStartedAt, duration) {
        if (!phaseStartedAt) return duration; // not started yet, show full time
        const elapsedSeconds = (Date.now() - phaseStartedAt) / 1000;
        const remaining = duration - elapsedSeconds;
        return Math.max(0, Math.ceil(remaining)); // never show negative time
    }

    // Once the host clicks the start button, update the gameState in the database to "selection_phase". Also start the game timer.
    async function startGame() {
        let gameStateRef = ref(rtdb, `room/${roomCode}/gameState`);
        /* let scoreBoard = {}
        for (let i of playerIds) {
            scoreBoard[i] = 0;
        } */
        await set(gameStateRef, "selection_phase"); // Update the gameState in the database to "selection_phase" when the host clicks the start button

        // await set(ref(rtdb, `room/${roomCode}/scoreBoard`), scoreBoard);
        // Update phaseStartedAt in the database to the current timestamp
        await set(ref(rtdb, `room/${roomCode}/phaseStartedAt`), Date.now());
        setGameState("selection_phase");

    }

    /* This function will be called when the game starts. It will start two timers
        1. wordSelectionTime: This timer will count down from 10 seconds. During this time, the player whose turn it is will select a word to draw.
        2. drawTime: This timer will count down from 60 seconds. During this time, the player whose turn it is will draw the selected word while the other players try to guess it.
    */


    async function enterGuessedWord() {
        /* 
            ## THINGS TO DO
            1. update scores
            2. Display the word to the player (by removing the placeholders) if the guess is right
            3. OPTIONAL: A pop up prompting that the guess is right (with a sound effect if possible)
            4. When the user enters wrong guess, the guess should be displayed in the chat area
        */
        if (guessInput.toLowerCase() === selectedWord.toLowerCase()) {
            const scoreBoardRef = ref(rtdb, `room/${roomCode}/scoreBoard`);
            const snap = await get(scoreBoardRef);
            const current = snap.val()?.[user.uid] ?? 0;   // default 0 if missing

            let pointsToAdd = 0;
            if (drawTime < 15) pointsToAdd = 1;
            else if (drawTime < 35) pointsToAdd = 3;
            else pointsToAdd = 5;

            await update(scoreBoardRef, {
                [user.uid]: current + pointsToAdd   // shallow merge – only this child changes
            });
        }
    }

    async function updateScore(points) {
        const snapshot = await get(ref(rtdb, `room/${roomCode}/scoreBoard`));
        const tempScoreBoard = snapshot.val()
        tempScoreBoard[user.uid] += points;
        setScoreBoard(tempScoreBoard);
        await set(ref(rtdb, `room/${roomCode}/scoreBoard`), tempScoreBoard);

    }

    function getWordBlanks(word) {
        if (!word) return "";
        return word
            .split("")
            .map(() => "_")
            .join(" "); // one space between each dash for spacing
    }

    return (
        <div className="w-screen h-screen max-w-[400px] z-10 px-3 gap-3 flex flex-col justify-center-safe items-center overflow-hidden bg-gradient-to-b from-[#EEF0FF] to-[#E3E7FF]">

            {/* ── Room header ─────────────────────────────────────────── */}
            <div className="w-full flex items-center justify-center pt-2">
                <div
                    className="px-5 py-2 rounded-full bg-[#6D5BD0] shadow-[0_4px_0_#4E3FA3] text-white font-bold tracking-wide text-lg sm:text-xl"
                    style={{ fontFamily: "'Fredoka', sans-serif" }}
                >
                    Room {roomCode}
                </div>
            </div>

            {/* ── Selected word banner (shown above the canvas, like skribbl) ── */}


            {
                gameState === "drawing_phase" ? (
                    <div
                        className="selected-word-display w-full text-center py-2 px-3 bg-white rounded-xl shadow-md border-2 border-dashed border-[#6D5BD0]/50"
                    >
                        <span className="block text-[10px] uppercase tracking-[0.2em] text-gray-400 font-semibold">
                            Word to guess
                        </span>
                        <p
                            className="text-2xl text-[#6D5BD0] leading-tight"
                            style={{ fontFamily: "'Fredoka', sans-serif" }}
                        >
                            {/* _ &nbsp; _ &nbsp; _ &nbsp; _ &nbsp; _ */}
                            {getWordBlanks(selectedWord)}<sup>{selectedWord.replace(/\s/g, "").length}</sup>
                            
                        </p>
                    </div>
                ) : null
            }


            {/* <div
                className="selected-word-display w-full text-center py-2 px-3 bg-white rounded-xl shadow-md border-2 border-dashed border-[#6D5BD0]/50"
            >
                <span className="block text-[10px] uppercase tracking-[0.2em] text-gray-400 font-semibold">
                    Word to guess
                </span>
                <p
                    className="text-2xl text-[#6D5BD0] leading-tight"
                    style={{ fontFamily: "'Fredoka', sans-serif" }}
                >
                    _ &nbsp; _ &nbsp; _ &nbsp; _ &nbsp; _
                </p>
            </div> */}

            <div className="rounded-2xl overflow-hidden shadow-lg border-4 border-white">
                <DrawingArea roomCode={roomCode} isDrawer={isDrawer} gameState={gameState} />
            </div>

            <div className="w-3/4 flex gap-2">
                <Players roomCode={roomCode} />
                <div className="w-2/4 h-[100%] bg-white/70 p-2 rounded-xl shadow-sm border border-[#6D5BD0]/20 guess-history"></div>
            </div>

            {
                // If the user is not the drawer and the game state is "drawing_phase", show the input box for guessing the word. Since we do not want the drawer to be able to guess the word, we only show this input box to the guessers
                !isDrawer && gameState === "drawing_phase" ? (
                    <div className="w-3/4 flex gap-2">
                        <input
                            onChange={(e) => setGuessInput(e.target.value)}
                            type="text"
                            placeholder="Type your guess..."
                            className="flex-1 h-[38px] px-3 rounded-full bg-white shadow-sm border border-[#6D5BD0]/30 font-medium text-sm outline-none focus:border-[#6D5BD0]"
                        />
                        <button className="px-4 h-[38px] rounded-full bg-[#FF7A59] shadow-[0_3px_0_#C44F32] text-white font-bold text-sm active:translate-y-[2px] active:shadow-none transition-all"
                            onClick={enterGuessedWord}
                        >
                            Send
                        </button>
                    </div>
                ) : null
            }

            {/* <div className="w-3/4 flex gap-2">
                <input
                    type="text"
                    placeholder="Type your guess..."
                    className="flex-1 h-[38px] px-3 rounded-full bg-white shadow-sm border border-[#6D5BD0]/30 font-medium text-sm outline-none focus:border-[#6D5BD0]"
                />
                <button className="px-4 h-[38px] rounded-full bg-[#FF7A59] shadow-[0_3px_0_#C44F32] text-white font-bold text-sm active:translate-y-[2px] active:shadow-none transition-all">
                    Send
                </button>
            </div> */}

            {/* Only show the start button when the logged in user is the host of the room (i.e. the first player in the room)*/}
            {
                user && playerIds.length > 0 && user.uid === playerIds[0] && gameState === "waiting" ? (
                    <button
                        onClick={startGame}
                        className="px-6 h-[40px] rounded-full bg-[#4CAF7D] shadow-[0_3px_0_#2E7D53] text-white font-bold text-sm tracking-wide active:translate-y-[2px] active:shadow-none transition-all"
                    >
                        ▶️ Start Game
                    </button>
                ) : null
            }

            {
                gameState === "selection_phase" ? (
                    <WordSelectionScreen timer={wordSelectionTime} isDrawer={isDrawer} roomCode={roomCode} />
                ) : null
            }

            {
                gameState === "break" ? (
                    <div className="w-full py-2 rounded-full bg-[#72f857] shadow-[0_3px_0_#D9A017] flex items-center justify-center gap-2">
                        <span className="text-sm font-bold text-[#0a0a0a]">⏱ Waiting Time left:</span>
                        {/* Show the appropriate timer based on the game state */}
                        <span
                            className="text-lg font-bold text-[#0f0f0f]"
                            style={{ fontFamily: "'Fredoka', sans-serif" }}
                        >
                            {breakTime}s
                        </span>
                    </div>
                ) : null
            }

            {
                gameState === "drawing_phase" ? (
                    <div className="w-full py-2 rounded-full bg-[#FFC94A] shadow-[0_3px_0_#D9A017] flex items-center justify-center gap-2">
                        <span className="text-sm font-bold text-[#7A5A00]">⏱ Time left:</span>
                        {/* Show the appropriate timer based on the game state */}
                        <span
                            className="text-lg font-bold text-[#7A5A00]"
                            style={{ fontFamily: "'Fredoka', sans-serif" }}
                        >
                            {drawTime}s
                        </span>
                    </div>
                ) : null
            }

        </div>
    )
}