"use client"

import { auth, db, rtdb } from "@/lib/firebaseConfigs";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get, set, onValue } from "firebase/database";
import { doc, getDocs, collection, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";


export default function Players({ roomCode }) {


    let [playerIds, setPlayerIds] = useState([]);
    let [playerNames, setPlayerNames] = useState([]);
    useEffect(() => {
        const playersRef = ref(rtdb, `room/${roomCode}/players`);
        onValue(playersRef, async (snapshot) => {
            fetchPlayers();
        })

        async function fetchPlayers() {
            let playerNames = [];
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

    return (
        <div className="bg-cyan-300 w-2/4 p-2 rounded-md">
            {/* <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">Players</h1> */}
            <h1 className="text-[1.5rem] font-bold">Players</h1>
            <ul>
                {
                    playerNames.map((playerName, i) => (
                        <li key={i}>
                            {playerName}
                        </li>
                    ))
                }
                {/* <li>Player 1</li>
                <li>Player 2</li>
                <li>Player 3</li>
                <li>Player 4</li>
                <li>Player 5</li>
                <li>Player 6</li>
                <li>Player 7</li>
                <li>Player 8</li>  */}  
            </ul>
        </div>
    )
}