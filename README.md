![Nyno Workflow Example](/h/3fec8199e52b6983079d4800694475a7c660ab26c1f0a831e16050dc340f24ec/screenshot-from-2026-01-12-00-04-09.webp)


> Founder Note: "Unlike with n8n, you and your clients never have to request a commercial license to run Nyno workflows. This was the main reason I started building Nyno." – MJ

![Nyno examples connecting multiple AI nodes](/h/c0f8c2c19f52c63ba139a25e5fa5fbc80a36a865c1368534bac204c3fc3d683f/screenshot-from-2026-01-12-13-26-24.webp)

---


## Nyno 5.2: Open-Source Workflow Engines for AI, Advanced Intelligence & Beyond. Extend with Python, PHP, JS and Ruby.  Runs in the Browser.
- Try the Online Playground: [https://nyno.dev/online-playground](https://nyno.dev/online-playground)
- Stay Up-to-Date: Join our Reddit community at [/r/Nyno](https://www.reddit.com/r/Nyno)


---



### 🧠 Create New Workflow Steps in  languages you love.
### 🔗 Connect everything with plain YAML text (.nyno).

Nyno is an **open-source multi-language workflow engine** and [language](https://github.com/empowerd-cms/nyno-lang) that lets you build, extend, and connect automation in the languages you already know — **Python, PHP, JavaScript, and Ruby**.


Each programming language runs in its own **high-performance worker engine**. Command-steps can be called in short human-readable **YAML Workflows** (.nyno files).

```yaml
nyno: 5.2.0
workflow:
  - step: ai-openai-text
    args: ['My idea: ${PROMPT}', minimal]
    context: {SYSTEM_PROMPT: 'You''re a blog post writer. I will give you an idea, and you basically need to expand upon it, you can also correct me, but just give me the best possible article you can write about it to share my idea. Only output the new article, dont affirm.'}
  - step: ai-openai-text
    args: ['my article: ${prev}', minimal]
    context: {SYSTEM_PROMPT: 'Make my article more heartfelt. Only output the new article, dont affirm.'}
```


### Introducing "The Engine" that powers Nyno
To achieve most requests/per second we're using multi-process worker engines where feasible. Nyno will spawns 2 light-weight workers for each language in `dev` mode or 3 workers for every language and CPU core in `prod` mode. This means that if you have 4 CPU cores, it will spawn 12 ready-to-run workers to run workflow steps.


| Python3 (multi-process workers engine) | PHP8 + Swoole (multi-process workers engine) | JavaScript + NodeJS (multi-process workers engine) |  Ruby (multi-process workers engine) |   
|----------|----------|----------|----------|
| ![Python3](/h/897a882a192b22b587a9d2373171205d8013e7a959134c2131dbd8e7f588e694/python-neon-nyno-2.webp) | ![PHP8 + Swoole](/h/591111cbf8d92909f37ef0b6587bfe9b9c1da12ae5c8c73719e21b27280be18d/php-neon-nyno-3.webp)  | ![JavaScript + NodeJS ](/h/a87196be5391957f9221e082189852d9bd909b6dfd9a1c8e78c5dc40db1018d8/js-neon-nyno-3.webp) | ![Ruby Lang](/h/5c4085f2135ff5ff1e1cb3b5042bcac1d2e0673009d4cdd0e602d8c1b004506a/ruby-lang-and-nyny.webp) | 


---

## Create New Steps or Use Extensions: Turn Scripts into High-Performing Text Commands

In Nyno, every **Python, JavaScript, PHP and Ruby** script becomes a reusable command that runs in its own high-performing worker engine.
Just export a function (with args and context) and call it in any workflow using plain YAML text.

Example (JavaScript)
```js
// extensions/hello/command.js
export function hello(args, context) {
  const name = args[0] || "World";
context['hello'] = `Hello, ${name}!`;
return 0;
}
```

Example in Workflow (YAML):
```yaml
hello:
    - "${name}"
```

Example in [TCP](https://github.com/empowerd-cms/tcpman) (**after saving your flow.json in workflows-enabled/ and restarting** Nyno):
```bash
tcpman localhost:9024/test_nyno 'c{"apiKey":"changeme"}' 'q{"name":"Alice"}'
```

Example output
```
>>> Sending: c{"apiKey":"changeme"}
{"status":"ok","type":"connect"}
>>> Sending: q{"name":"Alice","path":"/test_nyno"}
{"route":"/test_nyno","system":"default","status":"ok","execution_time_seconds":0.019,"execution":[{"input":{"name":"Alice"},"output":"","details":{"error":true,"missing":["i"],"node_id":"1","node_title":"route_/test_nyno","new_context":{"name":"Alice"}}},{"input":{"name":"Alice","O_1":""},"output":"hi node 2!","details":{"command":["echo","hi node 2!"],"bash":true,"stderr":"","exitCode":0,"node_id":"2","node_title":"node_2","new_context":{"name":"Alice","O_1":"","O_2":"hi node 2!"}}},{"input":{"name":"Alice","O_1":"","O_2":"hi node 2!"},"output":"always hi from node 4!","details":{"command":["echo","always hi from node 4!"],"bash":true,"stderr":"","exitCode":0,"node_id":"4","node_title":"node_4","new_context":{"name":"Alice","O_1":"","O_2":"hi node 2!","O_4":"always hi from node 4!"}}}]}

```

---



<p align="center">
  <img src="/h/3f391b88ab87a304526f144770a4288fe36c0f98eae79e9979276783f77a4a4f/nyno-neon-logo.webp" alt="Nyno logo" width="200">
</p>



### Install Nyno using Docker/Podman

#### 1. Clone the Repo
```bash
git clone https://github.com/empowerd-cms/nyno
cd nyno
```

#### 2. Build the Container
```bash
./build-container.sh "podman" # or use docker
```

#### 3. Run the Container
Make sure you to build the container first.


```bash
./run-container-prod.sh "podman" # or use docker, GUI at http://localhost:9057

```

---



### Install Nyno on Linux Host

Note: Nyno is dependent on Best.js which needs to be installed to run Nyno. **You will need to install quite a lot of  dependencies. Docker/Podman install is  recommended.** However, for the experts, a `bash scripts/check_host.sh` script is included to check dependencies quickly.

```bash
# install Best.js
git clone https://github.com/empowerd-cms/best.js
cd best.js
npm install # or # bun install
npm link # for "bestjsserver" command
cd ../

# install Nyno
git clone https://github.com/empowerd-cms/nyno
cd nyno
npm install # or # bun install

# Optionally check system status/dependencies (Python, PHP Swoole, Ruby, Node,Postgres) 
bash scripts/check_host.sh

# Execute Nyno
bash run-dev.sh # runs Nyno in dev mode


```

![Describe Image Here](/h/a7e87aceeadc0133ca4ef143f52661acaf263717b813d9fd7a8a90eb8be9779e/screenshot-from-2025-10-13-13-49-19.webp)


### More Examples and Documentation
Example Python extension:

```py
# extensions/hello-py/command.py
def hello_py(args, context):
    name = args[0] if args else "World"
    context["hello-py"] = f"Hello, {name} from Python!"
    return 0

```

Example PHP extension:

```php
<?php
// extensions/hello-php/command.php
function hello_php($args, &$context) { // & required to modify context
    $name = $args[0] ?? "World";
    $context["hello-php"] = "Hello, $name from PHP!";
    return 0;
}

```


---

Example using `context` to Pass Data Between Steps


```js
export function some_extension(args, context) {
  const result = args[0] || "default value";

  // Save output in context for the next step
  context['MY_RESULT'] = result;

  return 0; // default path
}
```


Example Workflow output:
```json
{
  "status": "ok",
  "execution": [
    {
      "node": 2,
      "input": {
        "args": [
          0
        ],
        "context": {}
      },
      "output": {
        "r": 0,
        "c": {
          "LAST_STEP": "nyno-echo",
          "prev": [
            0
          ]
        }
      }
    }
  ],
  "execution_time_seconds": 0.001
}
```

---

Nyno (“Nine-oh”) is  open-source & Proudly build with [Best.JS](https://github.com/empowerd-cms/best.js) - a faster Next.JS alternative.


