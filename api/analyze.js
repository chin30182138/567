// api/analyze.js - Vercel Serverless Function (V11.0 - 官方套件 + GPT-4o 鎖定)
import OpenAI from 'openai';

// 初始化 OpenAI 客戶端，它會自動讀取 Vercel 環境變數 OPENAI_API_KEY
const openai = new OpenAI(); 

// 確保系統指令的強度 (與您的原始指令一致)
const SYSTEM_PROMPT = "你是一位精通中國古代《神獸七十二型人格》理論的資深分析師。你的任務是根據用戶提供的『六獸-六親-地支』組合和情境，輸出深度且具體的分析報告。報告必須專業、嚴謹，並且字數至少 800 字。對於雙人模式（特別是性愛），報告必須充滿細節和針對性建議，絕對不能保守或簡略。**輸出格式嚴格遵循 markdown，並且報告結尾必須包含一個獨立的 JSON 區塊，列出六維度分數和標籤。**"

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { prompt } = req.body;
        
        if (!prompt) {
             return res.status(400).json({ error: 'Missing required parameter: prompt.' });
        }

        // ⭐ V11.0 核心修正：強制鎖定為 GPT-4o
        // 這是確保穩定、完美 JSON 輸出的關鍵。
        const FINAL_MODEL = 'gpt-4o'; 
        
        // 使用官方套件發起對 OpenAI API 的請求
        const completion = await openai.chat.completions.create({
            model: FINAL_MODEL, 
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt }
            ],
            temperature: 0.7, 
            max_tokens: 3000, 
        });

        // 成功響應
        res.status(200).json(completion);
    } catch (error) {
        // 處理 API 請求失敗
        console.error("OpenAI API Error:", error.message || error);
        
        let errorMessage = '未知伺服器錯誤';
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
