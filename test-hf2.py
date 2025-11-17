import json
from typing import Any, Dict, List
from transformers import AutoModelForCausalLM, AutoTokenizer

model_name = "katanemo/Arch-Function-1.5B"
model = AutoModelForCausalLM.from_pretrained(
    model_name, device_map="auto", torch_dtype="auto", trust_remote_code=True
)
tokenizer = AutoTokenizer.from_pretrained(model_name)

# Please use our provided prompt for best performance
TASK_PROMPT = """
Never answer, never say sorry, only use tools.
""".strip()

TOOL_PROMPT = """
# Tools

You must call one function to assist the user.

You are provided with function signatures within <tools></tools> XML tags:
<tools>
{tool_text}
</tools>
""".strip()

FORMAT_PROMPT = """
For each function call, return a json object with function name and arguments within <tool_call></tool_call> XML tags:
<tool_call>
{"name": <function-name>, "arguments": <args-json-object>}
</tool_call>
""".strip()

# Define available tools
get_weather_api = {
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Get the current weather for a location",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "str",
                    "description": "The city and state, e.g. San Francisco, New York",
                },
                "unit": {
                    "type": "str",
                    "enum": ["celsius", "fahrenheit"],
                    "description": "The unit of temperature to return",
                },
            },
            "required": ["location"],
        },
    },
}

openai_format_tools = [get_weather_api]


def convert_tools(tools: List[Dict[str, Any]]):
    return "\n".join([json.dumps(tool) for tool in tools])

# Helper function to create the system prompt for our model
def format_prompt(tools: List[Dict[str, Any]]):
    tool_text = convert_tools(tools)

    return (
        TASK_PROMPT
        + "\n\n"
        + TOOL_PROMPT.format(tool_text=tool_text)
        + "\n\n"
        + FORMAT_PROMPT
        + "\n"
    )


system_prompt = format_prompt(openai_format_tools)

messages = [
    {"role": "system", "content": system_prompt},
    {"role": "user", "content": "What is the weather in Fuengirola in European units?"},
]

inputs = tokenizer.apply_chat_template(
    messages, add_generation_prompt=True, return_tensors="pt"
).to(model.device)

outputs = model.generate(
    inputs,
    max_new_tokens=512,
    do_sample=False,
    num_return_sequences=1,
    eos_token_id=tokenizer.eos_token_id,
)

response = tokenizer.decode(outputs[0][len(inputs[0]) :], skip_special_tokens=True)
print(response)

