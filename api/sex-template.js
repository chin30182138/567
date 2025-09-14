// /api/sex-template.js —— 依「我方獸支 × 對方獸支」產生【非露骨】性愛深入分析模板（純 JSON）
// 適用：Next.js pages/api / Vercel Serverless / Node 18+

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "missing_env",
        detail: "OPENAI_API_KEY not set",
      });
    }

    const { aBeast, aBranch, bBeast, bBranch } = req.body ?? {};
    if (!aBeast || !aBranch) {
      return res.status(400).json({ error: "missing_fields", need: ["aBeast", "aBranch"] });
    }
    // 單人允許沒有 B；雙人需有 B
    const isDual = !!(bBeast && bBranch);

    const pairKey = isDual ? `${aBeast}${aBranch}×${bBeast}${bBranch}` : "default";

    const system = `你是一位成人關係教育的內容設計師。請以「健康、尊重、非露骨」標準，產生性愛互動的情境模板。
產出必須著重：同意與界線、安全詞、節奏配合、溝通、氛圍與事後照護（aftercare）。禁止任何露骨性描寫、體位分解、身體細節、器具操作或未成年人相關內容。`;

    const user = `請根據以下組合，回傳一段**有效 JSON**（無多餘文字、無註解）：
- 我方：${aBeast}×${aBranch}
- 對方：${isDual ? `${bBeast}×${bBranch}` : "（單人／未指定）"}

JSON 結構如下（僅此結構，不要多欄位）：
{
  "key": "青龍申×青龍子 或 default",
  "title": "一句話主題",
  "index": "互動指數：X.X/10（簡短理由）",
  "modes": ["互動模式 1", "互動模式 2"],
  "hotspots": ["潛在雷點 1", "潛在雷點 2"],
  "scripts": ["劇本風格 1", "劇本風格 2"],
  "care": ["溝通/界線/照護建議 1", "溝通/界線/照護建議 2"]
}`;

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
          { role: "user", content: user }
        ]
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      return res.status(500).json({ error: "openai_failed", detail: errText });
    }

    const data = await r.json();

    // 抽出純文字
    const pickText = (payload) => {
      if (typeof payload.output_text === "string" && payload.output_text.trim()) {
        return payload.output_text.trim();
      }
      if (Array.isArray(payload.output)) {
        const parts = payload.output.flatMap(o =>
          Array.isArray(o.content) ? o.content.map(c => c.text ?? "").filter(Boolean) : []
        );
        const joined = parts.join("\n").trim();
        if (joined) return joined;
      }
      return "";
    };

    const text = pickText(data);
    // 嚴格只接受 JSON
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      // 若模型沒回純 JSON，就包起來避免壞格式
      json = { key: pairKey, title: "一般互動模板", index: "互動指數：8.0/10", modes: [], hotspots: [], scripts: [], care: [] };
    }

    // 最終回傳
    return res.status(200).json({ template: json });
  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e) });
  }
}
