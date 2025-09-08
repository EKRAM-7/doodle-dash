"use client"

import { auth, db, rtdb } from "@/lib/firebaseConfigs";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get, set, onValue } from "firebase/database";
import { doc, getDocs, collection, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

import Players from "./Players";
import DrawingArea from "./DrawingArea";


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
            let idArray = snapshot.val(); 
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
        <div className="w-screen h-screen">
            <DrawingArea roomCode={roomCode}/>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">Room Code : {roomCode}</h1>
            <Players roomCode={roomCode}/>
        </div>
    )
}