// api/analyze.js - Vercel Serverless Function (V10.4 極限速度與JSON強化版)
import OpenAI from 'openai';

// 確保 Vercel 環境變數 OPENAI_API_KEY 已設定
const openai = new OpenAI(); 

// Vercel 預設限制 10 秒。
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { model, prompt, payload } = req.body;
        
        // 為了確保速度和一致性，強制使用 gpt-3.5-turbo
        const finalModel = 'gpt-3.5-turbo'; 
        
        let systemContent = "你是一位精通易學、占卜、命理的專業顧問。你的分析必須專業、深入。";
        
        // V10.4 核心修正：要求雙人模式必須返回嚴格 JSON，並放在文字前面。
        if (payload && payload.mode === 'dual') {
            systemContent += " **你的首要任務是輸出分析結果。如果這是雙人模式分析，你必須在報告的文字描述_之前_，先嚴格輸出一個符合 JSON 格式的程式碼區塊 (```json ... ```)，內含六維度分數 (fit, comm, pace, account, trust, innov) 和標籤 (tags)。**";
        }

        // 發起對 OpenAI API 的請求
        const completion = await openai.chat.completions.create({
            model: finalModel, 
            messages: [
                { role: "system", content: systemContent },
                { role: "user", content: prompt }
            ],
            temperature: 0.7, // 維持中等創造力
        });

        // 成功響應
        res.status(200).json(completion);
    } catch (error) {
        // 處理 API 請求失敗，這是前端會看到的錯誤源頭
        console.error("OpenAI API Error:", error.message || error);
        
        let errorMessage = '未知伺服器錯誤';
        if (error.status === 401) {
             errorMessage = 'API Key 驗證失敗 (401)。請檢查 Vercel 環境變數。';
        } else if (error.status === 400 && error.message.includes('rate limit')) {
             errorMessage = 'API 請求頻率過高 (400)。';
        } else if (error.message) {
             errorMessage = error.message;
        }

        res.status(500).json({ 
            detail: `伺服器處理失敗：${errorMessage}`, 
            error: error.message || 'Unknown error' 
        });
    }
}
