import net from "net";
import { encode, decode } from "@msgpack/msgpack";

function pack(msg) {
  const body = encode(msg);
  const header = Buffer.alloc(4);
  header.writeUInt32BE(body.length, 0);
  return Buffer.concat([header, Buffer.from(body)]);
}

function createDecoder(onMessage) {
  let buffer = Buffer.alloc(0);

  return (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 4) {
      const len = buffer.readUInt32BE(0);
      if (buffer.length < 4 + len) return;

      const msgBuf = buffer.slice(4, 4 + len);
      buffer = buffer.slice(4 + len);

      onMessage(decode(msgBuf));
    }
  };
}

export async function createTCPServer({
  secret = "change_me",
  port = 6001,
  host = "0.0.0.0",
  handler
}) {

  return new Promise((resolve) => {


  const SECRET = secret;

  const server = net.createServer((socket) => {
    
    let authenticated = false;

    const send = (id, data) => {
      socket.write(pack([id, data]));
    };

    const onMessage = createDecoder(async (msg) => {
      const [id, packet] = msg;
      const [type, data] = packet || [];


      console.log(JSON.stringify({ts:Date.now(), t: "tcp recv",d:{data,type,id}}));
      try {
        if (type === "c") {

          


          if (data?.secret === SECRET) {
            authenticated = true;
      	    console.log(JSON.stringify({ts:Date.now(), t: "auth_success",d:{data}}));
            send(id, { ok: true });
          } else {
      	    console.log(JSON.stringify({ts:Date.now(), t: "auth_failed",d:{data}}));
            send(id, { ok: false, error: "auth failed" });
            socket.destroy();
          }
          return;
        }

        if (!authenticated) {
          send(id, { error: "not authenticated" });
          return;
        }


        const result = await handler?.({ type, data, socket });



        send(id, result ?? { error: "no handler result" });

      } catch (err) {
	console.error(err);
        send(id, { error: "server error" });
      }
    });

    socket.on("data", onMessage);
    socket.on("error", (e) => console.error("socket error", e));
  });

  server.listen(port, host, () => {
    console.log(`🚀 TCP server running at tcp://${host}:${port}`);
    console.log(`🔐 SECRET = ${SECRET}`);
    resolve(server);
  });

});
}
