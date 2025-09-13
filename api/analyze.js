// /api/analyze.js  —— 乾淨輸出版（加入十二地支；只回傳 text，結尾含 ```json 區塊）
// 適用：Vercel Serverless / Node 18+

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

    // 2) 解析輸入（含地支）
    const { aBeast, aKin, aBranch, bBeast, bKin, bBranch, context } = req.body ?? {};
    if (!aBeast || !aKin || !aBranch || !bBeast || !bKin || !bBranch || !context) {
      return res.status(400).json({
        error: "missing_fields",
        need: ["aBeast", "aKin", "aBranch", "bBeast", "bKin", "bBranch", "context"],
      });
    }

    // 3) Prompt（要求固定輸出，並強制附帶 JSON 區塊）
    const system = `你是「六獸六親×地支分析器」。請用中立、務實、可行的建議語氣，輸出結構化結果，字數精煉。\n六獸：青龍/朱雀/勾陳/螣蛇/白虎/玄武；六親：父母/兄弟/子孫/妻財/官鬼；\n十二地支：子丑寅卯辰巳午未申酉戌亥。\n六維分數鍵：fit, comm, pace, account, trust, innov（0–100）。\n輸出最後一定要包含有效的 \`\`\`json 區塊（只含 scores 與 tags）。`;

    const user = `我方：${aBeast}×${aKin}×${aBranch}\n對方：${bBeast}×${bKin}×${bBranch}\n情境：${context}\n\n請依下列格式輸出（保留段落編號與小標）：\n1) 個性描述（各2–3句）\n2) 衝突熱點（≤3 點）\n3) 協調策略：短期3條／長期3條（具體可操作）\n4) 六維度分數解讀（fit, comm, pace, account, trust, innov；每維一句）\n5) JSON：\n\`\`\`json\n{\n  \"scores\": {\n    \"fit\": 0, \"comm\": 0, \"pace\": 0, \"account\": 0, \"trust\": 0, \"innov\": 0\n  },\n  \"tags\": [\"三到五個重點標籤\"]\n}\n\`\`\`\n請務必提供有效 JSON（鍵名與範圍正確），且不要在 JSON 外多加註解。`;

    // 4) 呼叫 OpenAI Responses API
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

    // 5) 只抽出純文字結果（兼容 Responses API 結構）
    let text = data.output_text;
    if (!text && Array.isArray(data.output)) {
      text = data.output
        .map((o) => (Array.isArray(o.content) ? o.content.map((c) => c.text || "").join("\n") : ""))
        .join("\n")
        .trim();
    }
    if (!text) {
      text = JSON.stringify(data, null, 2); // safety fallback
    }

    // 6) 回傳乾淨 payload：前端只會拿到 text
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e) });
  }
}
