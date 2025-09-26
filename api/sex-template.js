// /api/sex-template.js —— 正式版（使用地支，不用時辰）
// 適用：Vercel Serverless / Node 18+

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "missing_env",
        detail:
          "OPENAI_API_KEY not set in Vercel. Add it in Project → Settings → Environment Variables, then Redeploy.",
      });
    }

    const { aBeast, aBranch, bBeast, bBranch, context, sexDetail } = req.body ?? {};
    if (!aBeast || !aBranch || !context) {
      return res.status(400).json({
        error: "missing_fields",
        need: ["aBeast", "aBranch", "bBeast (optional)", "bBranch (optional)", "context"],
      });
    }

    // 1) System 提示
    const system = `你是「六獸六親×地支性愛模板產生器」。
重點：十二地支必須寫成「子支、丑支、寅支、卯支…」而不是子時、丑時。
輸出請使用條列與小標題，語氣生動，但避免過度冗長。`;

    // 2) User 提示
    const user = `請產生性愛分析模板：

我方：${aBeast} × ${aBranch}支
${bBeast ? `對方：${bBeast} × ${bBranch}支\n` : ""}
情境：${context}
${sexDetail ? `深入分析需求：${sexDetail}` : ""}

請依照下列格式輸出（注意地支要寫「支」而非「時」）：

• 標題  
（舉例：申支火熱交織：朱雀與勾陳的激情融合）

• 情感氛圍  
（2–3 句描述）

• 互動模式  
- 條列 2–3 點

• 潛在雷點  
- 條列 1–2 點

• 劇本風格推薦  
- 條列 2–3 點

• 溝通與照護  
- 條列 2–3 點`;

    // 3) 呼叫 OpenAI
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.9,
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

    // 4) 解析輸出
    let text = data.output_text;
    if (!text && Array.isArray(data.output)) {
      text = data.output
        .map((o) =>
          Array.isArray(o.content) ? o.content.map((c) => c.text || "").join("\n") : ""
        )
        .join("\n")
        .trim();
    }
    if (!text) {
      text = JSON.stringify(data, null, 2); // fallback
    }

    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e) });
  }
}
