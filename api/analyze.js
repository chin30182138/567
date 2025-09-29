// Vercel 專案 -> /api/analyze.js (V17.0 最終穩定版)

const OpenAI = require('openai'); // 確保使用 CommonJS 的 require 語法

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// JSON 結構提示，確保圖表和長條圖所需數據完整
const JSON_STRUCTURE_PROMPT = `
**請絕對、嚴格、立即遵守以下格式規範，這是強制性的最終要求：**

1.  報告主體必須是專業、深入的繁體中文 Markdown 格式。
2.  **在報告結束後，你必須立即輸出一個獨立的 '```json' 程式碼區塊。**
3.  **此 '```json' 區塊的前後，絕對禁止出現任何多餘的解釋文字或標題。**
4.  JSON 區塊必須嚴格包含以下結構：
// ... (這裡的 JSON 結構提示保持不變) ...
`;

export default async function handler(request, response) {
    // ... (處理邏輯不變) ...
    try {
        const fullPrompt = prompt + JSON_STRUCTURE_PROMPT;
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // <-- 升級到 gpt-4o 解決超時和格式問題
            messages: [
                // ... (系統提示詞和使用者提示詞不變) ...
            ],
            temperature: 0.7,
            max_tokens: 3000, 
        });

        response.status(200).json(completion);

    } catch (error) {
        console.error('OpenAI API Error or Timeout:', error);
        
        // ... (錯誤處理不變) ...
    }
}
