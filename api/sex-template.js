// /api/sex-template.js —— 正式版
// 功能：根據 六獸 × 六親 × 地支 × 情境，呼叫 OpenAI Responses API 產生情境模板

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // 1) 檢查環境變數
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "missing_env",
        detail:
          "OPENAI_API_KEY not set in Vercel. Add it in Project → Settings → Environment Variables, then Redeploy.",
      });
    }

    // 2) 解析輸入
    const { aBeast, aKin, aBranch, bBeast, bKin, bBranch, context } = req.body ?? {};
    if (!aBeast || !aBranch || !context) {
      return res.status(400).json({
        error: "missing_fields",
        need: ["aBeast", "aBranch", "bBeast (optional)", "bBranch (optional)", "context"],
      });
    }

    // 3) Prompt 設定
    const system = `你是「六獸 × 六親 × 地支性愛情境模板生成器」。
請用中立、結構化、偏向敘事和建議的語氣，生成職場或情感互動模板。
避免輸出 HTML 表單，只能輸出排版用的文字和清單。`;

    const user = `組合：
我方：${aBeast}${aKin ? "×" + aKin : ""}×${aBranch}
${bBeast ? `對方：${bBeast}${bKin ? "×" + bKin : ""}×${bBranch}` : "（單人）"}
情境：${context}

請依下列格式輸出：
• 標題（簡短描述）
• 情感氛圍（2–3 句）
• 互動模式（條列 2–3 點）
• 潛在雷點（條列 ≤2 點）
• 劇本風格推薦（條列 2–3 條）
• 溝通與照護（條列 2–3 條）

輸出應該簡潔、可直接顯示，避免程式碼區塊或 JSON。`;

    // 4) 呼叫 OpenAI Responses API
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.8,
        input: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      return res.status(500).json({ error: "openai_failed", detail: errText });
    }

    const data = await r.json();

    // 5) 抽出純文字
    let text = data.output_text;
    if (!text && Array.isArray(data.output)) {
      text = data.output
        .map((o) =>
          Array.isArray(o.content)
            ? o.content.map((c) => c.text || "").join("\n")
            : ""
        )
        .join("\n")
        .trim();
    }
    if (!text) {
      text = JSON.stringify(data, null, 2); // fallback
    }

    // 6) 回傳
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e) });
  }
}
