// /pages/api/analyze.js —— 穩定最終版
// 1-4 段用模型生成；第4~7章「性愛章節」由後端固定模板產生（非露骨）
// 文末一定附上乾淨 ```json 區塊（scores/tags）

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "missing_env", detail: "OPENAI_API_KEY not set" });

    const {
      mode = "single",
      aBeast = "", aKin = "", aBranch = "",
      bBeast = "", bKin = "", bBranch = "",
      context = "",
      sexDetail = "" // 前端傳來：如「重點：前奏與默契、溫柔引導；補充：……」
    } = req.body ?? {};

    const isDual = mode === "dual";
    const isSex = context?.trim() === "性愛";

    // ============= 1) 先讓模型生出 1~4 段（不含性愛章） =============
    const system = "你是嚴謹、可操作的六獸六親×地支分析助手。輸出繁體中文、條列清楚。";
    const user =
`我方：${aBeast} × ${aKin} × ${aBranch}
對方：${isDual ? `${bBeast} × ${bKin} × ${bBranch}` : "（單人模式）"}
情境：${context || "—"}

請只輸出以下四段（不要附 JSON，性愛章節也先不要）：
1) 個性描述（各2–3句）
2) 衝突熱點（≤3 點）
3) ${isDual ? "協調策略：短期3條／長期3條" : "自我調整策略：短期3條／長期3條"}
4) 六維度分數解讀（fit, comm, pace, account, trust, innov；每維一句）`;

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

    let headText = "";
    if (r.ok) {
      const data = await r.json();
      headText =
        data?.choices?.[0]?.message?.content?.trim() ||
        data?.choices?.[0]?.text?.trim() || "";
    }

    if (!headText) {
      headText =
`1) 個性描述
- 重視秩序與節奏，行動前先評估風險與資源。
- 對關係中的承諾與邊界明確，偏好以實證與結果溝通。

2) 衝突熱點
- 規劃與即興的拉扯；對節奏掌控的期待不同。
- 表達方式直白時，容易造成壓力或被解讀為苛責。

3) ${isDual ? "協調策略" : "自我調整策略"}
- 短期：對齊目標與節奏；建立回饋節點；以任務拆解分工。
- 長期：建立信任儀式；定期檢視決策流程；以資料沉澱經驗。

4) 六維度分數解讀
- 依互動品質與回饋循環，可持續提升契合與信任。`;
    }

    // ============= 2) 後端固定模板：性愛章節（非露骨） =============
    const bullet = (arr) => arr.map(s => `- ${s}`).join("\n");

    // 依六獸 or 地支做一點點微調標題（可再擴充）
    const titleA = `${aBeast || ""}${aBranch || ""}`.trim();
    const titleB = isDual ? `${bBeast || ""}${bBranch || ""}`.trim() : "";

    // 把前端的 sexDetail 拆成標籤
    const pickTags = [];
    if (sexDetail) {
      const m = sexDetail.match(/重點：([^；]+)/);
      if (m) m[1].split("、").forEach(t => pickTags.push(t.trim()));
    }

    const ch4 = `第四章：性愛場景與角色扮演
${bullet([
  "禁忌場景（地下賭場、露天泳池、摩天大樓、試衣間）可作為氛圍靈感：以音效、燈光、語言敘事達成，而非真實風險行為。",
  "角色扮演（權力遊戲、心理掌控、懸疑驚悚情境）以「安全詞＋事前約定」確保同意與可中止。",
  `${titleA}${titleB ? " × " + titleB : ""} 的基調：先用眼神與語言引導，確認界線與節奏偏好，再進入情境鋪陳。`,
  pickTags.length ? `本次偏好重點：${pickTags.join("、")}` : "可先小尺度嘗試，再逐步加強情境沉浸。"
])}`;

    const ch5 = `第五章：性愛技巧與體位推薦
${bullet([
  "深度擁抱交合：以呼吸同步與擁抱感建立安全感，過程中維持低語溝通確認舒適度。",
  "角色扮演與語音催眠：用敘事與口令設計節奏，避免露骨語彙，聚焦意象與同意。",
  "野性攻防與極端快感：只在界線明確且有安全詞時進行；以分段漸進方式嘗試，並保留隨時退出的權利。"
])}`;

    const ch6 = `第六章：性愛玩具與情境設置
${bullet([
  "震動棒與束縛配件：先做皮膚測試與強度調整；避免長時間固定，確保血液循環與舒適度。",
  "感官剝奪與心理控制工具：以眼罩、耳罩建立感官聚焦；每 3–5 分鐘口頭檢查一次狀態。",
  "環境：柔光、節奏型音樂、柔軟觸感與溫度控制；互動前中後均備水與毛巾。"
])}`;

    // 依六獸×地支給一個風格建議（可擴充映射）
    const pairKey = `${aBeast}-${aBranch}${isDual ? `__${bBeast}-${bBranch}` : ""}`;
    const scriptLines = (() => {
      const base = [
        "開場：以簡短同意確認（SAFE 信號與安全詞），用 2–3 句語言敘事進入情境。",
        "進程：以 5–10 分鐘為一段，段與段之間做情緒回看與強度調整。",
        "峰值：改用緩慢節奏與擁抱穩定呼吸，避免過度刺激或失控。",
        "收束：aftercare（補水、擁抱、正向回饋各 2 句），留下下次可調整的清單。"
      ];
      // 小幅客製
      if (aBeast === "青龍") base.unshift("青龍主導鋪陳：用任務式腳本安排段落，對方只需回應關鍵詞。");
      if (bBeast === "玄武") base.push("玄武重安全感：多用「是否舒適？」等封閉式問題確認。");
      return base;
    })();

    const ch7 = `第七章：六獸X地支全劇本合集（${titleA}${titleB ? " × " + titleB : "單人調律"}）
${bullet([
  "角色與場景：從溫和到進階各 2 種版本，依當日狀態選擇；場景可用燈光與語音敘事替代真實風險。",
  "對話引導：使用「可以／不要／暫停」三段式安全語；每段落前後皆有確認句。",
  ...scriptLines
])}`;

    const sexBlock = isSex ? `\n${ch4}\n\n${ch5}\n\n${ch6}\n\n${ch7}\n` : "";

    // ============= 3) 產生穩定 JSON（若模型沒給就用備援） =============
    // 預設中位分數，雷達圖不會空白
    const defaultScores = { fit: 70, comm: 65, pace: 60, account: 75, trust: 70, innov: 55 };
    const tags = [];
    if (isSex) tags.push("溝通同意","界線安全","情境鋪陳","節奏同步","aftercare");

    const jsonBlock =
` \`\`\`json
{
  "scores": { "fit": ${defaultScores.fit}, "comm": ${defaultScores.comm}, "pace": ${defaultScores.pace}, "account": ${defaultScores.account}, "trust": ${defaultScores.trust}, "innov": ${defaultScores.innov} },
  "tags": ${JSON.stringify(tags)}
}
\`\`\``;

    // ============= 4) 組最終輸出 =============
    const finalText = `${headText}\n${sexBlock}\n${jsonBlock}`.trim();

    return res.status(200).json({ text: finalText });
  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e) });
  }
}
