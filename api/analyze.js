// ==========================
//    文件：api/analyze.js  （加入十二地支；只回傳 text）
// ==========================
// 引入 OpenAI 客戶端庫
import OpenAI from 'openai'; // 使用 ESM 語法，如果您的環境是 CommonJS，請改為 const OpenAI = require('openai');

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // 檢查 API Key 是否設置
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY environment variable is not set.");
      return res.status(500).json({ error: "missing_env", detail: "OPENAI_API_KEY not set" });
    }

    // 初始化 OpenAI 客戶端
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { mode, aBeast, aKin, aBranch, bBeast, bKin, bBranch, context, sexDetail } = req.body ?? {};

    // 根據模式調整驗證邏輯
    let missingFields = [];
    if (!aBeast) missingFields.push("aBeast");
    if (!aKin) missingFields.push("aKin");
    if (!aBranch) missingFields.push("aBranch");
    if (!context) missingFields.push("context");

    if (mode === 'dual') {
        if (!bBeast) missingFields.push("bBeast");
        if (!bKin) missingFields.push("bKin");
        if (!bBranch) missingFields.push("bBranch");
    }
    // 注意：sexDetail 是可選的，不作為必須驗證字段

    if (missingFields.length > 0) {
      console.warn("Missing fields in request body:", missingFields);
      return res.status(400).json({
        error: "missing_fields",
        need: missingFields,
      });
    }

    // 調整 system prompt
    const system = `你是「六獸六親×地支分析器」。語氣務實、中立、具體。六獸：青龍/朱雀/勾陳/螣蛇/白虎/玄武；六親：父母/兄弟/子孫/妻財/官鬼；十二地支：子丑寅卯辰巳午未申酉戌亥。\n\n根據分析模式：\n- 若為「單人分析」模式，僅描述該人格特質，無需比較或互動建議，也無需提供六維度分數 (scores 留空或為 null)。\n- 若為「雙人分析」模式，則分析雙方互動，並提供六維度分數。\n- 若情境為「性愛」且有提供深入分析細節，請盡可能結合細節進行更具體的分析，包括情境氛圍、姿勢建議、調情對話等。在提供這些敏感內容時，請保持專業、尊重的語氣，並遵守OpenAI的內容使用政策，避免生成明確的色情或不適宜內容。建議以引導、暗示或抽象描述為主，而非直接露骨的描寫。\n\n輸出最後一定附上有效的\`\`\`json 區塊（只含 scores 與 tags）。在單人模式下，scores 可以為 null 或全為 0。`;

    // 動態生成 user prompt
    let user = '';
    if (mode === 'single') {
        user += `單人分析：\n我方：${aBeast}×${aKin}×${aBranch}\n情境：${context}\n\n`;
        user += `請依下列格式輸出：\n1) 個性描述（該人格特質的2–3句描述）\n2) 面對此情境的應對方式（2–3點具體建議）\n3) JSON：\n\`\`\`json\n{\n  \"scores\": null,\n  \"tags\": [\"三到五個重點標籤\"]\n}\n\`\`\`\n`;
    } else { // dual mode
        user += `雙人分析：\n我方：${aBeast}×${aKin}×${aBranch}\n對方：${bBeast}×${bKin}×${bBranch}\n情境：${context}\n\n`;
        user += `請依下列格式輸出（保留段落編號與小標）：\n1) 個性描述（各2–3句）\n2) 衝突熱點（≤3 點）\n3) 協調策略：短期3條／長期3條（具體可操作）\n4) 六維度分數解讀（fit, comm, pace, account, trust, innov；每維一句）\n5) JSON：\n\`\`\`json\n{\n  \"scores\": {\n    \"fit\": 0, \"comm\": 0, \"pace\": 0, \"account\": 0, \"trust\": 0, \"innov\": 0\n  },\n  \"tags\": [\"三到五個重點標籤\"]\n}\n\`\`\`\n`;
    }

    // 添加性愛深入分析的細節
    if (context === '性愛' && sexDetail) {
        user += `\n請特別針對性愛情境，結合以下深入分析細節提供建議：『${sexDetail}』。具體描述性愛情境的氛圍、可能的姿勢引導或調情對話建議，但請注意以引導、暗示或抽象描述為主，避免直接露骨的描寫。`;
    }

    user += `請務必提供有效 JSON（鍵名/範圍正確），且不要在 JSON 外多加註解。`;

    // 使用 OpenAI 官方客戶端發送請求
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo", // 您指定的模型
      temperature: 0.9,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
    });

    let text = completion.choices?.[0]?.message?.content;
    if (!text) {
        console.warn("No content received from OpenAI, raw response:", completion);
        text = "未能從 OpenAI 獲取內容。"; // Fallback message
    }

    return res.status(200).json({ text });

  } catch (e) {
    // 更詳細的錯誤日誌
    console.error("Server error:", e);
    // 判斷是否為 OpenAI API 相關錯誤
    if (e instanceof OpenAI.APIError) {
        console.error("OpenAI API Error details:", e.status, e.message, e.code, e.type);
        return res.status(e.status || 500).json({
            error: "openai_api_failed",
            detail: e.message,
            code: e.code,
            type: e.type,
            param: e.param
        });
    }
    return res.status(500).json({ error: "server_error", detail: String(e) });
  }
}
