# extensions/ai_mistral_embeddings/command.py
from mistralai import Mistral

def ai_mistral_embeddings(args, context):
    """
    Nyno extension to load embeddings using Mistral's API (v1 client).
    Accepts a single string or an array of strings in args[0].
    Stores the result(s) in context[set_context].

    Args:
        args (list): args[0] can be a string or a list of strings.
        context (dict): Nyno context object, may contain 'set_context' and 'MISTRAL_API_KEY'.

    Returns:
        int: 0 for success, 1 for failure.
    """
    # Get the API key from context
    api_key = context.get("MISTRAL_API_KEY")
    if not api_key:
        set_name = context.get("set_context", "prev")
        context[set_name + ".error"] = {"error": "MISTRAL_API_KEY not found in context."}
        return 1

    # Get the output context key
    set_name = context.get("set_context", "prev")

    # Parse input: args[0] can be a string or a list
    input_texts = args[0] if isinstance(args[0], list) else [args[0]]

    # Initialize Mistral client (v1)
    try:
        client = Mistral(api_key=api_key)
        # Generate embeddings
        response = client.embeddings.create(
            model="mistral-embed",  # or "codestral-embed" for code
            inputs=input_texts
        )
        embeddings = [data.embedding for data in response.data]
        # If input was a single string, return a single embedding; else return array
        context[set_name] = embeddings[0] if len(embeddings) == 1 and isinstance(args[0], str) else embeddings
        return 0
    except Exception as e:
        context[set_name + ".error"] = {"error": str(e)}
        return 1

