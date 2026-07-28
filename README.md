![Describe Image Here](/h/6851a848432761a8c1eeb73e3b4236d4034fed027817fd80507e5918a318a8d9/screenshot-from-2026-07-28-17-56-33.webp)

## Overspending on EU-AI or want to prevent wasting weeks of valuable time on backends?
- 💙 What if you **didn't have to worry about the backend** at all?
- 🩵 What if there was a better and simpler **EU-AI core "language"**?
- 🇪🇺 What if you didn't have to worry so much about **sovereignty, licensing, GDPR or not "buying from Europe"**, because all our workflows nodes are actually local or European, and our license is 100% commercial API friendly & open-source?

## Overspending on EU-AI projects starts with one innocent decision: Your EU-AI Core Language

![Describe Image Here](/h/7ab1db81ddc371aa897a7e35e5eaa0a03c18b5700c55e5cdea494d413fe75a21/screenshot-from-2026-07-28-17-59-58.webp)


#### Should you start a new project from scratch, with Python? Or even with a framework? 

Well, you could, but most 
Python frameworks make workflows harder to change later.

#### Should you use an agentic harness? 

Well you could, but agentic harnesses make workflows harder to control + more expensive to run.

The overall result is the same for both paths: **Loss of control over your AI usage.**

---

#### "Simplicity is  the ultimate sophistication"
So what if you kept your AI workflows simple, for example **using a special yet simple language**?

What if simplicity indeed is truly "the ultimate sophistication"?

What if simplicity indeed leads you to waste less tokens, time and money?

---



## Quick Comparison: Coding EU-AI backends from scratch VS Nyno

![Describe Image Here](/h/d06932498e842d7bc1ba61a13a980ae8c5b2131a3a02b86f324c29d16e3be6af/image1-0.webp)
### Python backend (100+ lines of code):
```py
# lots of imports
import fastapi
import json
import bcrypt
# import .. 
# its keeps going 😭

# actual business logic
## db
## auth
## crypto
## envs
## api configuration
## api routes

## your first workflow
## (even more configuration 😭) 
```

---
![Describe Image Here](/h/85d57277360e683e0f3d3ad3f67365d3ee15342e5a95a2fdee2b7c85a60c88b1/image11.webp)


### Nyno (<10 lines):

You can **ONE-SHOT AI with 3 lines**:

```nyno
workflow:
  - step: ai-mistral-text
    args: ['your prompt']
```

Or use past chat history as well:
```nyno
context:
  MISTRAL_MESSAGES: [..] # past messages
workflow:
  - step: ai-mistral-text
    args: ['your prompt']
```

Or even past history with  more steps:
```nyno
context:
  MISTRAL_MESSAGES: [..] # past messages
workflow:
  - step: ai-mistral-text
    args: ['your prompt']
workflow:
  - step: ..
```


---




---


![Describe Image Here](/h/b2f69c0a8ceb9ba107a1090ea6ef7540f0c84a8b2db482a5e8567bbf3ec267f8/recsts12.webp)


## **Nyno: Build Your First EU-AI Workflow < 20min**

Install and Start Nyno:

```bash
mkdir -p ~/nyno/{pgdata,workflows-enabled}

docker run -d \
  -p 9057:9057 \
  -v ~/nyno/pgdata:/nyno/pgdata \
  -v ~/nyno/workflows-enabled:/nyno/workflows-enabled \
  flowagi/nyno
```

(On Windows or Mac? See our Docker Desktop install guide or request early access for the platform):


1. **Get your Mistral API key**: [https://console.mistral.ai](https://console.mistral.ai).

2. **Open Nyno** [http://localhost:9057](http://localhost:9057).

![Describe Image Here](/h/7b946aad00540d27d97c8c85dc03dd469f2e8cceee2c3ddb916bc705b4445e2d/screenshot-from-2026-07-28-18-32-02.webp)


3. **Build and test** your workflow using **Run Workflow**.
4. **Export** it as a `.nyno` file.

---

![Describe Image Here](/h/b2fd4e546cf8d00ceb807a56d305862bc2827446078ce0ec8e5f9b321b8fae7e/rect25.webp)


## **3 Steps to Connect Nyno to Your Frontend**

Build secure EU-AI applications without writing (and constantly rewriting) backend code.

1. **Enable your workflow** by copying the `.nyno` file into the `workflows-enabled` folder.


```bash
cp ~/Downloads/flow.nyno ~/nyno/workflows-enabled/
```

Please note for EU-AI: you will need to add your MISTRAL_API_KEY context variable to the file like:
```
context:
  MISTRAL_API_KEY: "Your-Key"
workflow:
  - step: ...
```

---



2. **Create a workflow user** with a single backend call.

```bash
curl -X POST "http://localhost:9057/api/v1/users" -H "Authorization: change_me" -d "{\"email\":\"john@example.com\",\"password\":\"my-secure-password\"}"
```

---


3. **Call your workflow** from the frontend.

```js
fetch("http://localhost:9057/api/v1/flow.nyno", {
  method: "POST",
  headers: {
    Authorization: "Basic " + btoa("john@example.com:my-secure-password")
  },
  body: JSON.stringify({
    prev: "Hello, can you summarize this text?"
  })
})
  .then(r => r.json())
  .then(console.log);
```

---

Security note: "API_" keys are automatically masked  \*\*\*\*. Just make sure to **[!] change the default `change_me` secret** in `envs/ports.conf` when you're deploying to prevent arbitrary workflow execution and account creation.

---

## For More Nyno + EU-AI Communities 
- [You can find us on Reddit /r/Nyno](https://reddit.com/r/Nyno)
- [Main Site/Docs/Platform Early Access: https://nyno.dev](https://nyno.dev)
- Email Nyno's creator "MJ" at (first 2 letters)@nyno.dev
- Latest EU-AI news: [/r/euainews](https://reddit.com/r/euainews)

[spacing value='6rem']



