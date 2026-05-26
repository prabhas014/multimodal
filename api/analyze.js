const { GoogleGenAI } = require('@google/genai');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Expect frontend to send { apiKey?: string, fileData: string, mimeType: string }
        const { apiKey: userApiKey, fileData, mimeType } = req.body;
        
        const finalApiKey = userApiKey || process.env.GEMINI_API_KEY;

        if (!finalApiKey) {
            return res.status(401).json({ error: 'Please provide a Gemini API Key in the sidebar or configure it in Vercel.' });
        }

        const ai = new GoogleGenAI({ apiKey: finalApiKey });

        if (!fileData || !mimeType) {
            return res.status(400).json({ error: 'Missing file data or mime type' });
        }

        // Strip the base64 prefix
        const base64Data = fileData.split(',')[1] || fileData;

        const prompt = `You are an elite, multimodal document analyzer designed to defy the cognitive load of massive, complex, and messy multi-format data. Your objective is to float above the surface-level noise, pull out the hidden "center of mass" from any document, and provide weightless, crystal-clear clarity. 

You will be given a mix of text, tables, charts, hand-written notes, and diagrams. Analyze them holistically using the following operational framework:

### 1. Structural Levitation (The Overview)
* **Document Anatomy:** Briefly state what this document is (e.g., Q3 financial report, mixed-media engineering blueprint, medical history with handwritten charts).
* **The Center of Mass:** What is the single most critical message, thesis, or bottom-line objective of this document?

### 2. Deep-Density Extraction (Multimodal Parsing)
* **Data vs. Visual Cross-Examination:** Correlate the text with the charts/images. Do the data points in the graphs actually match what the text claims? Highlight any discrepancies.
* **Fine-Print Decryption:** Extract critical "hidden" details—footnotes, asterisks, blurred text, or handwritten marginalia—that significantly alter the context.
* **Entity & Metric Mapping:** Identify key stakeholders, dates, regulatory codes, and core financial or scientific metrics. Present them in a clean, scannable Markdown table.

### 3. Gravity Anomalies (Contradictions & Risks)
* Identify "heavy" risks, gaps in logic, missing data, or outright contradictions within the document. If a chart implies a downward trend but the executive summary claims "exponential growth," flag it here.

### 4. Zero-G Synthesis (The Takeaway)
* Provide a bulleted, highly actionable summary of the next steps or key conclusions. 
* Translate complex jargon into intuitive, plain-English insights without losing technical accuracy.`;

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
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
                systemInstruction: "You are an elite multimodal analyzer. Always respond with beautifully formatted Markdown.",
                responseMimeType: "text/plain",
            }
        });

        const extractedData = response.text;

        return res.status(200).json({ result: extractedData });
    } catch (error) {
        console.error("API Error:", error);
        return res.status(500).json({ error: error.message || 'Failed to process document' });
    }
};
