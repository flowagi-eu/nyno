// extensions/mistral-ocr-file/command.js
import fs from "fs/promises";
import path from "path";

export async function ai_mistral_ocr(args, context) {
  const setName = context?.set_context ?? "prev";

  try {
    const apiKey = context?.MISTRAL_API_KEY;

    if (!apiKey) {
      context[setName + "_error"] = { errorMessage: "Missing MISTRAL_API_KEY" };
      return -1;
    }

    if (!args || args.length === 0) {
      context[setName + "_error"] = { errorMessage: "Missing PDF file path" };
      return -1;
    }

    const pdfPath = args[0];
    let dataUrl;

    if(context.OCR_BASE64_MODE) {
        dataUrl = `data:application/pdf;base64,${args[0]}`;
    } else {
        // create PDF
        // --- GUEST MODE RESTRICTION ---
        if (process.env.GUEST_MODE === "1") {
            const guestDir = path.resolve("./guest-uploads");
            const resolvedPath = path.resolve(pdfPath);
            if (!resolvedPath.startsWith(guestDir + path.sep)) {
                context[setName + "_error"] = { errorMessage: "Access denied: file must be inside ./guest-uploads" };
            return -1;
            }
    }
    
        // read PDF and convert to base64
        const buffer = await fs.readFile(pdfPath);
        const base64Pdf = buffer.toString("base64");
        dataUrl = `data:application/pdf;base64,${base64Pdf}`;
    }

    // call Mistral OCR API
    const response = await fetch("https://api.mistral.ai/v1/ocr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "mistral-ocr-latest",
        document: { type: "document_url", document_url: dataUrl },
        table_format: "markdown",
        include_image_base64: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      context[setName + "_error"] = { errorMessage: errorText };
      return -1;
    }

    const data = await response.json();

    // join markdown pages
    let markdown = "";
    if (data?.pages) {
      markdown = data.pages.map(p => p.markdown || "").join("\n\n");
    }

    // --- REPLACE TABLE REFERENCES WITH TABLE CONTENT ---
    for(const page_data of data?.pages) {
    if (page_data?.tables && Array.isArray(page_data.tables)) {
      for (const table of page_data.tables) {
        if (table.id && table.content) {
          // simple direct string replacement
          markdown = markdown.replace(`[${table.id}](${table.id})`, table.content);
        }
      }
    }
    }

    // save final markdown and raw OCR data to context
    context[setName] = markdown; // full replaced markdown only
    context[setName + "_data"] = data; // full data

    return 0;

  } catch (err) {
    context[setName + "_error"] = { errorMessage: err.message };
    return -1;
  }
}
