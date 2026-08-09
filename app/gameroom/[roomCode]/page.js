import ClientRoom from "@/Components/ClientRoomMod";
export default async function Page({ params }) {
    let roomId = await params;
    roomId = roomId.roomCode;
  
    return (
        <>
            <ClientRoom roomCode={roomId}/>
        </>
    )
}