// Vercel 專案 -> /api/analyze.js (V16.0 最終極簡測試版)

// **注意：由於我們刪除了 package.json，Vercel 需手動建構安裝 openai**
const OpenAI = require('openai'); 

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    // 移除 timeout 設置，讓 Vercel 預設處理
});

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt } = request.body;

    // ** 這是極簡測試，只要求 AI 輸出一個簡單結果 **
    try {
        const completion = await openai.chat.completions.create({
            // ** 升級到 gpt-4o 終結超時和格式問題 **
            model: "gpt-4o", 
            messages: [
                {
                    role: "system",
                    content: "你是一位專門回覆「測試成功」的助手。",
                },
                {
                    role: "user",
                    content: "請確認 API 連線是否正常，並回覆「連線成功，分析功能已就緒。」",
                }
            ],
            temperature: 0,
            max_tokens: 50, // 只要求短結果，避免任何超時
        });

        // 如果成功，返回一個簡單的 OK 響應
        return response.status(200).json({ 
            success: true,
            message: "API 成功連線並取得回應",
            test_response: completion.choices[0].message.content
        });

    } catch (error) {
        console.error('Final Test Error:', error);
        
        // 捕獲所有錯誤
        return response.status(500).json({ 
            error: 'FINAL_FAILURE_POINT', 
            detail: error.message || 'Vercel 函數執行中斷，無法連線或依賴未載入。' 
        });
    }
}
