// /api/analyze.js —— 強化版（支援單人/雙人；性愛章節完整；只回傳 text，結尾含 ```json 區塊）
// 適用：Next.js pages/api / Vercel Serverless / Node 18+

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // 1) 環境變數
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "missing_env",
        detail: "OPENAI_API_KEY not set in Vercel. Add it in Project → Settings → Environment Variables, then Redeploy.",
      });
    }

    // 2) 解析輸入
    const {
      mode = "single",
      aBeast, aKin, aBranch,
      bBeast, bKin, bBranch,
      context = "",
      sexDetail = false,
      sexTags = []
    } = req.body ?? {};

    // 基本檢查
    const missingA = !aBeast || !aKin || !aBranch;
    const missingB = mode === "double" && (!bBeast || !bKin || !bBranch);
    if (missingA || missingB) {
      return res.status(400).json({
        error: "missing_fields",
        need: mode === "double"
          ? ["aBeast", "aKin", "aBranch", "bBeast", "bKin", "bBranch"]
          : ["aBeast", "aKin", "aBranch"],
      });
    }

    // 3) Prompt
    const system = `你是「六獸六親×地支分析器」。請用中立、務實、具體可行的語氣，輸出結構化結果。
輸出最後必須包含有效的 \`\`\`json 區塊（只含 scores 與 tags）。`;

    const head = `我方：${aBeast}×${aKin}×${aBranch}`;
    const other = mode === "double"
      ? `對方：${bBeast}×${bKin}×${bBranch}`
      : `對方：無（單人模式）`;

    // 性愛分析區塊
    const sexBlock = sexDetail
      ? `\n【性愛情境深入分析】已勾選：${
          Array.isArray(sexTags) && sexTags.length
            ? sexTags.join("、")
            : "（未選細項）"
        }
請務必依以下章節生成：
第四章：性愛場景與角色扮演
- 禁忌場景（地下賭場、露天泳池、摩天大樓、試衣間）
- 角色扮演（權力遊戲、心理掌控、懸疑驚悚情境）

第五章：性愛技巧與體位推薦
- 深度擁抱交合
- 角色扮演與語音催眠
- 野性攻防與極端快感

第六章：性愛玩具與情境設置
- 震動棒與束縛配件
- 感官剝奪與心理控制工具

第七章：六獸X地支全劇本合集
- 依不同六獸與地支組合，提供完整的性愛情境與劇本
- 包含角色扮演、場景設置、對話引導、性愛技巧

🔥 最終要寫成「劇本參考指南」風格，強調：安全、尊重、界線清楚，避免過於露骨字眼。`
      : "";

    // 動態章節
    const baseSections = [
      "1) 個性描述（各2–3句）",
      "2) 衝突熱點（≤3 點）",
      "3) 協調策略：短期3條／長期3條",
      "4) 六維度分數解讀（fit, comm, pace, account, trust, innov）",
    ];
    const sexSection = sexDetail ? "5) 性愛情境深入分析（依章節輸出）" : "";
    const jsonSection = sexDetail ? "6) JSON：" : "5) JSON：";

    const formatLines = sexDetail
      ? [...baseSections, sexSection, jsonSection]
      : [...baseSections, jsonSection];

    const user = `${head}
${other}
情境：${context || "（無）"}${sexBlock}

請依下列格式輸出（保留段落編號與小標）：
${formatLines.join("\n")}
\`\`\`json
{
  "scores": {
    "fit": 0, "comm": 0, "pace": 0, "account": 0, "trust": 0, "innov": 0
  },
  "tags": ["三到五個重點標籤"]
}
\`\`\`
`;

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

    // 5) 抽取純文字
    const pickText = (payload) => {
      if (!payload) return "";
      if (typeof payload.output_text === "string" && payload.output_text.trim()) {
        return payload.output_text.trim();
      }
      if (Array.isArray(payload.output)) {
        const parts = payload.output.flatMap((o) =>
          Array.isArray(o.content)
            ? o.content.map((c) => (c && typeof c.text === "string" ? c.text : "")).filter(Boolean)
            : []
        );
        const joined = parts.join("\n").trim();
        if (joined) return joined;
      }
      return JSON.stringify(payload, null, 2);
    };

    const text = pickText(data);

    // 6) 回傳
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e) });
  }
}
