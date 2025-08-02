"use client"

import { auth, db } from "@/lib/firebaseConfigs";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDocs, collection } from "firebase/firestore";
import { useEffect } from "react";


export default function ClientRoom({ roomCode }) {
 

    useEffect(() => {
        onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                console.log("User is signed in with", currentUser.uid)
                const querySnapshot = await getDocs(collection(db, "users"));
                querySnapshot.forEach((doc) => {
                    console.log(doc.data(), doc.id);
                })
            } else {
                console.log("User is not signed in, Please consider signing in")
            }
        })
    }, [])

    return (
        <div>
            <h1>Room Code : {roomCode}</h1>
        </div>
    )
}