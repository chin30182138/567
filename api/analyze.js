// Vercel 專案 -> /api/analyze.js (V13.7)

const OpenAI = require('openai'); 

// 確保 Vercel 環境變數中 OPENAI_API_KEY 已設定
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    // 【新增/修改】設定 OpenAI SDK 的超時時間為 30 秒 (30 * 1000 毫秒)
    // 這確保了 SDK 會等待更長的時間。
    timeout: 30000, 
});

// JSON 結構提示，確保圖表和長條圖所需數據完整
// 這裡請使用我們前面溝通的 V13.5 (最嚴格) 的 JSON_STRUCTURE_PROMPT 內容，以保證格式。
const JSON_STRUCTURE_PROMPT = `
**請絕對、嚴格、立即遵守以下格式規範，這是強制性的最終要求：**

1.  報告主體必須是專業、深入的繁體中文 Markdown 格式。
2.  **在報告結束後，你必須立即輸出一個獨立的 '```json' 程式碼區塊。**
3.  **此 '```json' 區塊的前後，絕對禁止出現任何多餘的解釋文字或標題。**
4.  JSON 區塊必須嚴格包含以下結構：
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
        
        // 區分 API Key 錯誤和一般錯誤 (雖然您已排除，但保留錯誤處理是必要的)
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
