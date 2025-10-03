// api/analyze.js - V42.1 最終穩定版 (強制銷售話術輸出)

const OpenAI = require('openai'); 
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY; 
const FINAL_MODEL = 'gpt-3.5-turbo'; 

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY, 
});

// JSON 結構提示 (V13.5 最終嚴格版)
const JSON_STRUCTURE_PROMPT = `
**請絕對、嚴格、立即遵守以下格式規範，這是強制性的最終要求：**

1.  報告主體必須是專業、深入的繁體中文 Markdown 格式。
2.  **在報告結束後，你必須立即輸出一個獨立的 '```json' 程式碼區塊。**
3.  **此 '```json' 區塊的前後，絕對禁止出現任何多餘的解釋文字或標題。**
4.  JSON 區塊必須嚴格包含以下結構：
// ... (JSON 結構保持不變) ...
`;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).end('Method Not Allowed');
    }

    if (!OPENAI_API_KEY) {
        return res.status(500).json({ error: 'Server configuration error: OPENAI_API_KEY is missing.' });
    }

    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Missing required parameter: prompt.' });
        }
        
        // 呼叫 OpenAI API
        const completion = await openai.chat.completions.create({
            model: FINAL_MODEL,
            messages: [
                {
                    role: "system",
                    content: "你是一位精通易學、心理學和企業管理的專業顧問，專門提供仙人指路神獸七十二型人格的分析報告。你的報告必須專業、嚴謹，並且字數至少 800 字。在報告中，特別是銷售和人際協調情境，**必須包含具體的對話腳本模擬**，以指導用戶實戰運用。",
                },
                {
                    role: "user",
                    content: prompt + JSON_STRUCTURE_PROMPT, // 傳送最終的強化指令
                }
            ],
            temperature: 0.8, // 提高溫度，鼓勵 AI 輸出更有創造性的對話
            max_tokens: 3000,
        });

        res.status(200).json(completion);

    } catch (error) {
        console.error("OpenAI API Error:", error.message || error);
        res.status(500).json({ detail: error.message || '無法連線到 AI 服務。', error: '分析服務器錯誤' });
    }
}
