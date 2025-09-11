// /api/analyze.js  —— 乾淨輸出版（只回傳 text，結尾含 ```json 區塊）
// 適用：Vercel Serverless / Node 18+

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // 1) 檢查環境變數
    if (!process.env.OPENAI_API_KEY) {
      console.error("ENV ❌ : OPENAI_API_KEY missing");
      return res.status(500).json({
        error: "missing_env",
        detail:
          "OPENAI_API_KEY not set in Vercel. Add it in Project → Settings → Environment Variables, then Redeploy.",
      });
    }

    // 2) 解析輸入
    const { aBeast, aKin, bBeast, bKin, context } = req.body ?? {};
    if (!aBeast || !aKin || !bBeast || !bKin || !context) {
      return res.status(400).json({
        error: "missing_fields",
        need: ["aBeast", "aKin", "bBeast", "bKin", "context"],
      });
    }

    // 3) Prompt（要求固定輸出，並強制附帶 JSON 區塊）
    const system = `你是「六獸六親分析器」。請用中立、務實、可行的建議語氣，輸出結構化結果，字數精煉。六獸：青龍/朱雀/勾陳/螣蛇/白虎/玄武；六親：父母/兄弟/子孫/妻財/官鬼。
六維分數鍵：fit, comm, pace, account, trust, innov（0–100）。
輸出一定要包含結尾的 \`\`\`json 區塊（只含 scores 與 tags）。`;

    const user = `我方：${aBeast}×${aKin}
對方：${bBeast}×${bKin}
情境：${context}

請依下列格式輸出（保留段落編號與小標）：
1) 個性描述（各2–3句）
2) 衝突熱點（≤3 點）
3) 協調策略：短期3條／長期3條（具體可操作）
4) 六維度分數解讀（fit, comm, pace, account, trust, innov；每維一句）
5) JSON：
\`\`\`json
{
  "scores": {
    "fit": 0, "comm": 0, "pace": 0, "account": 0, "trust": 0, "innov": 0
  },
  "tags": ["三到五個重點標籤"]
}
\`\`\`
請務必提供有效的 JSON（鍵名與範圍正確），且不要在 JSON 外多加註解。`;

    // 4) 呼叫 OpenAI Responses API
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        // 你可以視需要調整 temperature
        temperature: 0.9,
        input: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error("OPENAI ❌ :", errText);
      return res.status(500).json({ error: "openai_failed", detail: errText });
    }

    const data = await r.json();

    // 5) 只抽出純文字結果（兼容 Responses API 的 output 結構）
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
      // 安全退路：仍找不到就回原始資料（避免空白）
      text = JSON.stringify(data, null, 2);
    }

    // 6) 回傳乾淨 payload：前端只會拿到 text
    return res.status(200).json({ text });
  } catch (e) {
    console.error("SERVER ❌ :", e);
    return res.status(500).json({ error: "server_error", detail: String(e) });
  }
}
