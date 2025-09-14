// /api/analyze.js —— 穩健版（支援單人/雙人；可選「性愛情境深入分析」；只回傳 text，結尾含 ```json 區塊）
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
        detail:
          "OPENAI_API_KEY not set in Vercel. Add it in Project → Settings → Environment Variables, then Redeploy.",
      });
    }

    // 2) 解析輸入（加入 mode 與 性愛分析欄位）
    const {
      mode = "single",
      aBeast,
      aKin,
      aBranch,
      bBeast,
      bKin,
      bBranch,
      context = "",
      // ✅ 新增：性愛模組
      sexDetail = false, // 布林：是否勾選性愛情境深入分析
      sexTags = [], // 陣列：細項偏好（例如：前奏與默契、博弈與風險、溫柔引導…）
    } = req.body ?? {};

    // 基本欄位檢查：單人一定要有 A 組；雙人要 A + B 組
    const missingA = !aBeast || !aKin || !aBranch;
    const missingB = mode === "double" && (!bBeast || !bKin || !bBranch);

    if (missingA || missingB) {
      return res.status(400).json({
        error: "missing_fields",
        need:
          mode === "double"
            ? ["aBeast", "aKin", "aBranch", "bBeast", "bKin", "bBranch"]
            : ["aBeast", "aKin", "aBranch"],
      });
    }

    // 3) Prompt（固定要求文末輸出 ```json 區塊；若開啟性愛模組，會多一節）
    const system = `你是「六獸六親×地支分析器」。請用中立、務實、可行的建議語氣，輸出結構化結果，字數精煉。
六獸：青龍/朱雀/勾陳/螣蛇/白虎/玄武；六親：父母/兄弟/子孫/妻財/官鬼；
十二地支：子丑寅卯辰巳午未申酉戌亥。
六維分數鍵：fit, comm, pace, account, trust, innov（0–100）。
輸出最後一定要包含有效的 \`\`\`json 區塊（只含 scores 與 tags）。`;

    const head = `我方：${aBeast}×${aKin}×${aBranch}`;
    const other =
      mode === "double"
        ? `對方：${bBeast}×${bKin}×${bBranch}`
        : `對方：無（單人模式）`;

    // ✅ 若有勾選性愛分析，補一段情境說明給模型
    const sexBlock = sexDetail
      ? `\n【性愛情境偏好】已勾選：${
          Array.isArray(sexTags) && sexTags.length
            ? sexTags.join("、")
            : "（未選細項）"
        }。
請以「安全、尊重、界線清楚、非露骨」的語氣，給出具體可行的互動建議（例如：前奏與默契／節奏與呼吸對齊／界線與停損詞／善後與回饋），可依六獸性格差異做微調。`
      : "";

    // 根據是否開啟性愛模組，動態編號章節
    const baseSections = [
      "1) 個性描述（各2–3句）",
      "2) 衝突熱點（≤3 點）",
      "3) 協調策略：短期3條／長期3條（具體可操作；若單人模式請改為「自我調整策略：短期3條／長期3條」）",
      "4) 六維度分數解讀（fit, comm, pace, account, trust, innov；每維一句；單人模式請視為對自我關係/工作互動的評估）",
    ];
    const sexSection =
      "5) 性愛情境深入分析（非露骨；包含前奏與默契／節奏與同步／界線與停損詞／善後與回饋；若有 sexTags 請優先覆蓋）";
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
請務必提供有效 JSON（鍵名與範圍正確），且不要在 JSON 外多加註解。`;

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

    // 5) 穩健抽取純文字（兼容 Responses API 多種輸出形態）
    const pickText = (payload) => {
      if (!payload) return "";
      if (typeof payload.output_text === "string" && payload.output_text.trim()) {
        return payload.output_text.trim();
      }
      // 新版 Responses：output -> [{ content: [{ type:"output_text", text:"..."}, ...] }, ...]
      if (Array.isArray(payload.output)) {
        const parts = payload.output.flatMap((o) =>
          Array.isArray(o.content)
            ? o.content.map((c) => (c && typeof c.text === "string" ? c.text : "")).filter(Boolean)
            : []
        );
        const joined = parts.join("\n").trim();
        if (joined) return joined;
      }
      // 安全備援：序列化整包回傳（方便偵錯）
      return JSON.stringify(payload, null, 2);
    };

    const text = pickText(data);

    // 6) 回傳：只給 text（前端可直接把 text 丟到 <pre> 顯示，或自行擷取 ```json 區塊）
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e) });
  }
}
