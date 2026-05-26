const { GoogleGenAI } = require('@google/genai');

async function test() {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'say hi'
        });
        console.log(response);
        console.log("text:", response.text);
    } catch (e) {
        console.error(e);
    }
}
test();
