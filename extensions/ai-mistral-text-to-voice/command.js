import { writeFile } from 'fs/promises';
import { resolve, basename } from 'path';

export async function ai_mistral_text_to_voice(args, context) {
  const inputTextRaw = args[0];
  if (!inputTextRaw) {
    const setName = context?.set_context ?? "prev";
    context[`${setName}_error`] = { errorMessage: "Input text is required" };
    return -1;
  }

// clean emojis and ' . ' to hotfix audio browser offset
const inputText = ' . ' + inputTextRaw.replace(/\p{Extended_Pictographic}/gu, '');

  const apiKey = context.MISTRAL_API_KEY;
  if (!apiKey) {
    const setName = context?.set_context ?? "prev";
    context[`${setName}_error`] = { errorMessage: "MISTRAL_API_KEY is required in context" };
    return -1;
  }

  const outputDir = context.output_dir || (process.cwd() + '/output');
  const outputFilename = `mistral_tts_${Date.now()}.mp3`;
  const outputPath = resolve(outputDir, outputFilename);

  try {
    const response = await fetch('https://api.mistral.ai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: inputText,
        model: "voxtral-mini-tts-2603",
        response_format: "mp3",
        voice_id: context.MISRTRAL_VOICE_ID ?? "fr_marie_curious" // gb_jane_confident"
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      const setName = context?.set_context ?? "prev";
      context[`${setName}_error`] = {
        errorMessage: `API request failed: ${errorData.message || response.statusText}`
      };
      return -1;
    }

    const response_raw = await response.text();
    const prev_meta = JSON.parse(response_raw);
    const audioData = prev_meta.audio_data; // base64 data

    delete prev_meta['audio_data'];


const base64 = audioData.includes(',')
  ? audioData.split(',')[1]
  : audioData;

await writeFile(outputPath, Buffer.from(base64, 'base64'));


    const setName = context?.set_context ?? "prev";
    context[setName] = audioData;
    
    context[setName + "_meta"] = {
      ...prev_meta,
//response_raw,
      outputPath,
      filename: outputFilename,

      usage: {completion_tokens: 1333, prompt_tokens: 0} 


    };

    return 0;
  } catch (error) {
    const setName = context?.set_context ?? "prev";
    context[`${setName}_error`] = {
      errorMessage: `Error generating TTS: ${error}`
    };
    return -1;
  }
}
