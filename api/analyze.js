// api/analyze.js - Vercel Serverless Function (V12.1 - 穩定運行版 - 不使用 NPM 套件)

// 獲取 Vercel 環境變數中設置的 OpenAI API Key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; 
const OPENAI_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    if (!OPENAI_API_KEY) {
        return res.status(500).json({ error: 'Server configuration error: OPENAI_API_KEY is not set.' });
    }

    try {
        // V12.1 修正：我們不再信任前端傳來的 model，強制鎖定最快模型。
        const { prompt } = req.body; 
        const FINAL_MODEL = 'gpt-3.5-turbo'; // 鎖定最快模型，以避免 Vercel 超時

        if (!prompt) {
            return res.status(400).json({ error: 'Missing required parameter: prompt.' });
        }
        
        // 強化的 System Prompt，要求輸出完整報告並在結尾包含 JSON 區塊。
        const SYSTEM_PROMPT = "你是一位精通中國古代《神獸七十二型人格》理論的資深分析師。你的任務是根據用戶提供的『六獸-六親-地支』組合和情境，輸出深度且具體的分析報告。報告必須專業、嚴謹，並且字數至少 800 字。對於雙人模式（特別是性愛），報告必須充滿細節和針對性建議，絕對不能保守或簡略。**輸出格式嚴格遵循 markdown，並且報告結尾必須包含一個獨立的 JSON 程式碼區塊 (```json ... ```)，列出六維度分數和標籤。**"

        // 呼叫 OpenAI API
        const response = await fetch(OPENAI_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}` 
            },
            body: JSON.stringify({
                model: FINAL_MODEL, // 鎖定為 gpt-3.5-turbo
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
