import fs from "fs";
import path from "path";
import os from "os";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "child_process";

ffmpeg.setFfmpegPath(ffmpegPath);

const MODEL = "voxtral-mini-latest";


// ------------------------------
// Convert WebM → MP3
// ------------------------------
function webmToMp3(webmBuffer) {
  return new Promise((resolve, reject) => {
    const inputPath = path.join(os.tmpdir(), `in_${Date.now()}.webm`);
    const outputPath = path.join(os.tmpdir(), `out_${Date.now()}.mp3`);

    fs.writeFileSync(inputPath, webmBuffer);

    ffmpeg(inputPath)
      .audioCodec("libmp3lame")
      .format("mp3")
      .audioBitrate(128)
      .on("error", reject)
      .on("end", () => {
        try {
          const mp3Buffer = fs.readFileSync(outputPath);

          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);

          resolve(mp3Buffer);
        } catch (err) {
          reject(err);
        }
      })
      .save(outputPath);
  });
}


// ------------------------------
// CURL uploader (100% parity)
// ------------------------------
function uploadWithCurl(filePath, apiKey, model, language = "en") {
  return new Promise((resolve, reject) => {
    const args = [
      "https://api.mistral.ai/v1/audio/transcriptions",
      "-X", "POST",
      "-H", `x-api-key: ${apiKey}`,
      "-F", `file=@${filePath}`,
      "-F", `model=${model}`,
      "-F", `language=${language}`
    ];

    const curl = spawn("curl", args);

    let stdout = "";
    let stderr = "";

    curl.stdout.on("data", (d) => {
      stdout += d.toString();
    });

    curl.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    curl.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || `curl failed with code ${code}`));
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (err) {
        reject(new Error("Failed to parse JSON: " + stdout));
      }
    });
  });
}


// ------------------------------
// MAIN FUNCTION
// ------------------------------
export async function ai_mistral_voice_to_text(args, context) {
  const base64Audio = args[0];
  const setName = context?.set_context ?? "prev";

  if (!base64Audio) {
    context[`${setName}_error`] = {
      errorMessage: "Base64 audio input is required"
    };
    return -1;
  }

  const apiKey = context.MISTRAL_API_KEY;

  if (!apiKey) {
    context[`${setName}_error`] = {
      errorMessage: "MISTRAL_API_KEY is required"
    };
    return -1;
  }

  try {
    // ------------------------------
    // Decode base64
    // ------------------------------
    const base64 = base64Audio.includes(",")
      ? base64Audio.split(",")[1]
      : base64Audio;

    const audioBuffer = Buffer.from(base64, "base64");

    if (!audioBuffer.length) {
      throw new Error("Decoded audio buffer is empty");
    }

    // ------------------------------
    // Convert to MP3
    // ------------------------------
    const mp3Buffer = await webmToMp3(audioBuffer);

    console.log("🎧 MP3 size:", mp3Buffer.length);

    // ------------------------------
    // Write temp file for curl
    // ------------------------------
    const dir = process.cwd() + "/output"; // path.resolve("input");
    fs.mkdirSync(dir, { recursive: true });

    const tempFilePath = path.join(dir, `audio_${Date.now()}.mp3`);
    fs.writeFileSync(tempFilePath, mp3Buffer);

    console.log("📁 MP3 written:", tempFilePath);

    // ------------------------------
    // Upload via curl (IDENTICAL to CLI)
    // ------------------------------
    console.log("🚀 Uploading to Mistral via curl...");

    const result = await uploadWithCurl(
      tempFilePath,
      apiKey,
      MODEL,
      context.language ?? "en"
    );

    console.log("🧠 Transcript:", result.text);

    // ------------------------------
    // Store result
    // ------------------------------
    context[setName] = result.text;

    context[setName + "_meta"] = {
      ...result,
      originalAudioBytes: audioBuffer.length,
      mp3Bytes: mp3Buffer.length,
      filePath: tempFilePath
    };

    return 0;
    

  } catch (error) {
    console.error("❌ ERROR:", error);

    context[`${setName}_error`] = {
      errorMessage: error.message
    };

    return -1;
  }
}
