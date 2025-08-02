"use client"

import { onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth";
import { db, auth, rtdb } from "@/lib/firebaseConfigs";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react"
import { setDoc, doc } from "firebase/firestore";
import { set, ref, get } from "firebase/database";


export default function Home() {
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
			<p>
				Please Wait... 😉{":)"}
			</p>
		)
	}

	async function createRoom() {
		let roomCode = Math.floor(Math.random() * 10000).toString();
		if (roomCode.length === 1) roomCode = "000" + roomCode;
		else if (roomCode.length === 2) roomCode = "00" + roomCode;
		else if (roomCode.length === 3) roomCode = "0" + roomCode;

		await set(ref(rtdb, `room/${roomCode}`), {
			gameState: 'not-started',
			players: [user.uid]
		})

		router.push(`/gameroom/${roomCode}`)

	}

	async function joinRoom(code) {
		const playersRef = ref(rtdb, `room/${code}/players`);
		const snapshot = await get(playersRef);
		let currentPlayers = snapshot.val();

		currentPlayers.push(user.uid);
		await set(playersRef, currentPlayers);
		// console.log(snapshot.val()[0]);

	}

	return (
		<div className="bg-amber-100 text-black">
			{
				user ? (
					<div>

						<button className="bg-yellow-300" onClick={() => createRoom()}>Create Room</button> <br />
						<hr />
						<input type="text" placeholder="Enter room code" onChange={(e) => setJoinRoomCode(e.target.value)} />
						<button onClick={() => joinRoom(joinRoomCode)}>Join a room</button> <br />
						<button onClick={() => {
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