import asyncio
from lib.client import TCPClientCore

_client = None
_lock = asyncio.Lock()


async def _get_client():
    global _client

    if _client is None:
        async with _lock:  # prevent race conditions
            if _client is None:  # double-check inside lock
                _client = await TCPClientCore(
                    host="localhost",
                    port=9955,
                    secret="change_me"
                ).connect()
    return _client


async def log(data):
    client = await _get_client()
    if not client:
        return False

    try:
        await client.request(data)
        return True
    except Exception as err:
        print(err)
        return False


async def close():
    global _client
    if _client:
        await _client.close()
        _client = None