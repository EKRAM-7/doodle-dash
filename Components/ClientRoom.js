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
    let [user, setUser] = useState(null);

    useEffect(() => {

        onAuthStateChanged(auth, (currentUser) => {
                    if (currentUser) {
                        setUser(currentUser);
                    }
        })

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


    function startGame() {
        console.log(user);
    }

    return (
        <div className="w-screen h-screen max-w-[400px] z-10 pr-2 pl-2 border-4 border-black gap-2 flex flex-col justify-center-safe items-center overflow-hidden">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white">Room Code : {roomCode}</h1>
            <DrawingArea roomCode={roomCode}/>
            <div className="w-3/4 flex"> 
                <Players roomCode={roomCode}/>
                <div className="w-2/4 h-[100%] bg-pink-400"></div>
            </div>
            <div className="w-3/4">
                <input type="text" className="w-3/4 h-[35px] p-[1rem] font-bold bg-white"/>
                <button className="w-1/4 h-[35px] bg-red-300 font-bold">Send</button>
            </div>

            {/* Only show the start button when the logged in user is the host of the room*/}
            {
                 user && playerIds.length > 0 && user.uid === playerIds[0] ? (
                    <button onClick={startGame}className="w-1/4 h-[35px] bg-green-500 text-white font-bold">▶️Start</button>
                ) : null
            }

        </div>
    )
}