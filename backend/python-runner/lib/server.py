import asyncio
import struct
import msgpack

#from lib.client_logger import log, close

def pack(msg: object) -> bytes:
    body = msgpack.packb(msg, use_bin_type=True)
    header = struct.pack(">I", len(body))
    return header + body


def unpack_frame(buffer: bytearray):
    """
    Generator that yields complete messages from a byte buffer.
    Returns (messages, remaining_buffer)
    """
    messages = []

    while len(buffer) >= 4:
        (length,) = struct.unpack(">I", buffer[:4])

        if len(buffer) < 4 + length:
            break

        msg_buf = buffer[4:4 + length]
        buffer = buffer[4 + length:]

        msg = msgpack.unpackb(msg_buf, raw=False)
        messages.append(msg)

    return messages, buffer


class TCPServer:
    def __init__(self, host="localhost", port=6001, secret="change_me", handler=None):
        self.host = host
        self.port = port
        self.secret = secret
        self.handler = handler

    async def start(self):
        server = await asyncio.start_server(
            self._handle_client,
            self.host,
            self.port
        )

        port = self.port
        #if port != 9955:
        #    await log({"src": f"[{port}]", "status": "initiating"})

        print(f"🚀 TCP server running at tcp://{self.host}:{self.port}")
        print(f"🔐 SECRET = {self.secret}")

        async with server:
            await server.serve_forever()

    async def _handle_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        authenticated = False
        buffer = bytearray()

        def send(msg_id, data):
            writer.write(pack([msg_id, data]))

        try:
            while True:
                chunk = await reader.read(4096)
                if not chunk:
                    break

                buffer.extend(chunk)

                messages, buffer = unpack_frame(buffer)

                for msg_id, packet in messages:
                    if not packet:
                        continue

                    msg_type, data = packet

                    # ---------------- AUTH ----------------
                    if msg_type == "c":
                        # await log({"src": f"[{port}]", "key": "beforeAuth"})

                        if data.get("secret") == self.secret:
                            print("[Python Runner] AUTH OK")

                            authenticated = True
                            send(msg_id, {"ok": True})
                        else:
                            print("[Python Runner] BAD AUTH")
                            send(msg_id, {"ok": False, "error": "auth failed"})
                            writer.close()
                            await writer.wait_closed()
                            return
                        continue

                    if not authenticated:
                        send(msg_id, {"error": "not authenticated"})
                        continue

                    # ---------------- HANDLER ----------------
                    try:
                        #if port != 9955:
                            # await log({"src": f"[{port}]", "key": "beforeHandler"})

                        if self.handler:
                            result = await self.handler(
                                type=msg_type,
                                data=data,
                                socket=writer
                            )
                        else:
                            result = {"error": "no handler result"}

                        send(msg_id, result)

                    except Exception:
                        send(msg_id, {"error": "server error"})

        except Exception:
            writer.close()
            await writer.wait_closed()
