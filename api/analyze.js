// /pages/api/analyze.js —— 離線穩定最終版（不依賴任何外部模型）
// 功能：固定輸出 1~4 段分析文字；若情境為「性愛」則附第4~7章（非露骨模板）
// 分數依「六獸/六親/地支/單雙人/情境」動態計算；文末附乾淨 ```json 區塊

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const {
      mode = "single",
      aBeast = "", aKin = "", aBranch = "",
      bBeast = "", bKin = "", bBranch = "",
      context = "",        // 例：個性分析 / 愛情 / 性愛 / …
      sexDetail = ""       // 例：「重點：互動節奏與默契、溫柔引導；補充：……」
    } = req.body ?? {};

    const isDual = mode === "dual" || mode === "double" || mode === "dual".replace; // 兼容你前端的 dual
    const isSex  = (context || "").trim() === "性愛";

    // ===== 0) 小工具 =====
    const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
    const bullet = (arr) => arr.map(s => `- ${s}`).join("\n");
    const elemOf = (branch) => {
      const 水 = ["子","亥"], 木 = ["寅","卯"], 火 = ["巳","午"], 金 = ["申","酉"], 土 = ["丑","辰","未","戌"];
      if (水.includes(branch)) return "水";
      if (木.includes(branch)) return "木";
      if (火.includes(branch)) return "火";
      if (金.includes(branch)) return "金";
      if (土.includes(branch)) return "土";
      return "";
    };

    // ===== 1) 分數動態計算 =====
    const base = { fit:60, comm:60, pace:60, account:60, trust:60, innov:60 };

    const beastW = {
      "青龍": { fit: 4, comm: 0,  pace: 6,  account: 0,  trust: 0,  innov: 8 },
      "朱雀": { fit: 0, comm:10,  pace: 0,  account: 0,  trust: 0,  innov: 4 },
      "勾陳": { fit: 0, comm: 0,  pace:-3, account: 9,  trust: 2,  innov: 0 },
      "螣蛇": { fit: 0, comm: 3,  pace: 0,  account: 0,  trust:-3, innov: 9 },
      "白虎": { fit: 3, comm: 0,  pace: 9,  account: 0,  trust:-4, innov: 0 },
      "玄武": { fit: 0, comm: 0,  pace: 0,  account: 6,  trust:10,  innov:-3 }
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

    const zero = () => ({ fit:0, comm:0, pace:0, account:0, trust:0, innov:0 });
    const add = (dst, d) => { for(const k in d) dst[k]=(dst[k]??0)+(d[k]??0); return dst; };

    function scoreOne(beast, kin, branch) {
      const out = zero();
      if (beastW[beast]) add(out, beastW[beast]);
      if (kinW[kin]) add(out, kinW[kin]);
      const el = elemOf(branch);
      if (elemW[el]) add(out, elemW[el]);
      return out;
    }

    const A = scoreOne(aBeast, aKin, aBranch);
    const B = isDual ? scoreOne(bBeast, bKin, bBranch) : zero();

    // Synergy
    const syn = zero();
    if (isDual) {
      if (aBeast && bBeast && aBeast === bBeast) add(syn, { fit:3, comm:2 });
      const pair = new Set([aBeast, bBeast]);
      if (pair.has("青龍") && pair.has("玄武")) add(syn, { trust:4, comm:2 });
      if (pair.has("白虎") && pair.has("玄武")) add(syn, { trust:-4 });
      if (pair.has("朱雀") && pair.has("勾陳")) add(syn, { comm:-2, account:2 });
      if (pair.has("螣蛇") && pair.has("玄武")) add(syn, { trust:-2, innov:2 });
      if (elemOf(aBranch) && elemOf(aBranch) === elemOf(bBranch)) add(syn, { fit:2 });
    }

    // 情境微調
    const ctxTweaks = zero();
    if (context === "跨部門協作") add(ctxTweaks, { comm:4, account:2 });
    if (context === "壓期交付專案") add(ctxTweaks, { pace:6, account:3, trust:-2 });
    if (context === "愛情") add(ctxTweaks, { trust:4, comm:2 });
    if (isSex) add(ctxTweaks, { comm:3, trust:3 });

    const scores = {};
    for (const k of Object.keys(base)) {
      scores[k] = clamp(base[k] + A[k] + B[k] + syn[k] + ctxTweaks[k]);
    }

    // ===== 2) 文字分析（不靠模型，直接模板生成）=====
    const personaMap = {
      "青龍": ["擅長設局與節奏帶領，行動前會先規劃步驟。","偏好以成果驗證溝通，對節奏與承諾較敏感。"],
      "朱雀": ["善於表達與共鳴，擅長用語言建立一致感。","重視即時反饋，喜歡互動中的靈感碰撞。"],
      "勾陳": ["務實穩定，偏好流程化與可追溯的紀律。","對風險較敏感，會先確保資源與邊界。"],
      "螣蛇": ["創意豐富，思路跳躍，喜歡試錯與探索。","需要彈性空間以保持動能，忌被過度約束。"],
      "白虎": ["行動派，推進速度快，善於在壓力下抓節奏。","容易忽略對方情緒指標，需注意節奏同頻。"],
      "玄武": ["重安全與信任基礎，願意長期投入。","偏好穩紮穩打，重視過程完整性與界線。"]
    };
    const elemTone = {
      "水": "情緒流動度高，需要清楚的同意與節奏回看。",
      "木": "成長導向，願意嘗試新法，但需要明確的階段性回饋。",
      "火": "節奏偏快，容易追求刺激，需要穩定句點與緩沖。",
      "金": "標準明確，偏好規則與責任對齊，討厭模糊。",
      "土": "重秩序與承諾，喜踏實推進與可複盤的紀律。"
    };

    const elA = elemOf(aBranch);
    const elB = isDual ? elemOf(bBranch) : "";

    const p1 = [
      "1) 個性描述",
      ...(personaMap[aBeast] || ["特質待補。"]),
      ...(isDual ? (personaMap[bBeast] || ["特質待補。"]).map(s => `對方：${s}`) : []),
      `我方元素傾向：${elA || "—"}${elA ? `（${elemTone[elA] || ""}）` : ""}`,
      ...(isDual ? [`對方元素傾向：${elB || "—"}${elB ? `（${elemTone[elB] || ""}）` : ""}`] : []),
    ].map(s => (s.startsWith("1)") ? s : `- ${s}`)).join("\n");

    const p2list = [];
    if (isDual) {
      if (scores.pace >= 70 && scores.comm <= 55) p2list.push("節奏推進快但語意對齊不足，易出現『我以為你知道』的誤會。");
      if (scores.account >= 70 && scores.innov <= 55) p2list.push("流程/責任要求高，對試錯容忍度低，抑制創意。");
      if (!p2list.length) p2list.push("對節奏、責任標準的解讀差異。","回饋頻率與形式不一致。","情緒安全感建立速度不同。");
    } else {
      p2list.push("自我要求高，易忽略情緒復盤。","在高壓下傾向加速，忽視同理與確認。","對模糊容忍度低。");
    }
    const p2 = `2) 衝突熱點\n${bullet(p2list.slice(0,3))}`;

    const p3short = [
      "建立每週固定回看（15 分鐘）；使用同一份議題清單。",
      "把任務拆解到 2~3 日內可完成的粒度，降低不確定性。",
      "定義『成功樣貌』：完成條件、風險、驗收人與時間。"
    ];
    const p3long = isDual ? [
      "建立信任儀式（定期感謝/回饋），把『預期』寫成共識文件。",
      "拉齊決策流程：提案→討論→決定→追蹤，明確各步驟 Owner。",
      "以數據沉澱經驗，建立可複用模板。"
    ] : [
      "每月一次個人回顧：節奏、情緒、成果，保留改進清單。",
      "設定『可接受模糊度』，用時間盒限制過度完美主義。",
      "逐步練習非暴力溝通句型，減少誤讀機率。"
    ];
    const p3Title = isDual ? "3) 協調策略" : "3) 自我調整策略";
    const p3 = `${p3Title}\n- 短期：\n${bullet(p3short)}\n- 長期：\n${bullet(p3long)}`;

    const dimNames = { fit:"契合", comm:"溝通", pace:"節奏", account:"責任", trust:"信任", innov:"創新" };
    const dimSorted = Object.entries(scores).sort((a,b)=>b[1]-a[1]);
    const top = dimSorted[0]?.[0], low = dimSorted[5]?.[0];
    const p4 = `4) 六維度分數解讀
${bullet([
  `整體基調：以「${dimNames[top]}」為優勢、「${dimNames[low]}」為拉升點，建議保留固定回看節點。`,
  `契合/溝通：${scores.fit}/${scores.comm} → 以條列與示例讓語義收斂。`,
  `節奏/責任：${scores.pace}/${scores.account} → 先提早對齊速度與輸出標準。`,
  `信任/創新：${scores.trust}/${scores.innov} → 用小實驗保留創意，同時有退出機制。`
])}`;

    // ===== 3) 性愛章節（非露骨模板，嚴格套用你指定大綱）=====
    const titleA = `${aBeast || ""}${aBranch || ""}`.trim();
    const titleB = isDual ? `${bBeast || ""}${bBranch || ""}`.trim() : "";
    const picks = (() => {
      const m = (sexDetail || "").match(/重點：([^；]+)/);
      return m ? m[1].split("、").map(s=>s.trim()).filter(Boolean) : [];
    })();

    const ch4 = `第四章：性愛場景與角色扮演
• 禁忌場景（地下賭場、露天泳池、摩天大樓、試衣間）：以燈光/音效/語言敘事完成氛圍，避免真實風險行為。
• 角色扮演（權力遊戲、心理掌控、懸疑驚悚情境）：事前確認同意、設定安全詞/中止手勢；段落式遞進。
• 組合基調：${titleA}${titleB ? ` × ${titleB}` : ""} → 先對齊節奏與界線，再加深沉浸。
${picks.length ? `• 偏好重點：${picks.join("、")}` : ""}`.trim();

    const ch5 = `第五章：性愛技巧與體位推薦
• 深度擁抱交合：以呼吸同步/擁抱建立安全感；過程中用簡短口語確認舒適度。
• 角色扮演與語音催眠：用口令設計節奏，聚焦意象/同意，避免露骨語彙。
• 野性攻防與極端快感：僅在界線明確且有安全詞時進行；採分段遞進，保留隨時退出權。`;

    const ch6 = `第六章：性愛玩具與情境設置
• 震動棒與束縛配件：先做皮膚測試與強度調整；避免長時間固定，注意血液循環。
• 感官剝奪與心理控制工具：以眼罩/耳罩建立聚焦；每 3–5 分鐘口頭檢查。
• 情境設置：柔光、節奏型音樂、柔軟觸感、溫度管理；前中後備水與毛巾。`;

    const scriptLines = (() => {
      const base = [
        "開場：SAFE 確認（同意信號/安全詞），2–3 句敘事進場。",
        "進程：每 5–10 分鐘為一段，段間回看情緒與強度。",
        "峰值：放慢節奏並以擁抱穩定呼吸，避免失控。",
        "收束：aftercare（補水/抱持/正向回饋），留下下次調整清單。"
      ];
      if (aBeast === "青龍") base.unshift("青龍帶節奏：使用段落腳本＋關鍵詞回應，降低誤讀。");
      if (bBeast === "玄武") base.push("玄武偏安全：以封閉式問題確認舒適（可以/不要/暫停）。");
      return base;
    })();

    const ch7 = `第七章：六獸X地支全劇本合集
• 依六獸與地支組合，給出可操作的情境與腳本（非露骨）。
• 內容包含：角色扮演、場景設置、對話引導、技巧與善後照護。
${bullet(scriptLines)}`;

    const sexBlock = isSex ? `\n${ch4}\n\n${ch5}\n\n${ch6}\n\n${ch7}` : "";

    // ===== 4) tags（取前二高維度 + 情境標籤）=====
    const dimLabel = { fit:"契合", comm:"溝通", pace:"節奏", account:"責任", trust:"信任", innov:"創新" };
    const top2 = Object.entries(scores).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([k])=>dimLabel[k]);
    const tags = [...top2];
    if (isSex) tags.push("溝通同意","界線安全","節奏同步","aftercare");

    // ===== 5) 組裝輸出（文末乾淨 JSON）=====
    const head = [
      "1) 個性描述與傾向已整理如下：", // 標記，避免你舊樣式誤會
      p1, "", p2, "", p3, "", p4
    ].join("\n");

    const jsonBlock =
` \`\`\`json
{
  "scores": { "fit": ${scores.fit}, "comm": ${scores.comm}, "pace": ${scores.pace}, "account": ${scores.account}, "trust": ${scores.trust}, "innov": ${scores.innov} },
  "tags": ${JSON.stringify(tags)}
}
\`\`\``;

    const text = `${head}${sexBlock ? `\n\n${sexBlock}` : ""}\n\n${jsonBlock}`.trim();
    return res.status(200).json({ text });

  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e) });
  }
}
