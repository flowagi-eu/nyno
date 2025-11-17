# Image Editor Command for Nyno 🎨

![/h/3e5d6e78fe582f663a6d0b758693d7d4f103005eca94e05eeaad8bc031881e7d/nyno-openai-image.webp](/h/3e5d6e78fe582f663a6d0b758693d7d4f103005eca94e05eeaad8bc031881e7d/nyno-openai-image.webp)

The first [Nyno](https://github.com/empowerd-cms/nyno) workflow command:  **Edit Images with YAML**.
It integrates directly into Nyno’s workflow and allows you to edit images via **YAML workflow nodes** or remotely via **TCP execution**.

---

## 📝 YAML Usage in Nyno Workflows

Add this command to your Nyno workflow YAML:

```yaml
nyno-openai-image-edit:
  args:
    - "${apiKey}"
    - "${imagePath}"
    - "${prompt}"
```

* `${apiKey}` → Your OpenAI API key
* `${imagePath}` → Path to the image you want to edit
* `${prompt}` → Description of the desired edit

![/h/a430a14b77eb61eff79e6b3edf41decdfb160158c2612efdb3b0ab965f13574a/screenshot-from-2025-10-14-20-32-45.webp](/h/a430a14b77eb61eff79e6b3edf41decdfb160158c2612efdb3b0ab965f13574a/screenshot-from-2025-10-14-20-32-45.webp)

---

🚀 Install & Link Locally

```
git clone https://github.com/empowerd-cms/nyno-image-editor
cd nyno-image-editor
npm link # this makes the 'nyno-image-editor' command available
```

## ⚡ Execute via TCP (`tcpman`)

You can also run the Nyno workflow with the example YAML using **TCP/tcpman**:

```bash
tcpman localhost:6001/test_ai \
  'c{"apiKey":"changeme"}' \
  'q{"imagePath":"/home/user/Pictures/nyno-logo2.png","prompt":"Make it a bit prettier and look high tech my logo","apiKey":"sk-..."}'
```

* `c{...}` → Connection/authentication parameters
* `q{...}` → Query/execution parameters corresponding to YAML arguments
* Replace `/home/user/Pictures/nyno-logo2.png` with your image path
* Replace `sk-...` with your OpenAI API key

### By default the edited images are stored in the nyno /output folder.


