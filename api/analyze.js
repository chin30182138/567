// api/analyze.js - V10.6 (GPT-4o 鎖定版)

// 獲取 Vercel 環境變數中設置的 OpenAI API Key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; 
const OPENAI_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export default async function handler(req, res) {
    // 檢查是否為 POST 請求
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    // 檢查 API Key 是否存在
    if (!OPENAI_API_KEY) {
        return res.status(500).json({ error: 'Server configuration error: OPENAI_API_KEY is not set in Vercel environment variables.' });
    }

    try {
        const { prompt } = req.body; 

        if (!prompt) {
             return res.status(400).json({ error: 'Missing required parameter: prompt.' });
        }

        // ⭐ V10.6 核心修正：強制鎖定為 GPT-4o，以保證指令遵守度和速度穩定性
        const FINAL_MODEL = 'gpt-4o'; // 這是保證穩定的關鍵！
        
        // 強化系統指令
        const SYSTEM_PROMPT = "你是一位精通中國古代《神獸七十二型人格》理論的資深分析師。你的任務是根據用戶提供的『六獸-六親-地支』組合和情境，輸出深度且具體的分析報告。報告必須專業、嚴謹，並且字數至少 800 字。對於雙人模式（特別是性愛），報告必須充滿細節和針對性建議，絕對不能保守或簡略。**輸出格式嚴格遵循 markdown，並且報告結尾必須包含一個獨立的 JSON 區塊，列出六維度分數和標籤。**"

        // 呼叫 OpenAI API
        const response = await fetch(OPENAI_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}` 
            },
            body: JSON.stringify({
                model: FINAL_MODEL, // ⭐ 使用鎖定的 GPT-4o 模型
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 3000, 
            })
        });

        if (!response.ok) {
            // 轉發 OpenAI 的錯誤訊息
            const errorData = await response.json().catch(() => ({}));
            const status = response.status;
            
            console.error("OpenAI API Error:", errorData.error ? errorData.error.message : response.statusText);

            return res.status(status).json({ 
                error: `OpenAI API 請求失敗 (HTTP ${status})`, 
                detail: errorData.error ? errorData.error.message : response.statusText 
            });
        }

        const data = await response.json();
        
        // 將 OpenAI 的回應直接傳回前端
        res.status(200).json(data);

    } catch (error) {
        console.error("Serverless Function Internal Error:", error);
        res.status(500).json({ error: 'Internal Server Error', detail: error.message });
    }
}
