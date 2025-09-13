// ==========================
//    文件：api/analyze.js  （加入十二地支；只回傳 text）
// ==========================
import { Configuration, OpenAIApi } from "openai"; // 引入 OpenAI 庫，如果使用較新的 API，可能需要調整為 import OpenAI from 'openai';

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "missing_env", detail: "OPENAI_API_KEY not set" });
    }

    const { mode, aBeast, aKin, aBranch, bBeast, bKin, bBranch, context, sexDetail } = req.body ?? {};

    // 根據模式調整驗證邏輯
    let missingFields = [];
    if (!aBeast) missingFields.push("aBeast");
    if (!aKin) missingFields.push("aKin");
    if (!aBranch) missingFields.push("aBranch");
    
    // 情境只在 'single' 或 'dual' 模式下是必須的
    if (mode === 'single' || mode === 'dual') {
        if (!context) missingFields.push("context");
    }

    if (mode === 'dual') {
        if (!bBeast) missingFields.push("bBeast");
        if (!bKin) missingFields.push("bKin");
        if (!bBranch) missingFields.push("bBranch");
    }
    // 注意：sexDetail 是可選的，不作為必須驗證字段

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "missing_fields",
        mode: mode, // 加上 mode 方便除錯
        need: missingFields,
      });
    }

    // 初始化 OpenAI 客戶端
    // 根據您實際使用的 OpenAI Library 版本，這裡可能需要調整
    // 如果是新版 (OpenAI v4+):
    // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // 如果是舊版 (OpenAI v3-):
    const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
    const openai = new OpenAIApi(configuration);


    // 調整 system prompt
    const system = `你是「六獸六親×地支分析器」。語氣務實、中立、具體。六獸：青龍/朱雀/勾陳/螣蛇/白虎/玄武；六親：父母/兄弟/子孫/妻財/官鬼；十二地支：子丑寅卯辰巳午未申酉戌亥。\n\n根據分析模式：\n- 若為「個性分析」模式 (personality)，僅描述該人格特質的綜合特性，無需比較、互動建議或情境應對，也無需提供六維度分數 (scores 留空或為 null)。\n- 若為「單人分析」模式 (single)，則分析該人格在特定情境下的應對方式，無需比較或互動建議，也無需提供六維度分數 (scores 留空或為 null)。\n- 若為「雙人分析」模式 (dual)，則分析雙方互動，並提供六維度分數。\n- 若情境為「性愛」且有提供深入分析細節，**你應作為一份專業的性愛劇本指南，結合六獸與地支的特性，來生成情境建議。請參考以下類別來構建你的回覆，以提供完整的性愛情境與劇本：禁忌場景、角色扮演、性愛技巧與體位推薦、性愛玩具與情境設置、對話引導，最終目標是匹配最佳玩法與刺激感。** 在提供這些敏感內容時，請保持專業、尊重、引導性的語氣，並嚴格遵守OpenAI的內容使用政策，避免生成明確的色情或不適宜內容。建議以引導、暗示、抽象描述或劇本情節設定為主，而非直接露骨的描寫。\n\n輸出最後一定附上有效的\`\`\`json 區塊（只含 scores 與 tags）。在「個性分析」和「單人分析」模式下，scores 應為 null 或全為 0。`;

    // 動態生成 user prompt
    let user = '';
    if (mode === 'personality') {
        user += `個性分析：\n我方：${aBeast}×${aKin}×${aBranch}\n\n`;
        user += `請依下列格式輸出：\n1) 該人格特質的綜合描述（5–8句，深入分析其基本性格、優缺點、行為模式）。\n2) 核心價值與驅動力（2–3點）。\n3) JSON：\n\`\`\`json\n{\n  \"scores\": null,\n  \"tags\": [\"三到五個重點標籤\"]\n}\n\`\`\`\n`;
    } else if (mode === 'single') {
        user += `單人分析：\n我方：${aBeast}×${aKin}×${aBranch}\n情境：${context}\n\n`;
        user += `請依下列格式輸出：\n1) 個性描述（該人格特質在面對此情境時的2–3句描述）\n2) 面對此情境的應對方式（3–5點具體建議，可操作性強）\n`;
        // 如果是單人模式下的性愛場景，特別提供劇本引導
        if (context === '性愛' && sexDetail) {
            user += `3) 性愛情境劇本建議：請結合以下深入分析細節『${sexDetail}』，並參考劇本指南的結構，提供適合該人格特質的性愛情境劇本。應包含：禁忌場景建議、角色扮演設定、性愛技巧與體位方向、情境設置與氛圍營造、對話引導。最終目標是匹配最佳玩法與刺激感。`;
        }
        user += `\n4) JSON：\n\`\`\`json\n{\n  \"scores\": null,\n  \"tags\": [\"三到五個重點標籤\"]\n}\n\`\`\`\n`;
    } else { // dual mode
        user += `雙人分析：\n我方：${aBeast}×${aKin}×${aBranch}\n對方：${bBeast}×${bKin}×${bBranch}\n情境：${context}\n\n`;
        user += `請依下列格式輸出（保留段落編號與小標）：\n1) 個性描述（各2–3句）\n2) 衝突熱點（≤3 點）\n3) 協調策略：短期3條／長期3條（具體可操作）\n`;
        // 如果是雙人模式下的性愛場景，特別提供劇本引導
        if (context === '性愛' && sexDetail) {
            user += `4) 性愛情境劇本建議：請結合以下深入分析細節『${sexDetail}』，並參考劇本指南的結構，提供適合雙方互動的性愛情境劇本。應包含：禁忌場景建議、角色扮演設定、性愛技巧與體位方向、情境設置與性愛玩具建議、對話引導。最終目標是匹配雙方最佳玩法與刺激感！`;
            user += `\n5) 六維度分數解讀（fit, comm, pace, account, trust, innov；每維一句）\n6) JSON：\n\`\`\`json\n{\n  \"scores\": {\n    \"fit\": 0, \"comm\": 0, \"pace\": 0, \"account\": 0, \"trust\": 0, \"innov\": 0\n  },\n  \"tags\": [\"三到五個重點標籤\"]\n}\n\`\`\`\n`;
        } else {
            user += `4) 六維度分數解讀（fit, comm, pace, account, trust, innov；每維一句）\n5) JSON：\n\`\`\`json\n{\n  \"scores\": {\n    \"fit\": 0, \"comm\": 0, \"pace\": 0, \"account\": 0, \"trust\": 0, \"innov\": 0\n  },\n  \"tags\": [\"三到五個重點標籤\"]\n}\n\`\`\`\n`;
        }
    }

    user += `請務必提供有效 JSON（鍵名/範圍正確），且不要在 JSON 外多加註解。`;

    const response = await openai.createChatCompletion({ // 這裡也需要根據 OpenAI library 版本調整
        model: "gpt-4-turbo", // 推薦使用更強大的模型處理複雜和敏感情境
        temperature: 0.9,
        messages: [
            { role: "system", content: system },
            { role: "user", content: user }
        ],
    });

    // 從 response 中正確提取文本內容
    let text = response.data.choices?.[0]?.message?.content;
    if (!text) text = JSON.stringify(response.data, null, 2); // Fallback 如果取不到

    return res.status(200).json({ text });
  } catch (e) {
    console.error("API Error:", e.response ? e.response.data : e.message); // 更詳細的錯誤日誌
    return res.status(500).json({ error: "server_error", detail: e.response ? e.response.data : String(e) });
  }
}
