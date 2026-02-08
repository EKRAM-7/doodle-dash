"use client"

import { onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth";
import { db, auth, rtdb } from "@/lib/firebaseConfigs";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react"
import { setDoc, doc } from "firebase/firestore";
import { set, ref, get } from "firebase/database";

import { Loader } from "@/Components/Loader";

export default function Home() {
	const [actionLoading, setActionLoading] = useState(false);
	let [userName, setUsername] = useState("");
	let [user, setUser] = useState(null);
	let [loading, setLoading] = useState(true);
	let [joinRoomCode, setJoinRoomCode] = useState("");

	const router = useRouter();

	async function createUser(userName) {
		await signInAnonymously(auth);

		onAuthStateChanged(auth, (currentUser) => {
			if (currentUser) {
				setDoc(doc(db, "users", currentUser.uid), {
					username: userName
				})
			}
		})


		console.log("Successfully signed in with")
	}

	useEffect(() => {
		onAuthStateChanged(auth, (currentUser) => {
			if (currentUser) {
				console.log("User is signed in with", currentUser.uid)
				setUser(currentUser)

			} else {
				console.log("User is not signed in, Please consider signing in")
			}
			setLoading(false);
		})
	}, [])

	if (loading) {
		return (
			<Loader />
		)
	}

	async function createRoom() {
		setActionLoading(true);
		let roomCode = Math.floor(Math.random() * 10000).toString();
		if (roomCode.length === 1) roomCode = "000" + roomCode;
		else if (roomCode.length === 2) roomCode = "00" + roomCode;
		else if (roomCode.length === 3) roomCode = "0" + roomCode;

		set(ref(rtdb, `room/${roomCode}`), {
			gameState: 'not-started',
			players: [user.uid],
			drawingLines: []
		})

		router.push(`/gameroom/${roomCode}`);

	}

	async function joinRoom(code) {
		setActionLoading(true);
		const playersRef = ref(rtdb, `room/${code}/players`);
		const snapshot = await get(playersRef);
		let currentPlayers = snapshot.val();

		currentPlayers.push(user.uid);
		set(playersRef, currentPlayers);
		router.push(`/gameroom/${code}`)
	}

	if (actionLoading) {
		return (
			<Loader />
		)
	}


	return (
		<div className="text-black border-2 border-black p-10 rounded-lg z-10">
			{
				user ? (
					<div className="flex justify-center items-center flex-col gap-4">

						<button className="bg-yellow-300 border-2 border-black p-4 rounded-lg" onClick={() => createRoom()}>Create Room</button> 

						

						<input type="number" placeholder="Enter room code" onChange={(e) => setJoinRoomCode(e.target.value)} 
						className="border-2 border-black rounded-lg p-2 box-border text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl h-10 bg-white text-black"
						/>

						<button className="bg-cyan-200 border-2 border-black rounded-lg p-4 box-border" onClick={() => joinRoom(joinRoomCode)}>JOIN</button> 
						
						

						<button className="bg-red-400 text-white border-2 border-black rounded-lg p-4 box-border"
						onClick={() => {
							signOut(auth);
							setUser(null);
						}}>Sign out</button>

					</div>
				) : (
					<div>
						<input type="text" placeholder="enter username" value={userName} onChange={(e) => setUsername(e.target.value)} />
						<button onClick={() => createUser(userName)}>Create</button>
					</div>
				)
			}
		</div>

	)
}