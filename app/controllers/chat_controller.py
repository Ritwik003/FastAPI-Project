from fastapi import (

    APIRouter,

    WebSocket,

    WebSocketDisconnect,

    Query

)

from jose import jwt, JWTError

from app.websocket.connection_manager import (
    manager
)

from app.auth.jwt_handler import (

    SECRET_KEY,

    ALGORITHM

)

chat_routes = APIRouter(

    prefix="/ws"

)


@chat_routes.websocket("/chat")

async def websocket_chat(

    websocket: WebSocket,

    token: str = Query(...)

):

    try:

        payload = jwt.decode(

            token,

            SECRET_KEY,

            algorithms=[ALGORITHM]

        )

        user_id = payload.get("user_id")

        if user_id is None:

            await websocket.close()

            return

    except JWTError:

        await websocket.close()

        return

    await manager.connect(

        user_id,

        websocket

    )

    try:

        while True:

            data = await websocket.receive_json()

            receiver_id = data["receiver_id"]

            message = data["message"]

            await manager.send_private_message(

                websocket,

                receiver_id,

                f"User {user_id}: {message}"

            )

    except WebSocketDisconnect:

        manager.disconnect(user_id)