from fastapi import WebSocket


class ConnectionManager:

    def __init__(self):

        self.active_connections = {}


    async def connect(
        self,
        user_id: int,
        websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket


    def disconnect(
        self,
        user_id: int):

        self.active_connections.pop(
            user_id,
            None
        )


    async def send_private_message(
    self,
    sender_websocket: WebSocket,
    receiver_id: int,

    message: str):
        receiver_websocket = self.active_connections.get(receiver_id)
        if receiver_websocket:
            await receiver_websocket.send_text(message)
        else:
            await sender_websocket.send_text("User is offline")


manager = ConnectionManager()