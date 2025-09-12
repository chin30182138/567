// api/analyze.js  —— Vercel Serverless Function (Node 18+)
const MODEL = "gpt-4.1-mini-2025-04-14";

// 小工具：安全讀 body（有時候是字串、有時已被框架 parse）
async function readJson(req) {
  try {
    if (req.body && typeof req.body === "object") return req.body;
    if (req.body && typeof req.body === "string") return JSON.parse(req.body);
    // Vercel Node API 也可用 stream 方式讀
    let raw = "";
    for await (const chunk of req) raw += chunk;
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    throw new Error("Invalid JSON body");
  }
}

function buildPrompt(input) {
  const { aBeast, aKin, aBranch, bBeast, bKin, bBranch, context, depth } = input;
  const isSex = /性愛|性關係|姿勢|親密|房事/i.test(context || "");
  const wantDeep = depth === "deep" || isSex;

  const system = `你是「六獸六親×地支分析器」。語氣務實、中立、尊重界線；
避免露骨或未成年/違法內容。輸出最後務必附上有效的 \`\`\`json 區塊，只含：
{ "scores": { "fit":0,"comm":0,"pace":0,"account":0,"trust":0,"innov":0 }, "tags": ["..."] }`;

  const deepBlocks = wantDeep
    ? `
6) 姿勢與情境建議（安全不露骨）：
- 依「身高差/柔軟度/體能」給 2–3 款姿勢（重舒適與護理），附適用條件與地雷。
- 情境設計（燈光、音樂、節奏與停頓 cue），含同意與安全詞建議。
- 事後照護：補水、擁抱、回饋（各 1–2 句）。

7) 雙方界線與安全清單：
- 必做/可做/不做（各 2–3 點）。
- 風險提醒與替代方案。`
    : ``;

  const user = `我方：${aBeast}×${aKin}×${aBranch}
對方：${bBeast}×${bKin}×${bBranch}
情境：${context}
深入模式：${wantDeep ? "ON" : "OFF"}

請依下列格式輸出（保留段落編號與小標）：
1) 個性描述（各2–3句）
2) 衝突熱點（≤3 點）
3) 協調策略：短期3條／長期3條（具體可操作）
4) 六維度分數解讀（fit, comm, pace, account, trust, innov；每維一句）
5) 互動 Playbook（5 步驟，像 SOP；包含溝通提示語）
${deepBlocks}
8) JSON：
\`\`\`json
{
  "scores": { "fit": 0, "comm": 0, "pace": 0, "account": 0, "trust": 0, "innov": 0 },
  "tags": ["三到五個重點標籤"]
}
\`\`\`
限制：避免露骨描述，採安全、舒適、雙方同意的指引；若資訊不足以 {變數} 標示。`;

  return { system, user };
}

module.exports = async (req, res) => {
  // 允許 POST；其他阻擋
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: { message: "Method Not Allowed" } });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: { message: "Missing OPENAI_API_KEY" } });
    }

    const body = await readJson(req);
    const {
      aBeast, aKin, aBranch,
      bBeast, bKin, bBranch,
      context, depth
    } = body || {};

    // 基本檢查，避免前端忘了帶欄位時直接炸掉
    const must = [aBeast, aKin, aBranch, bBeast, bKin, bBranch, context];
    if (must.some(v => !v || typeof v !== "string" || !v.trim())) {
      return res.status(400).json({ error: { message: "Missing required fields" } });
    }

    const { system, user } = buildPrompt({ aBeast, aKin, aBranch, bBeast, bKin, bBranch, context, depth });

    // 呼叫 OpenAI Responses API（用 fetch，無需安裝 SDK）
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        input: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: 0.9,
      }),
    });

    const rawText = await r.text();
    let j;
    try { j = JSON.parse(rawText); } catch (_) { j = null; }

    if (!r.ok) {
      const msg = j?.error?.message || rawText || `HTTP ${r.status}`;
      return res.status(r.status).json({ error: { message: msg } });
    }

    // 兼容 Responses 的多段輸出結構
    let text = j?.text;
    if (!text && Array.isArray(j?.output)) {
      text = j.output.map(o => (o.content || [])
        .map(c => c.text || "")
        .join("\n")).join("\n");
    }
    if (!text) text = rawText; // 最後兜底

    return res.status(200).json({ text });
  } catch (err) {
    // 統一兜底，避免「FUNCTION_INVOCATION_FAILED」
    return res.status(500).json({
      error: { message: (err && err.message) ? err.message : String(err) }
    });
  }
};
