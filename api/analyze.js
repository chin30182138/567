// api/analyze.js - V41.0 最終穩定版 (使用 OpenAI 官方 SDK)

// 導入 OpenAI SDK
const OpenAI = require('openai'); 

// 確保 Vercel 環境變數中 OPENAI_API_KEY 已設定
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY; 
const FINAL_MODEL = 'gpt-3.5-turbo'; 

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY, 
});

// 核心：系統提示詞將在前端生成，這裡只需要一個通用的系統級安全指令。
const SYSTEM_PROMPT = "你是一位精通中國古代《神獸七十二型人格》理論的資深分析師。你的任務是根據用戶提供的組合和情境，輸出深度且具體的分析報告。報告必須專業、嚴謹，並且字數至少 800 字。";


export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
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
                    content: SYSTEM_PROMPT,
                },
                {
                    role: "user",
                    content: prompt // V39.1: 前端已經生成了包含所有指令和格式要求的完整 Prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 3000,
        });

        res.status(200).json(completion);

    } catch (error) {
        console.error("OpenAI API Error:", error.message || error);
        
        // 處理 API 請求失敗
        res.status(500).json({ 
            error: '分析服務器錯誤', 
            detail: error.message || '無法連線到 AI 服務。' 
        });
    }
}
