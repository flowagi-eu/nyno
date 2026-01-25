from datetime import datetime
import json
import yaml
from mistralai import Mistral

import re

def sanitize_function_name(name: str) -> str:
    """
    Sanitize a human-friendly name into a Mistral-safe function name.
    Rules:
    - Only a-z, A-Z, 0-9, underscores, dashes
    - Replace spaces and invalid chars with underscores
    - Remove consecutive dots
    - Truncate to 256 chars
    """
    if not name:
        return "function"

    # Replace invalid characters with underscore
    sanitized = re.sub(r"[^a-zA-Z0-9_.-]", "_", name)

    # Replace multiple underscores or dots with single underscore
    sanitized = re.sub(r"[_\.]{2,}", "_", sanitized)

    # Trim leading/trailing underscores/dots
    sanitized = sanitized.strip("._")

    # Truncate
    return sanitized[:256] if len(sanitized) > 256 else sanitized


def yaml_type_to_json_schema(field):
    """
    Convert a YAML field definition into JSON Schema.
    Supports:
    - description
    - type
    - enum
    - array items
    - legacy shorthand types
    """
    # Full object definition
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


def load_tools_from_array(tools):
    spec = {};
    spec["tools"] = tools;
    
    mistral_tools = []

    for tool in spec.get("tools", []):
        properties = {}
        required = []

        for field_name, field_spec in tool.get("input_schema", {}).items():
            properties[field_name] = yaml_type_to_json_schema(field_spec)
            required.append(field_name)

        mistral_tools.append({
            "type": "function",
            "function": {

                        "name": sanitize_function_name(tool["name"]),
                "description": tool.get("description", ""),
                "parameters": {
                    "type": "object",
                    "properties": properties,
                    "required": required,
                    "additionalProperties": False
                }
            }
        })

    return mistral_tools


def ai_mistral_agent(args, context):
    """
    Nyno extension:
    Selects and calls the correct structured schema using Mistral.

    args[0] = user prompt
    args[1] = tools object
    """
    if not args or len(args) < 2:
        context["prev.error"] = {
            "errorMessage": "Usage: <prompt> <tools_yaml_path>"
        }
        return -1

    user_prompt = args[0]
    tools_raw = args[1]
    
    print("tools_raw", tools_raw)
    tools = load_tools_from_array(tools_raw)

    print("tools_parsed", tools)
    
    api_key = context.get("MISTRAL_API_KEY")
    if not api_key:
        context["prev.error"] = {
            "errorMessage": "Missing MISTRAL_API_KEY"
        }
        return -1

    today = datetime.now().strftime("%Y-%m-%d")

    try:
        # Initialize Mistral client
        client = Mistral(api_key=api_key)

        messages = [
            {
                "role": "system",
                "content": (
                    f"Today is {today}. "
                    "When providing dates, always use YYYY-MM-DD. "
                    "Use the provided schemas when appropriate."
                )
            },
            {
                "role": "user",
                "content": user_prompt
            }
        ]

        # Let Mistral choose the correct schema
        response = client.chat.complete(
            model="mistral-large-latest",
            messages=messages,
            tools=tools,
            tool_choice="auto"
        )

        message = response.choices[0].message

        # No schema selected
        if not message.tool_calls:
            context["prev"] = {
                "toolName": None,
                "args": {}
            }
            return 0

        # First selected schema
        call = message.tool_calls[0]

        tool_json = {
            "toolName": call.function.name.lower().replace(' ','-'),
            "args": json.loads(call.function.arguments)
        }

        set_context = context.get("set_context", "prev")
        context[set_context] = tool_json

        return 0

    except Exception as e:
        context["prev.error"] = {
            "errorMessage": str(e)
        }
        return -1

