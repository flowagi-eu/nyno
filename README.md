
![Nyno Workflow Example](/h/26ab99978c0ffd5a6ee4188c928cf0506bfbc767032bdab0295890d2aa5cc1b9/screenshot-from-2025-10-23-20-37-24.webp)



## Nyno 2.0: The Multi-Language Workflow Engine

### 🧠 Create New Steps in the languages you love.
### 🔗 Connect everything with plain YAML text.

Nyno is an **open-source multi-language workflow engine** that lets you build, extend, and connect automation in the languages you already know — **Python, PHP, JavaScript**, or even **Bash**.

runs in its own high-performance worker engine
Each language (except Bash) runs in its own **high-performance worker engine**. Functions and commands can be called using the human-readable **YAML text** format.

### Introducing "The Engine" that powers Nyno 2.0
To achieve most requests/per second we're using multi-process worker engines where feasible. Nyno will spawn 3 light-weight workers for each language and for every CPU core. This means that if you have 4 CPU cores, it will spawn 12 ready-to-run workers to run workflow steps.

| Bash (creates new process everytime) | JavaScript + NodeJS (multi-process workers engine) | Python3 (multi-process workers engine) | PHP8 + Swoole (multi-process workers engine) |
|----------|----------|----------|----------|
| ![Bash](/h/8be29d64c5a389f6d65094067c25f1e8375f474fd7e0663608d4a89f5f55e25b/bash-neon-nyno-2.webp) | ![JavaScript + NodeJS ](/h/a87196be5391957f9221e082189852d9bd909b6dfd9a1c8e78c5dc40db1018d8/js-neon-nyno-3.webp) | ![Python3](/h/897a882a192b22b587a9d2373171205d8013e7a959134c2131dbd8e7f588e694/python-neon-nyno-2.webp) | ![PHP8 + Swoole](/h/591111cbf8d92909f37ef0b6587bfe9b9c1da12ae5c8c73719e21b27280be18d/php-neon-nyno-3.webp) |


---

## Create New Steps or Use Extensions: Turn Scripts into High-Performing Text Commands

In Nyno, every **Python, JavaScript or PHP** script can become a reusable command that will run in its own high-performing worker engine.
Just export a function (with args and context) and call it in any workflow using plain YAML text.

Example (JavaScript)
```
// extensions/hello/command.js
export function hello(args, context) {
  const name = args[0] || "World";
  return { output: `Hello, ${name}!` };
}
```

Example in Workflow (YAML):
```
hello:
    - "${name}"
```

Example in [TCP](https://github.com/empowerd-cms/tcpman) (**after saving your flow.json in workflows-enabled/ and restarting** Nyno):
```
tcpman localhost:6001/test_nyno 'c{"apiKey":"changeme"}' 'q{"name":"Alice"}'
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
```
git clone https://github.com/empowerd-cms/nyno
cd nyno
```

#### 2. Build the Container
```
build-container.sh "podman" # Podman can be slightly faster
build-container.sh "docker"
```

#### 3. Run the Container
Make sure you to build the container first.
```
run-container-prod.sh "podman" # for maximum performance, GUI at https://localhost:5173
run-container-dev.sh "podman" # for maximum logging/debugging mode, GUI at http://localhost:4173
#
# Or use Docker
#
run-container-prod.sh "docker" # for maximum performance, GUI at https://localhost:5173
run-container-dev.sh "docker" # for maximum logging/debugging mode, GUI at http://localhost:4173
```


### Install Nyno on Linux Host

Note: Nyno is dependent on Best.js which needs to be installed to run Nyno. If you plan to run PHP-based extensions, you'll also need to install PHP Swoole for high-performing PHP commands.

```
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
bestjserver # runs Nyno

# optionally Install PHP, build tools and Swoole
sudo apt update
sudo apt install php php-cli php-dev php-pear -y
sudo pecl install swoole
```

![Describe Image Here](/h/a7e87aceeadc0133ca4ef143f52661acaf263717b813d9fd7a8a90eb8be9779e/screenshot-from-2025-10-13-13-49-19.webp)


### More Examples and Documentation
Example Python extension:
```
# extensions/hello-py/command.py
def hello_py(args, context):
    name = args[0] if args else "World"
    return {"output": f"Hello, {name} from Python!"}

```

Example PHP extension:
```
<?php
// extensions/hello-php/command.php
function hello_php($args, $context) {
    $name = $args[0] ?? "World";
    return ["output" => "Hello, $name from PHP!"];
}

```

Example Workflow output:
```
{
    "route": "\/test_runners",
    "system": "default",
    "status": "ok",
    "execution_time_seconds": 0.012,
    "execution": [
        {
            "input": {
                "i": "0",
                "name": "Alice"
            },
            "output": "0",
            "details": {
                "command": [
                    "nyno-echo",
                    "0"
                ],
                "context": {
                    "i": "0",
                    "name": "Alice"
                },
                "node_id": "1",
                "node_title": "route_\/test_runners",
                "new_context": {
                    "i": "0",
                    "name": "Alice",
                    "NYNO_ECHO_ARGS": [
                        "0"
                    ]
                }
            }
        },
        {
            "input": {
                "i": "0",
                "name": "Alice",
                "NYNO_ECHO_ARGS": [
                    "0"
                ],
                "O_1": "0"
            },
            "output": "Hello, Alice!",
            "details": {
                "command": [
                    "hello",
                    "Alice"
                ],
                "context": {
                    "i": "0",
                    "name": "Alice",
                    "NYNO_ECHO_ARGS": [
                        "0"
                    ],
                    "O_1": "0"
                },
                "node_id": "2",
                "node_title": "test-js",
                "new_context": {
                    "i": "0",
                    "name": "Alice",
                    "NYNO_ECHO_ARGS": [
                        "0"
                    ],
                    "O_1": "0",
                    "custom_js_var": "js"
                }
            }
        }
    ]
}
```

---

Nyno (“Nine-oh”) is  open-source & Proudly build with [Best.JS](https://github.com/empowerd-cms/best.js) - a faster Next.JS alternative.
