"use client"

import { rtdb } from "@/lib/firebaseConfigs";
import { ref, set } from "firebase/database";

import { useEffect, useState } from "react";
import WordSelection from "./WordSelection"; //Importing the function (not a component)


export default function WordSelectionScreen({ timer, isDrawer, roomCode }) {

    const [wordChoices, setWordChoices] = useState([]);
    
    useEffect(() => {
        async function fetchWords() {
            let words = await WordSelection();
            setWordChoices(words);
            let randomWord = words[Math.floor(Math.random() * 3)]
            await set(ref(rtdb, `room/${roomCode}/selectedWord`), randomWord);
        }
        fetchWords();
    }, [])


    // This function lets the user choose a word and update the selected word in the database and also immediately starts the drawing phase after that
    async function selectWord(word) {
        // Send the selected word to the database
        await set(ref(rtdb, `room/${roomCode}/selectedWord`), word);
        await set(ref(rtdb, `room/${roomCode}/gameState`), "drawing_phase");
        await set(ref(rtdb, `room/${roomCode}/phaseStartedAt`), Date.now());
        
    }

    return (
        <div className="fixed inset-0 min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-4">

            {/* Words displayed horizontally in the center */}

            {
                isDrawer ? (
                    <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mb-16">
                        {wordChoices.map((word, index) => (
                            <span
                                key={index}
                                className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white opacity-90 border-4 border-white/20 rounded-lg px-6 py-3 bg-gradient-to-br from-yellow-400 to-yellow-600 transform transition-transform duration-300 hover:scale-105 cursor-pointer select-none"
                                onClick={() => selectWord(word)}
                            >
                                {word}
                            </span>
                        ))}
                    </div>
                ) : null
            }

            {/* <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mb-16">
                {wordChoices.map((word, index) => (
                    <span
                        key={index}
                        className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white opacity-90 border-4 border-white/20 rounded-lg px-6 py-3 bg-gradient-to-br from-yellow-400 to-yellow-600 transform transition-transform duration-300 hover:scale-105 cursor-pointer select-none"
                    >
                        {word}
                    </span>
                ))}
            </div> */}

            {/* Timer */}
            <div className="flex flex-col items-center gap-2">
                <p className="text-slate-400 text-sm uppercase tracking-widest">Elapsed Time</p>
                <div className="bg-white/10 border border-white/20 rounded-2xl px-8 py-4 backdrop-blur-sm">
                    <span className="text-5xl sm:text-6xl font-mono font-semibold text-white tabular-nums">
                        {String(Math.floor(timer / 60)).padStart(2, "0")}:
                        {String(timer % 60).padStart(2, "0")}
                    </span>
                </div>
            </div>

        </div>
    );
} 