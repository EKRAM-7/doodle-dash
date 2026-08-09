"use client"

import { auth, db, rtdb } from "@/lib/firebaseConfigs";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get, set, onValue } from "firebase/database";
import { doc, getDocs, collection, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

import Players from "./Players";
import DrawingArea from "./DrawingAreaMod";
import WordSelection from "./WordSelection";
import WordSelectionScreen from "./WordSelectionScreen";

export default function ClientRoom({ roomCode }) {

    let [playerIds, setPlayerIds] = useState([]);
    let [playerNames, setPlayerNames] = useState([]);
    let [user, setUser] = useState(null);
    let [drawTime, setDrawTime] = useState(10);
    let [wordSelectionTime, setWordSelectionTime] = useState(10);
    let [wordList, setWordList] = useState([]);
    let [gameState, setGameState] = useState("waiting");


    useEffect(() => {
        onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            }
        })
        const gameStateRef = ref(rtdb, `room/${roomCode}/gameState`);
        set(ref(rtdb, `room/${roomCode}/gameState`), "waiting");
        onValue(gameStateRef, (snapshot) => {
            setGameState(snapshot.val());
            /* if (snapshot.val() === "selection_phase") {
                startGameTimer();
            } */
        })

        const playersRef = ref(rtdb, `room/${roomCode}/players`);
        onValue(playersRef, async (snapshot) => {
            fetchPlayers();
        })

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

    // This useEffect will run whenever the drawTime changes. If the drawTime is 0, it will set the gameState to "selection_phase" and update whoseTurn in the database.
    useEffect(() => {
        async function updateWhoseTurn() {
            let whoseTurnRef = ref(rtdb, `room/${roomCode}/whoseTurn`);
            let currentWhoseTurnSnapshot = await get(whoseTurnRef);
            if (currentWhoseTurnSnapshot.val() === playerIds.length - 1) {
                await set(whoseTurnRef, 0);
            } else {
                await set(whoseTurnRef, currentWhoseTurnSnapshot.val() + 1);
            }
            
        }
        if (drawTime === 0) {
            setGameState("selection_phase");
            setDrawTime(10);
            setWordSelectionTime(10);  
            updateWhoseTurn();
        } 
    }, [drawTime])

    // This useEffect will run whenever the gameState changes. If the gameState is "selection_phase", it will start a timer for the word selection phase. If the gameState is "drawing_phase", it will start a timer for the drawing phase.
    useEffect(() => {
        if (gameState === "selection_phase") {
            const wordSelectionInterval = setInterval(() => {
                setWordSelectionTime((prev) => {
                    if (prev === 0) {
                        clearInterval(wordSelectionInterval);
                        setGameState("drawing_phase");
                        set(ref(rtdb, `room/${roomCode}/gameState`), "drawing_phase"); // Update the gameState in the database to "drawing_phase" when the word selection timer runs out
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(wordSelectionInterval);
        }
        if (gameState === "drawing_phase") {
            const drawTimeInterval = setInterval(() => {
                setDrawTime((prev) => {
                    if (prev === 0) {
                        clearInterval(drawTimeInterval);
                        return 0;
                    }
                    return prev - 1;
                })
            }, 1000);

            

            return () => {
                clearInterval(drawTimeInterval);
                setGameState("selection_phase");
            }
        }
        
    }, [gameState])


    // Once the host clicks the start button, update the gameState in the database to "started" and set whoseTurn to the first player's id. Also start the game timer.
    async function startGame() {
        let gameStateRef = ref(rtdb, `room/${roomCode}/gameState`);
        await set(gameStateRef, "selection_phase");
        // await set(ref(rtdb, `room/${roomCode}/whoseTurn`), playerIds[0]);
        // await set(ref(rtdb, `room/${roomCode}/whoseTurn`), 0);
        setGameState("selection_phase");
        
    }
    
    /* This function will be called when the game starts. It will start two timers
        1. wordSelectionTime: This timer will count down from 10 seconds. During this time, the player whose turn it is will select a word to draw.
        2. drawTime: This timer will count down from 60 seconds. During this time, the player whose turn it is will draw the selected word while the other players try to guess it.
    */

    return (
        <div className="w-screen h-screen max-w-[400px] z-10 pr-2 pl-2 border-4 border-black gap-2 flex flex-col justify-center-safe items-center overflow-hidden">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white">Room Code : {roomCode}</h1>
            <DrawingArea roomCode={roomCode} />
            <div className="w-3/4 flex">
                <Players roomCode={roomCode} />
                <div className="w-2/4 h-[100%] bg-pink-400 p-2 rounded-md"></div>
            </div>
            <div className="w-3/4">
                <input type="text" className="w-3/4 h-[35px] p-[1rem] font-bold bg-white" />
                <button className="w-1/4 h-[35px] bg-red-300 font-bold">Send</button>
            </div>

            {/* Only show the start button when the logged in user is the host of the room (i.e. the first player in the room)*/}
            {
                user && playerIds.length > 0 && user.uid === playerIds[0] ? (
                    <button onClick={startGame} className="w-1/4 h-[35px] bg-green-500 text-white font-bold">▶️Start</button>
                ) : null
            }

            {
                gameState === "selection_phase" ? (
                    // <div className="w-full h-[50px] bg-yellow-300 flex items-center justify-center rounded-md">
                    //     <h1 className="text-xl font-bold">Select a word to draw! Time left: {wordSelectionTime}</h1>
                        
                    // </div>
                    <WordSelectionScreen timer={wordSelectionTime} />
                    // ## Task for later: LOAD A COMPONENT HERE THAT DISPLAYS THE WORD CHOICES AND ALLOWS THE PLAYER TO SELECT ONE. PASS THE wordList STATE VARIABLE AS A PROP TO THAT COMPONENT
                ) : null
            }

            {
                gameState === "drawing_phase" ? (
                    <div className="w-full h-[50px] bg-green-400 flex items-center justify-center rounded-md">
                        <h1 className="text-xl font-bold">Select a word to draw! Time left: {drawTime}</h1>
                        
                    </div>
                ) : null
            }
            
        </div>
    )
}