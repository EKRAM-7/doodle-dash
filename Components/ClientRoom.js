"use client"

import { auth, db, rtdb } from "@/lib/firebaseConfigs";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get, set, onValue } from "firebase/database";
import { doc, getDocs, collection, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";


export default function ClientRoom({ roomCode }) {

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
            let idArray = snapshot.val(); //O
            let playerNamesArray = [];
            for(let id of idArray) {
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
        <div>
            <h1>Players</h1>
            <ul>
                {
                    playerNames.map((playerName, i) => (
                        <li key={i}>
                            {playerName}
                        </li>
                    ))
                }
            </ul>
            <h1>Room Code : {roomCode}</h1>
        </div>
    )
}