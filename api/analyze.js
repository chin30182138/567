// api/analyze.js
// Vercel Serverless Function - 作為前端與 OpenAI 之間的代理

// 獲取 Vercel 環境變數中設置的 OpenAI API Key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; 
const OPENAI_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export default async function handler(req, res) {
    // 檢查是否為 POST 請求
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    // 檢查 API Key 是否存在 (從 Vercel 環境變數中獲取)
    if (!OPENAI_API_KEY) {
        return res.status(500).json({ error: 'Server configuration error: OPENAI_API_KEY is not set in Vercel environment variables.' });
    }

    try {
        const { payload, model, prompt } = req.body;

        if (!prompt || !model) {
             return res.status(400).json({ error: 'Missing required parameters: prompt or model.' });
        }

        // 呼叫 OpenAI API
        const response = await fetch(OPENAI_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 使用 Vercel 環境變數中的 Key
                'Authorization': `Bearer ${OPENAI_API_KEY}` 
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { 
                        role: "system", 
                        content: "你是一位精通中國古代《神獸七十二型人格》理論的資深分析師。你的任務是根據用戶提供的『六獸-六親-地支』組合和情境，輸出深度且具體的分析報告。報告必須專業、嚴謹，並且字數至少 800 字。對於雙人模式（特別是性愛），報告必須充滿細節和針對性建議，絕對不能保守或簡略。**輸出格式嚴格遵循 markdown，並且報告結尾必須包含一個獨立的 JSON 區塊，列出六維度分數和標籤。**" 
                    },
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
