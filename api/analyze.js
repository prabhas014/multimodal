const { GoogleGenAI } = require('@google/genai');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not configured on Vercel.' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        // Expect frontend to send { schema: string, fileData: string, mimeType: string }
        const { schema, fileData, mimeType } = req.body;

        if (!fileData || !mimeType) {
            return res.status(400).json({ error: 'Missing file data or mime type' });
        }

        // Strip the base64 prefix
        const base64Data = fileData.split(',')[1] || fileData;

        let schemaInstruction = "";
        if (schema === 'invoice') {
            schemaInstruction = "Extract invoice details such as Vendor Name, Invoice Number, Date, Line Items (with description, quantity, price), and Total Amount.";
        } else if (schema === 'financial') {
            schemaInstruction = "Extract financial report metrics, company names, quarters, revenues, and key financial tables.";
        } else if (schema === 'medical') {
            schemaInstruction = "Extract medical lab results, patient name, test names, values, units, and reference ranges.";
        } else {
            schemaInstruction = "Extract all structured key-value pairs and tabular data you can find in the document.";
        }

        const prompt = `Analyze this document. ${schemaInstruction}\n
Output a JSON array of objects. Each object MUST exactly match this format:
{
    "id": "box-N",
    "key": "Field_Name",
    "value": "Extracted text value",
    "bbox": { "top": "10%", "left": "10%", "width": "20%", "height": "5%", "type": "text" }
}
For bbox, approximate the position as percentages (top, left, width, height) relative to the document size. Use type "text", "table", or "logo".
If there are nested items (like a table with rows), add a 'children' array to that object containing the nested objects in the same format.
Do NOT wrap the JSON in markdown code blocks. Just return the raw JSON array.`;

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-pro',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                data: base64Data,
                                mimeType: mimeType
                            }
                        }
                    ]
                }
            ],
            config: {
                systemInstruction: "You are a multimodal document analyzer. Extract the information exactly as specified. Output MUST be a valid JSON array.",
                responseMimeType: "application/json",
            }
        });

        // Parse JSON to ensure validity
        const extractedData = JSON.parse(response.text);

        return res.status(200).json({ result: extractedData });
    } catch (error) {
        console.error("API Error:", error);
        return res.status(500).json({ error: error.message || 'Failed to process document' });
    }
};
