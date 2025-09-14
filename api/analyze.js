// /pages/api/analyze.js —— 穩定版（分數依輸入動態計算；性愛章節固定模板；文末附乾淨 ```json）

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "missing_env", detail: "OPENAI_API_KEY not set" });

    const {
      mode = "single",
      aBeast = "", aKin = "", aBranch = "",
      bBeast = "", bKin = "", bBranch = "",
      context = "",         // 例：性愛 / 個性分析 / ...
      sexDetail = ""        // 前端摘要字串：重點：…；補充：…
    } = req.body ?? {};

    const isDual = mode === "dual";
    const isSex  = context?.trim() === "性愛";

    // ========= 1) 先讓模型產生 1~4 段（純文字，不含 JSON 與性愛章） =========
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

    let headText = "";
    try {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.7,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user }
          ]
        })
      });
      if (r.ok) {
        const data = await r.json();
        headText = data?.choices?.[0]?.message?.content?.trim() || "";
      }
    } catch (_) {}
    if (!headText) {
      headText =
`1) 個性描述
- 注重秩序與界線，偏好先對齊節奏再展開行動。
- 溝通務實，目標導向，重視承諾與可驗證的結果。

2) 衝突熱點
- 節奏與掌控期待不同；細節標準不一致。
- 直白回饋可能被解讀為壓力或苛責。

3) ${isDual ? "協調策略" : "自我調整策略"}
- 短期：定義成功樣貌；拆解任務；設置回饋節點。
- 長期：建立信任儀式；沉澱決策資料；定期檢視流程。

4) 六維度分數解讀
- 依互動品質與回饋循環，可持續提升契合與信任。`;
    }

    // ========= 2) 後端固定模板：性愛章節（非露骨） =========
    const bullet = (arr) => arr.map(s => `- ${s}`).join("\n");
    const titleA = `${aBeast || ""}${aBranch || ""}`.trim();
    const titleB = isDual ? `${bBeast || ""}${bBranch || ""}`.trim() : "";
    const pickTags = [];
    if (sexDetail) {
      const m = sexDetail.match(/重點：([^；]+)/);
      if (m) m[1].split("、").forEach(t => { const x=t.trim(); if(x) pickTags.push(x); });
    }
    const ch4 = `第四章：性愛場景與角色扮演
${bullet([
  "禁忌場景（地下賭場、露天泳池、摩天大樓、試衣間）以氛圍化方式呈現：燈光、音效、語言敘事，不做真實風險行為。",
  "角色扮演（權力遊戲、心理掌控、懸疑驚悚情境）先確認同意、設定安全詞與中止手勢。",
  `${titleA}${titleB ? " × " + titleB : ""} 的基調：以眼神與語言引導進場，先對齊界線與節奏，再加深沉浸。`,
  pickTags.length ? `本次偏好重點：${pickTags.join("、")}` : "建議從低強度試水溫，逐步遞進並保留回看節點。"
])}`;
    const ch5 = `第五章：性愛技巧與體位推薦
${bullet([
  "深度擁抱交合：以呼吸同步建立安全感；過程中用簡短口語確認舒適度。",
  "角色扮演與語音催眠：以口令設計節奏，聚焦意象與同意，避免露骨語彙。",
  "野性攻防與極端快感：僅在界線明確與有安全詞時進行；採分段遞進、隨時可退出。"
])}`;
    const ch6 = `第六章：性愛玩具與情境設置
${bullet([
  "震動棒與束縛配件：先做皮膚測試與強度調整；避免長時間固定並注意血液循環。",
  "感官剝奪與心理控制工具：以眼罩、耳罩建立聚焦；每 3–5 分鐘口頭檢查。",
  "環境：柔光、節奏型音樂、柔軟觸感與溫度管理；互動前中後備水與毛巾。"
])}`;
    const scriptLines = (() => {
      const base = [
        "開場：SAFE 確認（同意信號與安全詞），以 2–3 句敘事帶入情境。",
        "進程：每 5–10 分鐘為一段，段間回看情緒與強度。",
        "峰值：改用緩慢節奏與擁抱穩定呼吸，避免失控。",
        "收束：aftercare（補水、擁抱、正向回饋各 2 句），列下次可調整清單。"
      ];
      if (aBeast === "青龍") base.unshift("青龍鋪陳：採段落腳本帶節奏，對方回應關鍵詞即可。");
      if (bBeast === "玄武") base.push("玄武重安全感：以封閉式問題確認舒適度（可以／不要／暫停）。");
      return base;
    })();
    const ch7 = `第七章：六獸X地支全劇本合集（${titleA}${titleB ? " × " + titleB : "單人調律"}）
${bullet([
  "角色與場景：從溫和到進階各 2 種版本；場景可用燈光與語音敘事替代真實風險。",
  "對話引導：使用「可以／不要／暫停」三段式安全語；段落前後皆做確認。",
  ...scriptLines
])}`;
    const sexBlock = isSex ? `\n${ch4}\n\n${ch5}\n\n${ch6}\n\n${ch7}\n` : "";

    // ========= 3) 分數動態計算（依六獸/六親/地支/單雙人） =========
    function clamp(n){ return Math.max(0, Math.min(100, Math.round(n))); }
    function add(dst, delta){ for(const k in delta){ dst[k]=(dst[k]??0)+delta[k]; } return dst; }
    function elemOf(branch){
      const 水 = ["子","亥"], 木 = ["寅","卯"], 火 = ["巳","午"], 金 = ["申","酉"], 土 = ["丑","辰","未","戌"];
      if (水.includes(branch)) return "水";
      if (木.includes(branch)) return "木";
      if (火.includes(branch)) return "火";
      if (金.includes(branch)) return "金";
      if (土.includes(branch)) return "土";
      return "";
    }
    const base = { fit:60, comm:60, pace:60, account:60, trust:60, innov:60 };
    const beastW = {
      "青龍":   { fit:3,  comm:0,  pace:5,  account:0,  trust:0,   innov:8 },
      "朱雀":   { fit:0,  comm:10, pace:0,  account:0,  trust:0,   innov:4 },
      "勾陳":   { fit:0,  comm:0,  pace:-3, account:9,  trust:2,   innov:0 },
      "螣蛇":   { fit:0,  comm:3,  pace:0,  account:0,  trust:-3,  innov:9 },
      "白虎":   { fit:4,  comm:0,  pace:9,  account:0,  trust:-4,  innov:0 },
      "玄武":   { fit:0,  comm:0,  pace:0,  account:5,  trust:10,  innov:-3 }
    };
    const kinW = {
      "父母": { account:8, trust:3 },
      "兄弟": { comm:6 },
      "子孫": { innov:6, trust:2 },
      "妻財": { fit:6, account:2 },
      "官鬼": { pace:6, account:2 }
    };
    const elemW = {
      "水": { trust:6, comm:2 },
      "木": { innov:6, comm:3 },
      "火": { pace:6, innov:2 },
      "金": { account:6, fit:2 },
      "土": { fit:4, account:3, pace:-1 }
    };
    function applyOne(side){
      const out = {fit:0,comm:0,pace:0,account:0,trust:0,innov:0};
      if (beastW[side.beast]) add(out, beastW[side.beast]);
      if (kinW[side.kin]) add(out, kinW[side.kin]);
      const el = elemOf(side.branch);
      if (elemW[el]) add(out, elemW[el]);
      return out;
    }
    const A = applyOne({ beast:aBeast, kin:aKin, branch:aBranch });
    const B = isDual ? applyOne({ beast:bBeast, kin:bKin, branch:bBranch }) : {fit:0,comm:0,pace:0,account:0,trust:0,innov:0};

    // Synergy（簡易配對加減分）
    const syn = { fit:0,comm:0,pace:0,account:0,trust:0,innov:0 };
    if (isDual) {
      if (aBeast && bBeast && aBeast === bBeast) add(syn, { fit:3, comm:2 });
      const pair = new Set([aBeast, bBeast]);
      if (pair.has("青龍") && pair.has("玄武")) add(syn, { trust:4, comm:2 });
      if (pair.has("白虎") && pair.has("玄武")) add(syn, { trust:-4 });
      if (pair.has("朱雀") && pair.has("勾陳")) add(syn, { comm:-2, account:2 });
      if (pair.has("螣蛇") && pair.has("玄武")) add(syn, { trust:-2, innov:2 });
      // 同元素加一點穩定
      if (elemOf(aBranch) && elemOf(aBranch) === elemOf(bBranch)) add(syn, { fit:2 });
    }

    // 情境微調
    const ctxTweaks = { fit:0,comm:0,pace:0,account:0,trust:0,innov:0 };
    if (context === "跨部門協作") add(ctxTweaks, { comm:4, account:2 });
    if (context === "壓期交付專案") add(ctxTweaks, { pace:6, account:3, trust:-2 });
    if (isSex) add(ctxTweaks, { comm:3, trust:3 }); // 同意與界線意識

    const finalScores = {};
    for (const k of Object.keys(base)) {
      finalScores[k] = clamp(base[k] + A[k] + B[k] + syn[k] + ctxTweaks[k]);
    }

    // tags：取前二高維度 + 情境標籤
    const dimLabel = { fit:"契合", comm:"溝通", pace:"節奏", account:"責任", trust:"信任", innov:"創新" };
    const top2 = Object.entries(finalScores).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([k])=>dimLabel[k]);
    const tags = [...top2];
    if (isSex) tags.push("溝通同意","界線安全","節奏同步","aftercare");

    // ========= 4) 組裝性愛章節（如需） =========
    const sexText = isSex ? `
${ch4}

${ch5}

${ch6}

${ch7}
` : "";

    // ========= 5) 文末乾淨 JSON（供前端雷達圖使用） =========
    const jsonBlock =
` \`\`\`json
{
  "scores": { "fit": ${finalScores.fit}, "comm": ${finalScores.comm}, "pace": ${finalScores.pace}, "account": ${finalScores.account}, "trust": ${finalScores.trust}, "innov": ${finalScores.innov} },
  "tags": ${JSON.stringify(tags)}
}
\`\`\``;

    // ========= 6) 最終輸出 =========
    const text = `${headText}\n${sexText}\n${jsonBlock}`.trim();
    return res.status(200).json({ text });

  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e) });
  }
}
