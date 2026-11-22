# Nyno 10

## `Derisk AI innovation` by separating code from configuration.
Nyno is a global open protocol to derisk AI innovation.


#### Before Nyno:

```bash
python3 big-python-script-or-project.py
# 1000+ lines 
# of code
# + custom output shape
```
#### After Nyno:

```bash
nyno10 your-workflow.yml 
# 3 specific YAML workflow steps 
# + clean output shape
```

# Clean Output Shape

Every Nyno workflow produces a clean input/output log in one uniform JSON shape:

```yml
{
     "status": "ok",
     "execution": [
         { step },
         { step }
         { step }
     ]
}

```
Each step is fully observable:

```yml
{
    input: {
        args: ["Hi"],
        context: {
            mistral_api_key: "your api key"
            set: "prev"
        }
    },
    output: {
        r: 0,
        c: {
            last_step: "ai-mistral-text",
            prev: "Hello, how can I help?",
            prev_meta: {
                  usage: {}
             }
        }
    }
}
```
Conventional keys like "prev" and "meta" are used to set the previous text value or to set detailed meta information. For custom variable names change the value of the "set" key.

```json
{
  "prev": "Hello, how can I help?",
  "prev_meta": {
    "usage": {}
  }
}
```

---

# Deciding the next node
The **r** value (normally 0) determines the next node. With 0, it simply goes to the first next step. With more sophistated workflows, we can jump to multiple next nodes:

```yml
workflow:
   - id: 1
     step: if
     args:
       - 1
       - is
       - 1
     next: [2,3]
   - id: 2
     step: echo
     args: 
       - Reached node 2
   - id: 3
     step: echo
     args: 
       - Reached Node 3
```

## Install and Use

### Run the Server
```
git clone https://github.com/flowagi-eu/nyno
cd nyno && bash run-container-prod.sh podman # or docker
```

### Run Your First Workflow
Create your first workflow.yml:
```yml
workflow:
  - step: ai-mistral-text
    args:
      - hi
    context:
      mistral_api_key: "your-mistral-api-key"
```

Run it with the NodeJS CLI:
```
node nyno/cli/cli.js workflow.yml
```

### Optionally add the nyno10 alias:

```
alias nyno10='node $HOME/nyno/cli/cli.js'
```

So in the future you can use:
```
nyno10 workflow.yml
```

---

## Extensions
Nyno can be extended with Python, JavaScript and Rust/WASM (WASI P2) extensions, so you can add your own steps. 

You can place custom extensions in the `./my-extensions` folder.

See also `./my-extensions/README.md`

---

## Need more help?

### 🌐 Community

We're also on Reddit! Join us at [r/Nyno](https://www.reddit.com/r/Nyno/).
