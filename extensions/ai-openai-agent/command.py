from datetime import datetime
import json
import yaml
import re
from openai import OpenAI


# ---------------------------------------------------------
# Shared tool importer (OpenAI-compatible)
# ---------------------------------------------------------

def sanitize_function_name(name: str) -> str:
    """
    Sanitize a human-friendly name into a safe function name.
    """
    if not name:
        return "function"

    sanitized = re.sub(r"[^a-zA-Z0-9_.-]", "_", name)
    sanitized = re.sub(r"[_\.]{2,}", "_", sanitized)
    sanitized = sanitized.strip("._")

    return sanitized[:256]


def yaml_type_to_json_schema(field):
    """
    Convert a YAML field definition into JSON Schema.
    """
    if isinstance(field, dict):
        schema = {
            "type": field.get("type", "string")
        }

        if "description" in field:
            schema["description"] = field["description"]

        if "enum" in field:
            schema["enum"] = field["enum"]

        if schema["type"] == "array":
            schema["items"] = {"type": field.get("items", "string")}

        return schema

    # Legacy shorthand support
    if field == "string":
        return {"type": "string"}
    if field == "number":
        return {"type": "number"}
    if field == "boolean":
        return {"type": "boolean"}
    if field == "string[]":
        return {"type": "array", "items": {"type": "string"}}

    return {"type": "string"}


def load_tools_from_yaml(filepath):
    """
    Load tools from YAML and convert them to
    OpenAI Responses API compatible function schemas.
    All fields are automatically required.
    """
    with open(filepath, "r") as f:
        spec = yaml.safe_load(f)

    tools = []

    for tool in spec.get("tools", []):
        properties = {}
        required = []

        for field_name, field_spec in tool.get("input_schema", {}).items():
            properties[field_name] = yaml_type_to_json_schema(field_spec)
            required.append(field_name)

        tools.append({
            "type": "function",
            "name": sanitize_function_name(tool["name"]),
            "description": tool.get("description", ""),
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": required,
                "additionalProperties": False
            }
        })

    return tools


# ---------------------------------------------------------
# OpenAI tool gateway
# ---------------------------------------------------------

def ai_openai_agent(args, context):
    """
    Nyno extension:
    Selects and calls the correct structured schema using OpenAI.
    args[0] = user prompt
    args[1] = path to tools.yaml
    """
    today = datetime.now().strftime("%Y-%m-%d")

    if not args or len(args) < 2:
        context["prev.error"] = {
            "errorMessage": "Usage: <prompt> <tools_yaml_path>"
        }
        return 1

    user_prompt = args[0]
    tools_path = args[1]

    api_key = context.get("OPEN_AI_API_KEY")
    if not api_key:
        context["prev.error"] = {
            "errorMessage": "Missing OPEN_AI_API_KEY"
        }
        return 2

    try:
        tools = load_tools_from_yaml(tools_path)
        client = OpenAI(api_key=api_key)

        model = "gpt-4o-2024-08-06"
        context["last_model"] = model

        system_message = {
            "role": "system",
            "content": (
                f"Today is {today}. "
                "When providing dates, always use YYYY-MM-DD. "
                "Use the provided schemas when appropriate."
            )
        }
        context["system_message"] = system_message

        resp = client.responses.create(
            model=model,
            input=[
                system_message,
                {"role": "user", "content": user_prompt}
            ],
            tools=tools
        )

        tool_json = None

        for item in resp.output:
            if item.type == "function_call":
                tool_json = {
                                "toolName":  item.name.lower().replace(' ','-'),
                    "args": json.loads(item.arguments)
                }
                break

        if not tool_json:
            context["prev"] = {
                "toolName": None,
                "args": {}
            }
        else:
            set_context = context.get("set_context", "prev")
            context[set_context] = tool_json

        return 0

    except Exception as e:
        context["prev.error"] = {
            "errorMessage": str(e)
        }
        return 3

