import ClientRoom from "@/Components/ClientRoom";

export default async function Page({ params }) {
    let roomId = await params;
    roomId = roomId.roomCode;
  
    return (
        <ClientRoom roomCode={roomId}/>
    )
}