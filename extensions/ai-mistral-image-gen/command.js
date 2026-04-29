import fs from "fs";
import path from "path";
import crypto from "crypto";

export async function ai_mistral_image_gen(args, context) {
  const setName = context.set_context || "prev";
  const apiKey = context.MISTRAL_API_KEY;

  if (!apiKey) {
    context[setName + ".error"] = "Set MISTRAL_API_KEY in your environment";
    return -1;
  }

  try {
    // ——————————————————————————
    // 1) CREATE IMAGE GENERATION AGENT
    // ——————————————————————————
    const agentRes = await fetch("https://api.mistral.ai/v1/agents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "mistral-medium-latest",
        name: "Image Generation Agent",
        description: "Agent used to generate images.",
        instructions: "Use the image generation tool when you have to create images.",
        tools: [{ type: "image_generation" }],
        completion_args: {
          temperature: 0.3,
          top_p: 0.3
        }
      })
    });

    if (!agentRes.ok) {
      throw new Error(`Agent creation failed: ${await agentRes.text()}`);
    }

    const agentData = await agentRes.json();
    const agentId = agentData.id;

    console.log("Agent ID:", agentId);

    // Optional delay
    await new Promise(r => setTimeout(r, 2000));

    // ——————————————————————————
    // 2) START CONVERSATION
    // ——————————————————————————
    const prompt = args[0];

    const convoRes = await fetch("https://api.mistral.ai/v1/conversations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        agent_id: agentId,
        inputs: prompt
      })
    });

    if (!convoRes.ok) {
      throw new Error(`Conversation failed: ${await convoRes.text()}`);
    }

    const convoData = await convoRes.json();
    console.log("Conversation response received.");

    // ——————————————————————————
    // 3) DOWNLOAD GENERATED IMAGES
    // ——————————————————————————
    const outputDir = context.output_dir || "output";
    fs.mkdirSync(outputDir, { recursive: true });

    const uid = crypto.randomUUID();

    const lastOutput = convoData.outputs?.[convoData.outputs.length - 1];
    const content = lastOutput?.content || [];

    for (let i = 0; i < content.length; i++) {
      const chunk = content[i];

      if (chunk.type === "tool_file" && chunk.file_id) {
        const fileRes = await fetch(
          `https://api.mistral.ai/v1/files/${chunk.file_id}/content`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${apiKey}`
            }
          }
        );

        if (!fileRes.ok) {
          throw new Error(`File download failed: ${await fileRes.text()}`);
        }

        const buffer = Buffer.from(await fileRes.arrayBuffer());

        if (buffer.length > 0) {
          const fileName = path.join(outputDir, `${uid}.png`);

          // Save file
          fs.writeFileSync(fileName, buffer);

          // Convert to base64
          const b64Data = buffer.toString("base64");

	delete convoData['outputs']; 
          context[setName + "_file"] = fileName;
          context[setName] = b64Data;
	context[setName + '_meta'] = convoData;

          console.log(`Saved image: ${fileName}`);
        }
      }
    }

    console.log("All images downloaded successfully!");
    return 0;

  } catch (e) {
    context[setName + ".error"] = {
      error: e.message || String(e)
    };
    return -1;
  }
}
