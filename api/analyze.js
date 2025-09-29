// api/analyze.js - Vercel Serverless Function (V12.0 - 嚴格 JSON 模式 + GPT-4-Turbo)
import OpenAI from 'openai';

const openai = new OpenAI(); 

// 由於我們將強制輸出 JSON，SYSTEM PROMPT 必須做對應修改。
const SYSTEM_PROMPT = "你是一位精通中國古代《神獸七十二型人格》理論的資深分析師。你的任務是根據用戶提供的『六獸-六親-地支』組合和情境，輸出深度且具體的分析報告的六維度分數和標籤。**你必須且只能輸出一個嚴格的 JSON 物件。請勿輸出任何 Markdown、文字、解釋或其他額外內容。** 該 JSON 物件必須包含六維度分數 (fit, comm, pace, account, trust, innov) 和標籤 (tags)。";

// 為了最高的穩定性，建議使用 GPT-4-Turbo 或 GPT-4o
const FINAL_MODEL = 'gpt-4-turbo'; // 選擇指令遵守度最高的模型

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { prompt } = req.body;
        
        if (!prompt) {
             return res.status(400).json({ error: 'Missing required parameter: prompt.' });
        }

        const completion = await openai.chat.completions.create({
            model: FINAL_MODEL, 
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt }
            ],
            temperature: 0.7, 
            max_tokens: 3000,
            
            // ⭐ V12.0 關鍵：強制 JSON 輸出格式
            response_format: { type: "json_object" }
        });

        // 成功響應
        res.status(200).json(completion);
    } catch (error) {
        console.error("OpenAI API Error:", error.message || error);
        
        let errorMessage = '未知伺服器錯誤';
        // ... (錯誤處理邏輯)
        if (error.status === 401) {
             errorMessage = 'API Key 驗證失敗 (401)。請檢查 Vercel 環境變數。';
        } else if (error.message) {
             errorMessage = error.message;
        }

        res.status(500).json({ 
            detail: `伺服器處理失敗：${errorMessage}`, 
            error: error.message || 'Unknown error' 
        });
    }
}
