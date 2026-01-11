// extensions/image-to-html/command.js
import fs from 'fs';
import path from 'path';

export async function nyno_image_paths_to_html(args, context) {
    try {
        // Get output context key
        const setName = context?.set_context ?? "prev";

        // Validate input
        if (!args || !args[0]) {
            throw new Error("No file path provided in args[0]");
        }

        // Split comma-separated paths if multiple
        const filePaths = args[0].split(',').map(p => p.trim());
        const base64Images = [];

        // Process each file
        for (const filePath of filePaths) {
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }

            const fileBuffer = fs.readFileSync(filePath);
            const mimeType = getMimeType(filePath);
            const base64 = fileBuffer.toString('base64');
            base64Images.push({
                src: `data:${mimeType};base64,${base64}`,
                name: path.basename(filePath)
            });
        }

        // Generate HTML
        const html = generateHtml(base64Images);

        // Set output
        context[setName] = html;
        return 0;
    } catch (error) {
        const setName = context?.set_context ?? "prev";
        context[`${setName}.error`] = {
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        };
        return 1;
    }
}

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.png':
            return 'image/png';
        case '.gif':
            return 'image/gif';
        case '.webp':
            return 'image/webp';
        case '.svg':
            return 'image/svg+xml';
        default:
            return 'application/octet-stream';
    }
}

function generateHtml(images) {
    return `
    ${images.map(image => `
    <div class="image-container">
        <img src="${image.src}" style="max-width:100%" alt="${image.name}" title="${image.name}">
    </div>
    `).join('')}
    `;
}
