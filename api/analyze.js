// ==========================
//    文件：api/analyze.js
//    功能：單人/雙人分析，支援十二地支，必填 context
// ==========================
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "missing_env", detail: "OPENAI_API_KEY not set" });
    }

    // 取得前端傳入資料
    const {
      mode,
      aBeast, aKin, aBranch,
      bBeast, bKin, bBranch,
      context,
      sexDetail
    } = req.body ?? {};

    // ========== 必填欄位檢查 ==========
    let missingFields = [];
    if (!aBeast) missingFields.push("aBeast");
    if (!aKin) missingFields.push("aKin");
    if (!aBranch) missingFields.push("aBranch");
    if (!context) missingFields.push("context");

    if (mode === "dual") {
      if (!bBeast) missingFields.push("bBeast");
      if (!bKin) missingFields.push("bKin");
      if (!bBranch) missingFields.push("bBranch");
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "missing_fields",
        need: missingFields,
      });
    }

    // ========== 系統提示 ==========
    const system = `你是「六獸六親×地支分析器」。語氣務實、中立、具體。六獸：青龍/朱雀/勾陳/螣蛇/白虎/玄武；六親：父母/兄弟/子孫/妻財/官鬼；十二地支：子丑寅卯辰巳午未申酉戌亥。

分析模式：
- 單人分析：描述人格特質 + 應對方式（無需比較，不要給六維度分數）。
- 雙人分析：比較雙方互動，並提供六維度分數。
- 若情境為「性愛」且有 sexDetail，請適度結合細節，使用引導/暗示/抽象描述，避免露骨。

最後輸出一定要包含 JSON 區塊（只含 scores 與 tags）。`;

    // ========== 使用者提示 ==========
    let user = "";
    if (mode === "single") {
      user += `單人分析：
我方：${aBeast}×${aKin}×${aBranch}
情境：${context}

請依下列格式輸出：
1) 個性描述（2–3句）
2) 面對此情境的建議（2–3點）
3) JSON：
\`\`\`json
{
  "scores": null,
  "tags": ["三到五個重點標籤"]
}
\`\`\`
`;
    } else {
      user += `雙人分析：
我方：${aBeast}×${aKin}×${aBranch}
對方：${bBeast}×${bKin}×${bBranch}
情境：${context}

請依下列格式輸出：
1) 個性描述（各2–3句）
2) 衝突熱點（最多3點）
3) 協調策略：短期3條／長期3條
4) 六維度分數解讀（fit, comm, pace, account, trust, innov）
5) JSON：
\`\`\`json
{
  "scores": {
    "fit": 0, "comm": 0, "pace": 0, "account": 0, "trust": 0, "innov": 0
  },
  "tags": ["三到五個重點標籤"]
}
\`\`\`
`;
    }

    if (context === "性愛" && sexDetail) {
      user += `\n性愛補充細節：${sexDetail}\n請保持專業語氣，用引導/暗示描述氛圍與互動建議。`;
    }

    // ========== 呼叫 OpenAI API ==========
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",   // 建議用 gpt-4o-mini，效能與價格都佳
        temperature: 0.8,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      return res.status(500).json({ error: "openai_failed", detail: errText });
    }

    const data = await r.json();
    let text = data.choices?.[0]?.message?.content;
    if (!text) text = JSON.stringify(data, null, 2);

    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e) });
  }
}
