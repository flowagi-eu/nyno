import os
import uuid
from mistralai import Mistral
from mistralai.models import ToolFileChunk
import time

def ai_mistral_image_gen(args, context):

    set_name = context.get('set_context','prev')

    # ——————————————————————————
    #  SETUP
    # ——————————————————————————

    API_KEY = context.get("MISTRAL_API_KEY",None)
    if not API_KEY:
        context[set_name + '.error'] = ("Set MISTRAL_API_KEY in your environment")
        return -1

    client = Mistral(api_key=API_KEY)

    # ——————————————————————————
    #  1) CREATE IMAGE GENERATION AGENT
    # ——————————————————————————

    image_agent = client.beta.agents.create(
        model="mistral-medium-2505",
        name="Image Generation Agent",
        description="Agent used to generate images.",
        instructions="Use the image generation tool when you have to create images.",
        tools=[{"type": "image_generation"}],
        completion_args={
            "temperature": 0.3,
            "top_p": 0.3,
        }
    )

    print("Agent ID:", image_agent.id)

    # Optional: wait a moment to ensure agent is ready
    time.sleep(2)

    # ——————————————————————————
    #  2) START A CONVERSATION AND GENERATE IMAGE
    # ——————————————————————————

    prompt = args[0]

    response = client.beta.conversations.start(
        agent_id=image_agent.id,
        inputs=prompt
    )

    print("Conversation response received.")



    output_dir = context.get("output_dir", "output")
    os.makedirs(output_dir, exist_ok=True)


    # ——————————————————————————
    #  3) DOWNLOAD ALL GENERATED IMAGES
    # ——————————————————————————

    # response.outputs[-1] usually contains the message.output with ToolFileChunk
    uid = uuid.uuid4()
    for i, chunk in enumerate(response.outputs[-1].content):
        if isinstance(chunk, ToolFileChunk):
            file_bytes = client.files.download(file_id=chunk.file_id).read()
            if len(file_bytes) != 0:
                file_name = output_dir + '/' + str(uid) + '.png' # f"image_generated_{i}.png"
                context[set_name] = file_name
                with open(file_name, "wb") as f:
                    f.write(file_bytes)
                print(f"Saved image: {file_name}")

    print("All images downloaded successfully!")

    return 0
