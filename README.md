### Nyno (“Nine-oh”) is an open-source Linux workflow builder & executor without limits. Proudly build with [best.js](https://github.com/empowerd-cms/best.js) - a faster Next.JS alternative that uses Vite!

![Describe Image Here](/h/8d49d6961db4db78cec4ef61f897806f94dd34e2ff881d235f2886181f0233fc/screenshot-from-2025-10-13-13-50-39.webp)

### Video Demo
<video controls src="/h/e99f6d53ae7bbfba55e76fc69f940b61f6e9abf802e01c8e8334f6cf60b1c484/screencast-from-2025-10-13-14-49-10.mp4"></video>

### Install

Note: Nyno depends on Best.js which needs to be installed to run Nyno.

```
# install Best.js
git clone https://github.com/empowerd-cms/best.js
cd best.js
npm install
npm link
cd ../

# install Nyno
git clone https://github.com/empowerd-cms/nyno
cd nyno
bun install # or # npm install
bestjserver
```

![Describe Image Here](/h/a7e87aceeadc0133ca4ef143f52661acaf263717b813d9fd7a8a90eb8be9779e/screenshot-from-2025-10-13-13-49-19.webp)






## Use Simple YAML Text to Create Workflows with Linux Commands that Determine the Next Node:
- Nodes contain [simple YAML code](https://github.com/empowerd-cms/run-yaml-tool) to execute Linux commands. 
- Next Node flow: echo `"0" to execute the most left` node or `"1" to execute the next first node`.
- Need a new function? Add a new Linux command in `src/templates`.
- Define custom parameters using `${custom_paramter}` and send them as JSON via TCP (see example below).


![Describe Image Here](/h/c732dd6e28f3b3c0350c1de77bd438a172170541ec4a44d66fb7bf61ade89cde/screenshot-from-2025-10-13-14-02-28.webp)

![Describe Image Here](/h/a7a0046bdc8e7fccf6b9e0d0587c906333ea4f6e2795ef58add78b61c8f9b3dd/screenshot-from-2025-10-13-14-02-18.webp)

## Execute Workflows JSON files using TCP + Authentication for Most Speed & Security
Workflow JSON files in the `src/tcp/routes` will be automatically loaded and available via TCP. `You need to restart the server after adding workflows.`

For most testing/executing ease, we also released [tcpman](https://github.com/empowerd-cms/tcpman):
```
tcpman localhost:6001/test1 'c{"apiKey":"changeme"}' 'q{"i":1}'
```

--- 

Nyno TCP docs:
- Use `c{"apiKey":"changeme"}` to connect
- Use `q{"i":"0","other_param":"user1","path":"/test1"}` to execute workflow routes and use ${other_param} specified in the YAML Text.



---

#### Example flow result with {"i":1}
```
tcpman localhost:6001/test_nyno 'c{"apiKey":"changeme"}' 'q{"i":1}'
```
![Describe Image Here](/h/af41f2a6da5722183814b41815b6df613b4de79da642cca133cbe0138763a723/screenshot-from-2025-10-13-14-02-55.webp)


#### Example flow result with {"i":0}
```
tcpman localhost:6001/test_nyno 'c{"apiKey":"changeme"}' 'q{"i":0}'
```
![Describe Image Here](/h/87c2c66358bdeb2a7b471750d7a8c5971dec5ed3e62e370147490cd6ba06e866/screenshot-from-2025-10-13-14-03-40.webp)

---


#### Proudly build as first project to test [best.js](https://github.com/empowerd-cms/best.js) 
