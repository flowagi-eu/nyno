> Founder Note: "Unlike with n8n, you and your clients never have to request a commercial license to run Nyno workflows. This was the main reason I started building Nyno." – MJ

### Nyno 8.0: Quick Install (Linux or Windows)
For Linux install see the bash command below. For Windows install, see [https://nyno.dev/how-to-run-nyno-on-windows-using-docker-desktop](https://nyno.dev/how-to-run-nyno-on-windows-using-docker-desktop)
```bash
podman run -it -p 9057:9057 flowagi/nyno

## Or Docker: docker run -it -p 9057:9057 flowagi/nyno

# Browse to http://localhost:9057
```

![Nyno Workflow Example 1](/h/f32a675319e6394dbae59b535e71424249ca5537afa089a20ad3d81e40eb2427/screenshot-from-2026-02-22-20-18-14.webp)

# From Slow, Restrictive AI workflows to Fast, Simple & Sovereign Automation.
Nyno is not just another AI workflow tool. Nyno is:
- **🟢 Human Editable Workflow Files (YAML + GUI).**
- **🟢 Commercial Friendly License (Apache 2).**
- **🟢 Multi-Language: Build on top of  the best ecosystems (Python, Ruby, PHP & JavaScript)**

[spacing value='4rem']

---


#### The #1 USP Question from a real person about Nyno:

> "So, it goes as: 1. I import a language function. 2. Now I have a new component in my workflow. 3. Enjoy?"

- A: Yes, exactly. From all the best ecosystems (py,js,php,ruby). And better yet, it's yours. You own it. You can license/sell it however you want, since the core is permissive Apache2 licensed.

[spacing value='6rem']


Quick comparison with n8n (currently most popular AI Workflow GUI builder):

| Core Values    | With n8n | With Nyno |
| ------------------ | --------------------------- | ------------------------------------------------------------------------ |
| Financial Freedom    | ❌ No. n8n is not OSI open-source. Embedded licenses (potentially costing $25.000+) required for commercial use. | ✅ Yes. Build and possibly fully own and sell your own automation systems, extensions and commercial services. | 
| No Technical Vendor Lock-in | ❌ Complicated specific SDK for extensions. | ✅ Custom nodes simply use an exportable (py,rb,php,js) function. See also [generate-your-own-nyno-workflow-extensions](https://nyno.dev/generate-your-own-nyno-workflow-extensions) |
| Scalability & Execution Speed for Custom Code   | 🐌 Slow (≈0.15s per node). Custom Python/NodeJS code nodes use a new process. | ⚡ Fast (≈0.002s per node). Custom code require custom nodes which are loaded when Nyno boots. |
| Developer Experience | 🤯 Workflows are big messy JSON files.               | 😌 Workflows are clean human editable YAML scripts, like code.    
| Privacy & GDPR | 🇺🇸 n8n workflows often rely on US-based AI & APIs. Each workflow may introduce additional GDPR compliance risks. | 🇪🇺 Nyno uses European Mistral AI by default and includes  built-in local Postgres database nodes to encourage sovereign data storage.     

---




![Nyno Workflow Example](/h/3fec8199e52b6983079d4800694475a7c660ab26c1f0a831e16050dc340f24ec/screenshot-from-2026-01-12-00-04-09.webp)




![Nyno examples connecting multiple AI nodes](/h/c0f8c2c19f52c63ba139a25e5fa5fbc80a36a865c1368534bac204c3fc3d683f/screenshot-from-2026-01-12-13-26-24.webp)

---


## Your Open-Source Workflow Engines for AI, Advanced Intelligence & Beyond. Extend with Python, PHP, JS and Ruby.  Runs in the Browser.
- Try the Online Playground: [https://nyno.dev/online-playground](https://nyno.dev/online-playground)
- Stay Up-to-Date: Join our Reddit community at [/r/Nyno](https://www.reddit.com/r/Nyno)
- Fill in the first form to join the platform next week: [https://nyno.dev/](https://nyno.dev/)


---



### 🧠 Create New Workflow Steps in  languages you love.
### 🔗 Connect everything with plain YAML text (.nyno).

Nyno is an **open-source multi-language workflow engine** and [language](https://github.com/empowerd-cms/nyno-lang) that lets you build, extend, and connect automation in the languages you already know — **Python, PHP, JavaScript, and Ruby**.


Each programming language runs in its own **high-performance worker engine**. Command-steps can be called in short human-readable **YAML Workflows** (.nyno files).

```yaml
nyno: 6.0
workflow:
  - step: ai-mistral-text
    args: ['My idea: ${PROMPT}']
    context: {SYSTEM_PROMPT: 'You''re a blog post writer. I will give you an idea, and you basically need to expand upon it, you can also correct me, but just give me the best possible article you can write about it to share my idea. Only output the new article, dont affirm.'}
  - step: ai-mistral-text
    args: ['my article: ${prev}']
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
- step: hello
  args: 
  - "${name}"
```

<p align="center">
  <img src="/h/8bce199fb887e27200cb6b95ded7d0893b4c265e0e0de457291ea481b048013d/nyno-9-dot.webp" alt="Nyno logo" width="200">
</p>



### Install Nyno using Docker/Podman


## Quick Install (option 1, recommended)
```bash
podman run -it -p 9057:9057 flowagi/nyno

## Or Docker: docker run -it -p 9057:9057 flowagi/nyno
```

## Developer Mode (option 2, for custom builds)

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

#### For first time users: Docker/Podman install is recommended.
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


## Frequently Asked Questions

#### Benefits of Nyno over n8n:
 - is n8n not already open source?
- -  n8n is not open-source. See also **[[Why Nyno might save you $25.000 for both you and your clients]]**
- n8n can be a pain to debug. How is Nyno easier?
- - Nyno provides full input/output logs of each step. including previous + new context variables.
- How about scaling? 
- - The goal of Nyno is to be 10x better than n8n. For scaling, **[see Custom Python Code/Node benchmarks](https://nyno.dev/n8n-vs-nyno-for-python-code-execution-the-benchmarks-and-why-nyno-is-much-faster)**



#### Common Nyno Questions:

- I couldn't figure out **how to get the data from one node to be the argument to the next** 
- - Use ${prev} as value in most cases. See also: [https://nyno.dev/workflow-context-variable-passing](https://nyno.dev/workflow-context-variable-passing ) 


### For More Optional Plugins
- See [flowagi-eu/nyno-optional-plugins](https://github.com/flowagi-eu/nyno-optional-plugins/)


---

The Nyno GUI is Proudly build with [Best.JS](https://github.com/empowerd-cms/best.js) - a faster Next.JS alternative.




