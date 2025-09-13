// api/analyze.js —— Vercel Serverless Function（Node 18+）
// 功能：
// - 支援「單方 single」與「雙方 pair」分析
// - 健壯讀取 Body、CORS（含預檢）、30 秒逾時
// - 呼叫 OpenAI Responses API（無需 SDK）
// - 回傳統一格式 { text }，且前端可從 ```json 區塊抓分數/標籤/每日一句
// - 內建自測：GET ?dry=1（假資料），GET ?selftest=1（檢查欄位與模式切換）

const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini-2025-04-14";
const TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 30000);

// CORS 共用
const CORS = {
  "Access-Control-Allow-Origin": process.env.CORS_ALLOW_ORIGIN || "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

// —— 工具：安全讀 body ——
async function readJson(req) {
  try {
    if (req.body && typeof req.body === "object") return req.body;
    if (typeof req.body === "string" && req.body.trim()) return JSON.parse(req.body);
    let raw = "";
    for await (const chunk of req) raw += chunk;
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    throw new Error("Invalid JSON body");
  }
}

// —— 工具：Responses API 文本抽取 ——
function extractTextFromResponse(data, rawFallback) {
  try {
    if (typeof data?.text === "string" && data.text.trim()) return data.text;
    if (Array.isArray(data?.output)) {
      const chunks = [];
      for (const msg of data.output) {
        const arr = msg?.content || [];
        for (const c of arr) if (c?.text) chunks.push(c.text);
      }
      if (chunks.length) return chunks.join("\n");
    }
    if (typeof data?.result === "string" && data.result.trim()) return data.result;
    const guess = data?.choices?.[0]?.message?.content || data?.message || "";
    if (typeof guess === "string" && guess.trim()) return guess;
  } catch (_) {}
  return rawFallback || "";
}

// —— Prompt 組裝 ——
function buildPrompt(input) {
  const { aBeast, aKin, aBranch, bBeast, bKin, bBranch, context, depth, mode } = input;
  const isSex = /性愛|性關係|親密|房事|姿勢|情慾/i.test(context || "");
  const wantDeep = depth === "deep" || isSex;
  const pairMode = mode === 'pair';

  const system = `你是「六獸×六親×地支 分析器」。請用務實、尊重且不露骨的語氣回覆。\n規則：\n- 僅在合意、成年、合法前提下給建議；避免露骨描述。\n- 內容最後務必附上一段有效的 JSON（含 scores/tags/encourage），格式如下：\n{\n  "scores": { "fit":0, "comm":0, "pace":0, "account":0, "trust":0, "innov":0 },\n  "tags": ["..."],\n  "encourage": "15~28 字之內、口語而正向的一句鼓勵話"\n}`;

  const deepBlocks = wantDeep ? `\n${pairMode ? '6) 姿勢與情境建議（安全不露骨）' : '5) 身體與情緒的自我照護建議（安全不露骨）'}：\n- 依「身高差/柔軟度/體能」提供 2–3 個舒適的方向（如：側躺、面對面坐姿、擁抱節奏），附適用條件與需避免的地雷。\n- 情境設計：燈光、音樂節奏、氣味與觸感（材質），以及停頓 cue。\n- 同意流程（若涉及他人）：事前溝通提問範例（各 2 句）、安全詞與支持性語句。\n- 事後照護（aftercare）：補水、擁抱/自我撫觸、回饋（各 1–2 句）。` : "";

  const header = pairMode
    ? `我方：${aBeast}×${aKin}×${aBranch}\n對方：${bBeast}×${bKin}×${bBranch}`
    : `主角：${aBeast}×${aKin}×${aBranch}`;

  const sectionsPair = `請依下列格式輸出（保留段落編號與小標）：\n1) 個性描述（各 2–3 句）\n2) 衝突熱點（≤3 點）\n3) 協調策略：短期 3 條／長期 3 條（具體可操作）\n4) 六維度分數解讀（fit, comm, pace, account, trust, innov；每維 1 句）\n5) 互動 Playbook（5 步驟，像 SOP；含溝通提示語）\n${deepBlocks}\n6) 每天一句鼓勵（15~28 字，口語且正向）\n7) JSON：\n\`\`\`json\n{\n  "scores": { "fit": 0, "comm": 0, "pace": 0, "account": 0, "trust": 0, "innov": 0 },\n  "tags": ["三到五個重點標籤"],\n  "encourage": "一句鼓勵"\n}\n\`\`\``;

  const sectionsSingle = `請依下列格式輸出（保留段落編號與小標）：\n1) 個性基因（六獸×六親×地支帶來的性格傾向，各 2 句）\n2) 盲點與風險（≤3 點）\n3) 行動方案：\n   - 當週習慣（3 條，日常可做）\n   - 職場/人際應對（3 條，具體情境）\n4) 六維度自評建議（fit, comm, pace, account, trust, innov；每維 1 句）\n${deepBlocks}\n5) 每天一句鼓勵（15~28 字，口語且正向）\n6) JSON：\n\`\`\`json\n{\n  "scores": { "fit": 0, "comm": 0, "pace": 0, "account": 0, "trust": 0, "innov": 0 },\n  "tags": ["三到五個重點標籤"],\n  "encourage": "一句鼓勵"\n}\n\`\`\``;

  const user = `${header}\n情境：${context}\n模式：${pairMode ? 'PAIR' : 'SINGLE'}\n深入模式：${wantDeep ? "ON" : "OFF"}\n\n${pairMode ? sectionsPair : sectionsSingle}\n限制：避免露骨與未成年內容；若資訊不足以 {變數} 標示。`;

  return { system, user };
}

module.exports = async (req, res) => {
  // CORS: 預檢
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }

  // 健康檢查 & 自測
  if (req.method === "GET") {
    const info = {
      ok: true,
      model: MODEL,
      timeoutMs: TIMEOUT_MS,
      hasKey: Boolean(process.env.OPENAI_API_KEY),
      tips: "POST JSON 到此端點以取得分析；?dry=1 可回傳假資料；?dry=1&mode=single 測單方；?selftest=1 查看測試"
    };

    // 乾測：假資料（不耗額度）
    if (String(req.query?.dry || req.query?.DRY || "") === "1" || process.env.MOCK_OPENAI === "1") {
      const isSingle = String(req.query?.mode||'') === 'single';
      const mock = isSingle ? {
        text: `1) 個性基因\n主角青龍×子孫×卯：創新、外向、求變；卯支增強敏捷與社交能量。\n\n2) 盲點與風險\n- 過度追新導致分心。\n- 情緒起伏影響節奏。\n\n3) 行動方案\n- 當週習慣：晨間 10 分鐘計畫、每日一記三件好事、睡前關機 30 分鐘。\n- 職場/人際：對話前先寫 3 句要點、會議只提 1–2 個主題、給同事具體感謝。\n\n4) 六維度自評建議\nfit 72、comm 70、pace 65、account 60、trust 68、innov 85\n\n5) 每天一句鼓勵\n保持你的光，但記得也照照自己。\n\n6) JSON\n\`\`\`json\n{\n  \"scores\": { \"fit\": 72, \"comm\": 70, \"pace\": 65, \"account\": 60, \"trust\": 68, \"innov\": 85 },\n  \"tags\": [\"創新\", \"節奏\", \"自我照顧\"],\n  \"encourage\": \"保持你的光，但記得也照照自己。\"\n}\n\`\`\``
      } : {
        text: `1) 個性描述\n我方青龍×子孫；對方勾陳×兄弟。\n\n2) 衝突熱點\n- 變動 vs 穩定。\n\n3) 協調策略...\n\n6) 每天一句鼓勵\n你做得很好，先穩住一小步就夠。\n\n7) JSON\n\`\`\`json\n{\n  \"scores\": { \"fit\": 72, \"comm\": 68, \"pace\": 60, \"account\": 74, \"trust\": 69, \"innov\": 83 },\n  \"tags\": [\"創新帶動\", \"流程補強\"],\n  \"encourage\": \"你做得很好，先穩住一小步就夠。\"\n}\n\`\`\``
      };
      res.writeHead(200, { "Content-Type": "application/json", ...CORS });
      return res.end(JSON.stringify(mock));
    }

    // 自我測試（基本欄位與模式）
    if (String(req.query?.selftest||"") === "1") {
      const singleMust = ['aBeast','aKin','aBranch','context'];
      const pairMust = ['aBeast','aKin','aBranch','bBeast','bKin','bBranch','context'];
      res.writeHead(200, { "Content-Type": "application/json", ...CORS });
      return res.end(JSON.stringify({ ok:true, singleMust, pairMust }));
    }

    res.writeHead(200, { "Content-Type": "application/json", ...CORS });
    return res.end(JSON.stringify(info));
  }

  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json", ...CORS });
    return res.end(JSON.stringify({ error: { message: "Method Not Allowed" } }));
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.writeHead(500, { "Content-Type": "application/json", ...CORS });
    return res.end(JSON.stringify({ error: { message: "Missing OPENAI_API_KEY" } }));
  }

  // 讀 body
  let body;
  try {
    body = await readJson(req);
  } catch (e) {
    res.writeHead(400, { "Content-Type": "application/json", ...CORS });
    return res.end(JSON.stringify({ error: { message: e.message || "Invalid JSON" } }));
  }

  // 解析欄位與模式判斷
  const { aBeast, aKin, aBranch, bBeast, bKin, bBranch, context, depth, mode:modeIn } = body || {};
  const computedMode = (modeIn === 'single' || (!bBeast && !bKin && !bBranch)) ? 'single' : 'pair';
  const mustSingle = [aBeast, aKin, aBranch, context];
  const mustPair = [aBeast, aKin, aBranch, bBeast, bKin, bBranch, context];
  const must = computedMode === 'single' ? mustSingle : mustPair;
  if (must.some(v => !v || typeof v !== "string" || !v.trim())) {
    res.writeHead(400, { "Content-Type": "application/json", ...CORS });
    return res.end(JSON.stringify({ error: { message: computedMode==='single' ? "Missing required fields for SINGLE (需：我方六獸/六親/地支與情境)" : "Missing required fields for PAIR (需：雙方六獸/六親/地支與情境)" } }));
  }

  const { system, user } = buildPrompt({ aBeast, aKin, aBranch, bBeast, bKin, bBranch, context, depth, mode: computedMode });

  // 逾時控制
  const ctrl = new AbortController();
  const timer = setTimeout(() => { try { ctrl.abort(); } catch {} }, TIMEOUT_MS);

  try {
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
      signal: ctrl.signal
    });

    const raw = await r.text();
    let data; try { data = JSON.parse(raw); } catch { data = null; }

    if (!r.ok) {
      const msg = data?.error?.message || raw || `HTTP ${r.status}`;
      res.writeHead(r.status, { "Content-Type": "application/json", ...CORS });
      return res.end(JSON.stringify({ error: { message: msg } }));
    }

    const text = extractTextFromResponse(data, raw);
    res.writeHead(200, { "Content-Type": "application/json", ...CORS });
    return res.end(JSON.stringify({ text }));
  } catch (err) {
    const msg = (err && err.name === 'AbortError') ? `Upstream timeout (> ${TIMEOUT_MS} ms)` : (err?.message || String(err));
    res.writeHead(500, { "Content-Type": "application/json", ...CORS });
    return res.end(JSON.stringify({ error: { message: msg } }));
  } finally {
    clearTimeout(timer);
  }
};
