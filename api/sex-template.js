// /api/sex-template.js —— 強制七大段落性愛模板
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
          "OPENAI_API_KEY not set. Add it in Project → Settings → Environment Variables, then Redeploy.",
      });
    }

    const { aBeast, aKin, aBranch, bBeast, bKin, bBranch } = req.body ?? {};
    if (!aBeast || !aKin || !aBranch || !bBeast || !bKin || !bBranch) {
      return res.status(400).json({
        error: "missing_fields",
        need: ["aBeast","aKin","aBranch","bBeast","bKin","bBranch"],
      });
    }

    const system = `你是「六獸六親×地支性愛分析器」。  
必須輸出完整的性愛相容性報告，語氣大膽但專業，保持中文繁體格式。  
每次輸出必須包含下列 **七大段落**，且順序固定：  
1. 標題＋情愛指數（以 0–10，含小數點）  
2. 互動模式（至少 2–3 條）  
3. 雷點分析（至少 2 條）  
4. 最佳性愛劇本推薦（至少 3 條）  
5. 推薦體位（至少 3 條，附中文＋英文體位名）  
6. 推薦玩具（至少 3 條，含情境用途）  
7. 推薦性愛場景（至少 3 條，具體地點或氛圍）  

請務必讓輸出長度至少 400 字，避免過度精簡。`;

    const user = `分析組合：${aBeast}×${aKin}×${aBranch}  ＋  ${bBeast}×${bKin}×${bBranch}  
請輸出完整性愛分析報告，格式用條列或小段落。`;

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.95,
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
    if (!text) text = JSON.stringify(data, null, 2);

    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e) });
  }
}
