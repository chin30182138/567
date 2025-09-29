// Vercel 專案 -> /api/analyze.js
// V12.9 穩定版：使用 require 引入 openai，並確保 Vercel 能正確安裝依賴。

const OpenAI = require('openai'); // <-- 確保是 require 語法

// 確保 Vercel 環境變數中 OPENAI_API_KEY 已設定
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// JSON 結構提示，確保圖表和長條圖所需數據完整
const JSON_STRUCTURE_PROMPT = `
你必須在深度分析報告的最後，以一個獨立的 '```json' 程式碼區塊輸出以下結構的 JSON 物件。這個 JSON 結構是強制性的，必須嚴格遵守：

{
  "scores": {
    "fit": [0-100的整數，代表契合度分數],
    "comm": [0-100的整數，代表溝通度分數],
    "pace": [0-100的整數，代表節奏度分數],
    "account": [0-100的整數，代表權責度分數],
    "trust": [0-100的整數，代表信任度分數],
    "innov": [0-100的整數，代表創新度分數]
  },
  "tags": [
    "性格或情境的關鍵詞1",
    "性格或情境的關鍵詞2",
    "性格或情境的關鍵詞3"
  ]
}

- 報告主體必須是專業、深入的繁體中文 Markdown 格式。
- JSON 區塊必須是報告的最後一個部分，並且前後不能有額外解釋文字。
`;

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt } = request.body;

    if (!prompt) {
        return response.status(400).json({ error: 'Missing prompt in request body' });
    }

    try {
        const fullPrompt = prompt + JSON_STRUCTURE_PROMPT;
        
        // 使用 gpt-3.5-turbo 模型
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", 
            messages: [
                {
                    role: "system",
                    content: "你是一位精通易學、心理學和企業管理的專業顧問，專門提供仙人指路神獸七十二型人格的分析報告。你必須使用繁體中文和 Markdown 格式輸出專業報告，並在結尾嚴格遵守使用者提供的 JSON 結構來輸出六維度分數和標籤。",
                },
                {
                    role: "user",
                    content: fullPrompt,
                }
            ],
            temperature: 0.7,
            max_tokens: 3000, 
        });

        // Vercel Serverless Function 成功，返回結果
        response.status(200).json(completion);

    } catch (error) {
        console.error('OpenAI API Error:', error);
        
        // 區分 API Key 錯誤和一般錯誤
        if (error.status === 401) {
             return response.status(401).json({ 
                error: 'OpenAI 授權失敗', 
                detail: '請檢查 Vercel 環境變數中的 OPENAI_API_KEY 是否正確且有效。' 
             });
        }
        
        // 捕獲其他所有執行時錯誤（包括網路、超時等）
        response.status(500).json({ 
            error: '分析服務器錯誤', 
            detail: error.message || '無法連線到 AI 服務。' 
        });
    }
}
