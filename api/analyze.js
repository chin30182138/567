// /pages/api/analyze.js —— 最終版（固定章節；性愛章節依你指定的第四～七章；文末必含乾淨 ```json 區塊）

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "missing_env", detail: "OPENAI_API_KEY not set" });

    const {
      mode = "single",
      aBeast = "", aKin = "", aBranch = "",
      bBeast = "", bKin = "", bBranch = "",
      context = "",            // 文字：例如「性愛」
      sexDetail = ""           // 你的前端傳來的偏好字串（例：重點：…；補充：…）
    } = req.body ?? {};

    const isDual = mode === "dual";
    const isSex  = (context?.trim() === "性愛") || (!!sexDetail && String(sexDetail).trim().length > 0);

    // ————— Prompt —————
    const system = `你是嚴謹的「六獸六親×地支」分析助手。輸出使用繁體中文，重實用、可操作、條列清楚。`;
    const head =
`我方：${aBeast} × ${aKin} × ${aBranch}
對方：${isDual ? `${bBeast} × ${bKin} × ${bBranch}` : "（單人模式）"}
情境：${context || "—"}
性愛偏好摘要：${sexDetail || "（無）"}`;

    // 性愛章節（嚴格固定你指定的章節與小項）
    const sexChapters = isSex ? `
【嚴格輸出以下章節；標題與順序不得更動；內容需非露骨、重安全與同意】  
第四章：性愛場景與角色扮演
• 禁忌場景（地下賭場、露天泳池、摩天大樓、試衣間）
• 角色扮演（權力遊戲、心理掌控、懸疑驚悚情境）

第五章：性愛技巧與體位推薦
• 深度擁抱交合
• 角色扮演與語音催眠
• 野性攻防與極端快感

第六章：性愛玩具與情境設置
• 震動棒與束縛配件
• 感官剝奪與心理控制工具

第七章：六獸X地支全劇本合集
• 依不同六獸與地支組合，提供完整的性愛情境與劇本（非露骨）
• 包含角色扮演、場景設置、對話引導、性愛技巧與善後照護

【寫作規則】
- 不得使用露骨字詞；不得描述性器官或明確性行為細節。
- 每一章皆以條列為主；每個小項最少 2–4 點建議；強調溝通、界線、安全詞、風險評估、aftercare。
- 若「性愛偏好摘要」有關鍵字，優先對應到上述各小項中（例如將「重點：…」整合為具體操作建議）。
` : ``;

    const format =
`請依下列格式輸出（段落與編號必保留；若非性愛情境則不輸出第4～7章）：
1) 個性描述（各2–3句）
2) 衝突熱點（≤3 點）
3) ${isDual ? "協調策略：短期3條／長期3條" : "自我調整策略：短期3條／長期3條"}
4) 六維度分數解讀（fit, comm, pace, account, trust, innov；每維一句）
${isSex ? "第五章以前照上；接著輸出第4～7章（見上方章節定義）。" : "（若非性愛則到此）"}
最後務必附上一個乾淨的 \`\`\`json 區塊（僅含 scores/tags；鍵名固定；分數為 0–100 整數）：
\`\`\`json
{
  "scores": { "fit": 0, "comm": 0, "pace": 0, "account": 0, "trust": 0, "innov": 0 },
  "tags": ["三到五個重點標籤"]
}
\`\`\``;

    const user = `${head}\n\n${sexChapters}\n\n${format}`;

    // ————— OpenAI 呼叫（Chat Completions） —————
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.8,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(500).json({ error: "openai_failed", detail: t });
    }

    const data = await r.json();
    const text =
      data?.choices?.[0]?.message?.content?.trim() ||
      data?.choices?.[0]?.text?.trim() ||
      JSON.stringify(data, null, 2);

    // 直接把大綱+章節文本原樣回傳（前端已能抓最後一個 ```json 畫雷達圖）
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e) });
  }
}
