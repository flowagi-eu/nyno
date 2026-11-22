import asyncio
import struct
import msgpack


def pack(msg: object) -> bytes:
    body = msgpack.packb(msg, use_bin_type=True)
    header = struct.pack(">I", len(body))
    return header + body


class TCPClientCore:
    def __init__(self, host, port, secret):
        self.host = host
        self.port = port
        self.secret = secret

        self.reader = None
        self.writer = None

        self.pending = {}
        self.id_counter = 1
        self.closed = False

        self._task = None

    async def connect(self):
        self.reader, self.writer = await asyncio.open_connection(
            self.host, self.port
        )

        self._task = asyncio.create_task(self._read_loop())

        # handshake (type 'c')
        await self.request({"secret": self.secret}, msg_type="c")

        return self

    async def _read_loop(self):
        try:
            while True:
                header = await self.reader.readexactly(4)
                (length,) = struct.unpack(">I", header)

                body = await self.reader.readexactly(length)
                msg = msgpack.unpackb(body, raw=False)

                msg_id, data = msg

                fut = self.pending.pop(msg_id, None)
                if fut:
                    fut.set_result(data)

        except Exception as e:
            self._fail_all(e)

    def _fail_all(self, err):
        if self.closed:
            return

        self.closed = True

        for fut in self.pending.values():
            if not fut.done():
                fut.set_exception(err)

        self.pending.clear()

    async def request(self, data, msg_type="q"):
        if self.closed:
            raise RuntimeError("TCP client is closed")

        msg_id = self.id_counter
        self.id_counter += 1

        self.writer.write(pack([msg_id, [msg_type, data]]))
        await self.writer.drain()

        loop = asyncio.get_running_loop()
        fut = loop.create_future()
        self.pending[msg_id] = fut

        return await fut

    async def close(self):
        self._fail_all(RuntimeError("TCP client closed"))

        if self.writer:
            self.writer.close()
            await self.writer.wait_closed()

        if self._task:
            self._task.cancel()
