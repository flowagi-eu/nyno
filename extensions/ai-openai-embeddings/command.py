# extensions/ai_openai_embeddings/command.py
from openai import OpenAI

def ai_openai_embeddings(args, context):
    """
    Nyno extension to load embeddings using OpenAI's API.
    Accepts a single string or an array of strings in args[0].
    Stores the result(s) in context[set_context].

    Args:
        args (list): args[0] can be a string or a list of strings.
        context (dict): Nyno context object, may contain 'set_context' and 'OPENAI_API_KEY'.

    Returns:
        int: 0 for success, 1 for failure.
    """
    # Get the API key from context
    api_key = context.get("OPEN_AI_API_KEY")
    set_name = context.get("set_context", "prev")

    if not api_key:
        context[set_name + ".error"] = {
            "error": "OPEN_AI_API_KEY not found in context."
        }
        return 1

    # Parse input: args[0] can be a string or a list
    input_texts = args[0] if isinstance(args[0], list) else [args[0]]

    try:
        # Initialize OpenAI client
        client = OpenAI(api_key=api_key)

        # Generate embeddings
        response = client.embeddings.create(
            model="text-embedding-3-large",  # or "text-embedding-3-small"
            input=input_texts
        )

        embeddings = [item.embedding for item in response.data]

        # Match behavior: return single embedding if input was a single string
        context[set_name] = (
            embeddings[0]
            if len(embeddings) == 1 and isinstance(args[0], str)
            else embeddings
        )
        return 0

    except Exception as e:
        context[set_name + ".error"] = {"error": str(e)}
        return 1

