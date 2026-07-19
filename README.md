#### Nyno helps people build better  AI Frontend apps, exclusively with EU-AI without having to write backend code.

Nyno for EU-AI Developers
### Easily Create and Test EU-AI APIs for Your Frontends.

![Describe Image Here](/h/200983605e3209d338f5c4622118191b4ffc780bbb0ff9a66299c791d1cd4c61/screenshot-from-2026-07-12-21-58-39.webp)


- Nyno let's you build AI APIs in a **visual workflow builder**.
- The only thing you need is **a frontend** and a **frontend fetch call**.
- Nyno is **100% Commercial Free, and European**, meaning all building blocks connect to **European AI (Mistral AI), other European Partners or code you own**.

---


## Get Started
You can use Nyno locally without sign-up or you can get early access to the online version via [https://nyno.dev](https://nyno.dev) (it's the first form). 



#### Install via Docker/Podman
If you're on Debian/Ubuntu Linux you can easily install podman via `sudo apt install podman -y` and replace `docker` with `podman` in the command below:
```
mkdir -p workflows-enabled; 
docker run -it -p 9057:9057 -v ./workflows-enabled:/app/workflows-enabled flowagi/nyno
```
Link to DockerHub: [https://nyno.dev](https://nyno.dev)

#### Or use The Online Platform
[https://nyno.dev](https://nyno.dev) (enter your e-mail in the first form to get early access)

---


### Build your first EU-AI API

**[!] API KEY**: [The online platform](https://nyno.dev) already has it's own `MISTRAL_API_KEY`. If you're using Nyno locally you'll need to get your own `MISTRAL_API_KEY` from [https://console.mistral.ai](https://console.mistral.ai).

Here's how to create your API via Nyno: 
- Open the visual workflow editor at [http://localhost:9057](http://localhost:9057)
- Inside the ai-mistral- node, copy your `MISTRAL_API_KEY`, and press the "Run Workflow" button to test your workflow.
- Save your workflow as a file by pressing the "Export" button.
- Put your workflow file (`flow.nyno`) inside the '`workflows-enabled`' folder.
- Now you can call your workflow as API (see further details below).

### Calling your workflow as API

The simplest way to now call your Nyno workflow is via:

```
curl -X POST http://localhost:9057/api/v1/flows/flow.nyno \
  -H "Content-Type: application/json" \
  -d '{"prev":"Hello, world!"}'
```

This will return an object as JSON with the whole input/output flow of every step:

```
{
   "status": "ok",
   "execution:": [{
      "id": "node-1":
      "input": {
         "args": [..],
         "context": {..},
      },
      "output: {
         "r": 0,
         "c": {..}
      }
    }]
}
```

---

In your frontend you will often only need the last variables from execution[last].output.c:

---


```
{
   "prev": "(ai generated message)"
}
```

---




### Need more help? 



#### Community
- [Join us at Reddit /r/Nyno](https://reddit.com/r/Nyno)
- Via E-mail: Send Nyno's creator ("MJ") an e-mail directly via (2 letters)@nyno.dev

#### Documentation:
- [https://developers.nyno.dev/](https://developers.nyno.dev/)

