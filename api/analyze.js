// /pages/api/analyze.js —— 增強版（更動態、貼近情境、非露骨）
// 分數動態計算（六獸/六親/地支/單雙人/情境）；性愛章節由更動態的數據庫與邏輯產生；文末乾淨 ```json

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const {
      mode = "single",
      aBeast = "", aKin = "", aBranch = "",
      bBeast = "", bKin = "", bBranch = "",
      context = "",        // 例：個性分析 / 愛情 / 性愛 / …
      sexDetail = ""       // 例：「重點：互動節奏與默契…；補充：…」
    } = req.body ?? {};

    const isDual = mode === "dual";
    const isSex  = (context || "").trim() === "性愛";

    // ===== 工具 =====
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
    const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // ===== 分數動態計算 (這部分保持不變，因為你主要希望修改性愛章節) =====
    const base = { fit:60, comm:60, pace:60, account:60, trust:60, innov:60 };
    const beastW = {
      "青龍": { fit:4, comm:0, pace:6, account:0, trust:0, innov:8 },
      "朱雀": { fit:0, comm:10, pace:0, account:0, trust:0, innov:4 },
      "勾陳": { fit:0, comm:0, pace:-3, account:9, trust:2, innov:0 },
      "螣蛇": { fit:0, comm:3, pace:0, account:0, trust:-3, innov:9 },
      "白虎": { fit:3, comm:0, pace:9, account:0, trust:-4, innov:0 },
      "玄武": { fit:0, comm:0, pace:0, account:6, trust:10, innov:-3 }
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
    const ctxTweaks = zero();
    if (context === "跨部門協作") add(ctxTweaks, { comm:4, account:2 });
    if (context === "壓期交付專案") add(ctxTweaks, { pace:6, account:3, trust:-2 });
    if (context === "愛情") add(ctxTweaks, { trust:4, comm:2 });
    if (isSex) add(ctxTweaks, { comm:3, trust:3 });

    const scores = {};
    for (const k of Object.keys(base)) scores[k] = clamp(base[k] + A[k] + B[k] + syn[k] + ctxTweaks[k]);

    // ===== 文字分析（固定模板產生，穩定）- 這部分也保持原樣，主要改性愛章節 =====
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

    const p2 = `2) 衝突熱點
${bullet(isDual
  ? ["節奏與責任標準的解讀差異。","回饋頻率與形式不一致。","情緒安全感建立速度不同。"]
  : ["自我要求高，易忽略情緒復盤。","高壓下傾向加速，需注意同理與確認。","對模糊容忍度低。"]
)}`;

    const p3 = `${isDual ? "3) 協調策略" : "3) 自我調整策略"}
- 短期：
${bullet(["定義成功樣貌；拆解任務；設置回饋節點。","用相同範本記錄決策與追蹤。","每週 15 分鐘回看一次。"])}
- 長期：
${bullet(isDual
  ? ["建立信任儀式與共識文件。","沉澱決策資料，形成可複用模板。","定期檢視流程並優化瓶頸。"]
  : ["每月個人回顧：節奏/情緒/成果。","設定可接受的模糊度並時間盒管理。","練習非暴力溝通句型以減少誤讀。"]
)}`;

    const dimNames = { fit:"契合", comm:"溝通", pace:"節奏", account:"責任", trust:"信任", innov:"創新" };
    const dimSorted = Object.entries(scores).sort((a,b)=>b[1]-a[1]);
    const top = dimSorted[0]?.[0], low = dimSorted[5]?.[0];
    const p4 = `4) 六維度分數解讀
${bullet([
  `整體：以「${dimNames[top]}」為優勢、「${dimNames[low]}」為拉升點。`,
  `契合/溝通：${scores.fit}/${scores.comm} → 以條列與示例讓語義收斂。`,
  `節奏/責任：${scores.pace}/${scores.account} → 先對齊速度與輸出標準。`,
  `信任/創新：${scores.trust}/${scores.innov} → 小實驗保留創意，同時設退出機制。`
])}`;

    // ===== 性愛章節（增強版：更動態、貼近情境、非露骨） =====
    const titleA = `${aBeast || ""}${aBranch || ""}`.trim();
    const titleB = isDual ? `${bBeast || ""}${bBranch || ""}`.trim() : "";
    const picks = (() => {
      const m = (sexDetail || "").match(/重點：([^；]+)/);
      const rawPicks = m ? m[1].split("、").map(s=>s.trim()).filter(Boolean) : [];
      if (rawPicks.length === 0) { // 如果沒有明確重點，嘗試從 sexDetail 自由文本中提取
          const freeTextPicks = (sexDetail || "").split(/[,;；、，。]/).map(s=>s.trim()).filter(Boolean);
          return freeTextPicks.length > 0 ? freeTextPicks : ["互動節奏與默契", "情感連結深度"]; // 預設重點
      }
      return rawPicks;
    })();

    // 模擬「大數據庫」的動態內容
    const dynamicSexContent = {
      // 情境描述
      "情境描述": {
        "青龍": [
          "在隱密的空間中，藉由溫柔的引導與期待感的營造，逐步展開親密互動。",
          "精心佈置的私密場所，透過肢體與眼神的交會，營造一場關於主導與順從的遊戲。",
          "透過細膩的規劃，將兩人的情感曲線推向高峰，重視每一步的連結與回應。"
        ],
        "朱雀": [
          "在充滿對話與笑聲的氛圍中，讓語言成為挑逗的序曲，享受思想與身體的同步共鳴。",
          "開誠布公地表達慾望，透過口語交流和即時回饋，共同探索愉悅的邊界。",
          "享受輕鬆愉快的交流，在言語的刺激與回應中，尋找彼此的合拍節奏。"
        ],
        "勾陳": [
          "在熟悉的環境中，以穩健而有條理的步調，逐步加深親密體驗。",
          "重視安全與舒適，透過明確的預設與逐步深入的嘗試，建立堅實的親密連結。",
          "偏好有秩序的進展，享受每一步的踏實感，在穩定中尋求更深層的合一。"
        ],
        "螣蛇": [
          "在不設限的探索中，享受變幻莫測的刺激與挑戰，讓想像力引導身體的律動。",
          "渴望新奇與實驗，嘗試不同的情境與方式，從未知中尋求突破性的愉悅。",
          "在自由與無拘無束的氛圍中，隨心所欲地探索，感受每一次即興創作的火花。"
        ],
        "白虎": [
          "直接而熱烈，在充滿力量與速度感的互動中，釋放原始的激情。",
          "追求高強度的感官刺激，享受快速而直接的身體交流，釋放壓抑的能量。",
          "以果斷和魄力主導節奏，在充滿爆發力的互動中，體驗淋漓盡致的快感。"
        ],
        "玄武": [
          "在極致的安全與信任中，緩慢而深入地建立情感連結，享受長時間的親密投入。",
          "需要充分的安全感與情感基礎，在溫柔的包圍中，體驗深沉而持久的連結。",
          "重視身體與心靈的完全交付，在信任的保護下，享受完全放鬆的深度結合。"
        ],
        "水": ["情感流動，需要柔和的觸碰和持續的情緒共鳴。"],
        "木": ["成長與探索，喜歡循序漸進的嘗試，並觀察彼此的反應。"],
        "火": ["熱情與速度，偏好直接的感官刺激，享受激情燃燒的瞬間。"],
        "金": ["結構與秩序，重視清晰的界線與規則，在安全中尋求精準的互動。"],
        "土": ["穩定與深度，渴望紮實的連結，享受身體與心靈的沉穩契合。"],
        "預設": [
          "在舒適放鬆的環境中，透過溫柔的觸碰與眼神交流，逐步增進親密感。",
          "以好奇心引導探索，在彼此尊重的基礎上，享受身體的自然反應。",
          "創造一個既浪漫又安全的空間，讓情感與身體都能自由地表達。"
        ]
      },
      // 姿勢技巧
      "姿勢建議": {
        "青龍": [
          "側臥相擁式：適合青龍的引導性，兩人可進行深度對視與耳語，在溫柔中帶動節奏。",
          "跪姿環抱式：能讓青龍在視覺上更具掌控感，同時方便兩人情感交流。",
          "背入式：增加神秘感，讓青龍能透過身體的律動來表達主導權。"
        ],
        "朱雀": [
          "面對面坐姿：有利於朱雀的口語交流，方便持續的情緒與身體反饋。",
          "情侶瑜伽式：透過肢體的纏繞與拉伸，感受身體的連結與協調，同時可維持對話。",
          "交疊式：讓兩人身體緊密貼合，同時保持臉部交流，增加情感共鳴。"
        ],
        "勾陳": [
          "傳統傳教士式：提供最大的穩定性與安全感，讓勾陳能專注於感受。",
          "湯匙式：確保全身支撐，動作幅度可控，強調持久的舒適與連結。",
          "後背式：增加安定感，讓勾陳能感受對方的支持，並專注於身體的貼合。"
        ],
        "螣蛇": [
          "女上式（變換多樣）：能讓螣蛇自由探索身體的角度與節奏，增加實驗性。",
          "站立式：突破傳統限制，在非慣常情境中尋求新鮮感與刺激。",
          "高難度纏繞式：挑戰身體極限，在探索中找到獨特的樂趣與突破。"
        ],
        "白虎": [
          "騎乘式：能讓白虎充分施展爆發力，感受身體的衝擊與速度。",
          "狗爬式：強調原始與激情，讓白虎能盡情釋放內在的野性。",
          "站立深擁式：結合力量與親密，在快速的律動中感受身體的交纏。"
        ],
        "玄武": [
          "深層擁抱式：強調情感連結與安全感，讓玄武能完全放鬆並融入其中。",
          "交頸而臥式：在極致的貼合中，感受彼此的呼吸與心跳，享受慢節奏的融合。",
          "溫柔環抱式：讓身體緊密相依，在輕柔的撫觸中建立長久的信任感。"
        ],
        "預設": [
          "側臥式：適合放鬆與親密對話，易於眼神交流和溫柔撫觸。",
          "傳教士式：經典且穩定，能提供深度連結與情感表達的空間。",
          "女上式：讓雙方都能掌握節奏，增加互動的趣味與新意。"
        ]
      },
      // 對話引導
      "對話引導": {
        "青龍": [
          "「我希望你感受到的，是全身心的投入。」",
          "「你準備好了嗎？我會輕輕引導你。」",
          "「讓我們一起探索這份未知的愉悅，你信任我嗎？」"
        ],
        "朱雀": [
          "「你喜歡這種感覺嗎？告訴我更多。」",
          "「你現在最渴望的是什麼？我很想知道。」",
          "「我們之間的化學反應，真是奇妙。」"
        ],
        "勾陳": [
          "「這樣可以嗎？如果覺得不舒服，隨時告訴我。」",
          "「我們一步一步來，你覺得節奏合適嗎？」",
          "「我很重視你的感受，請給我反饋。」"
        ],
        "螣蛇": [
          "「我們來試點新的？你猜猜下一步會是什麼？」",
          "「這感覺有點瘋狂，但我很喜歡，你呢？」",
          "「讓我帶你去一個沒去過的地方，你敢嗎？」"
        ],
        "白虎": [
          "「想要更多嗎？感受我的力量。」",
          "「就讓激情引導我們，不用思考，只要感受。」",
          "「你完全屬於我，此刻。」"
        ],
        "玄武": [
          "「我很安全，你也很安全，我們可以一起深入。」",
          "「只要你在我身邊，我就能完全放鬆。」",
          "「這份親密是我們獨有的，我很珍惜。」"
        ],
        "預設": [
          "「你感覺如何？我很想知道。」",
          "「讓我們一起探索更深層次的親密。」",
          "「謝謝你和我分享這一切，我很開心。」"
        ]
      },
      // 六獸特性結合地支元素，模擬「能量」或「情緒流動」
      "能量流": {
        "青龍": {
          "水": "溫柔的引導中蘊含著深沉的慾望，情感與節奏交織。",
          "木": "透過循序漸進的挑逗，激發探索的熱情與創造力。",
          "火": "在強烈的激情中保持優雅的掌控，讓快感如潮水般湧動。",
          "金": "結構化的誘惑，在明確的互動中感受身體的交響。",
          "土": "穩健而深沉的推進，每一次觸碰都帶著堅定與承諾。",
          "預設": "主導與引導，在掌握節奏中享受探索的樂趣。"
        },
        "朱雀": {
          "水": "語言與情感的流動引導親密，在對話中感受每一次波瀾。",
          "木": "鼓勵嘗試與新鮮感，在交流中共同創造愉悅。",
          "火": "言詞的挑逗與身體的熱情交織，點燃激烈的火花。",
          "金": "清晰的表達慾望，在直接的交流中達成共鳴。",
          "土": "透過真誠的對話，建立信任，在穩定中感受情感的滋養。",
          "預設": "開放與交流，透過語言與身體互動增進連結。"
        },
        "勾陳": {
          "水": "在確保安全的前提下，溫和地探索情感的深度。",
          "木": "穩健中帶有探索的欲望，逐步嘗試新的刺激。",
          "火": "即使在激情中，也傾向保持一定的可控感和秩序。",
          "金": "明確的界線與規則，讓親密互動在安全框架下進行。",
          "土": "紮實的連結，重視過程的完整性與身體的感受。",
          "預設": "務實與謹慎，在安全與穩定中逐步加深親密。"
        },
        "螣蛇": {
          "水": "靈活而多變，情感的流動與身體的探索交織出意想不到的火花。",
          "木": "充滿好奇心，嘗試各種新奇的方式來豐富親密體驗。",
          "火": "在激烈的變奏中尋求快感，不拘泥於傳統。",
          "金": "在自由探索中尋找獨特的節奏，打破常規。",
          "土": "在看似自由的表象下，仍有其對安全感的潛在需求，但願意為新奇而妥協。",
          "預設": "變幻莫測，在實驗與探索中尋求新的刺激。"
        },
        "白虎": {
          "水": "強烈的慾望被柔和的情感流動包裹，形成獨特的衝擊。",
          "木": "直接而充滿活力，在快速的進展中感受原始的生命力。",
          "火": "爆發性的激情，追求極致的感官刺激與快速的回應。",
          "金": "以清晰而強勢的方式主導，在身體的交鋒中感受力量。",
          "土": "在穩健中注入強烈的衝動，形成一種深沉而有力的連結。",
          "預設": "直接與力量，追求速度與高強度的感官衝擊。"
        },
        "玄武": {
          "水": "深沉而持久的情感連結，身體與心靈在流動中融為一體。",
          "木": "在信任的基礎上緩慢發展，享受每一次深化的親密。",
          "火": "溫暖而持久的激情，在安全中感受火焰的燃燒。",
          "金": "在明確的承諾與信任中，完全交付身體與心靈。",
          "土": "穩固而深厚的連結，重視身體的舒適與心靈的共鳴。",
          "預設": "信任與深度，在安全感中尋求長久而深沉的連結。"
        }
      }
    };

    // 根據 sexDetail 提取關鍵詞，並動態生成內容
    const generateDynamicSection = (sectionType, beast, branch, inputDetail, isDualMode) => {
        let options = [];
        const beastKey = beast || "預設";
        const branchElem = elemOf(branch) || "預設";

        // 優先考慮 sexDetail 中的關鍵詞
        const detailKeywords = inputDetail.toLowerCase().split(/[；,、，。]/).map(s => s.trim()).filter(Boolean);
        const matchedOptions = [];

        // 嘗試匹配個人特質 (六獸)
        if (dynamicSexContent[sectionType][beastKey]) {
            options = options.concat(dynamicSexContent[sectionType][beastKey]);
        }
        // 嘗試匹配元素特質 (地支)
        if (dynamicSexContent[sectionType][branchElem]) {
            options = options.concat(dynamicSexContent[sectionType][branchElem]);
        }
        // 如果沒有匹配到，使用預設
        if (options.length === 0 && dynamicSexContent[sectionType]["預設"]) {
            options = options.concat(dynamicSexContent[sectionType]["預設"]);
        }

        // 從所有可用選項中，嘗試找到與 detailKeywords 相關的描述
        if (detailKeywords.length > 0) {
            options.forEach(opt => {
                if (detailKeywords.some(kw => opt.toLowerCase().includes(kw))) {
                    matchedOptions.push(opt);
                }
            });
        }
        
        // 如果有匹配到關鍵詞的選項，則使用；否則隨機選擇
        const finalOptions = matchedOptions.length > 0 ? matchedOptions : options;
        if (finalOptions.length === 0) { // 再次防範空選項
            return getRandom(dynamicSexContent[sectionType]["預設"]);
        }
        return getRandom(finalOptions);
    };

    const sexPowerDynamics = [];
    if (aBeast === "青龍") sexPowerDynamics.push("我方具主導性，善於規劃與引導。");
    if (aBeast === "白虎") sexPowerDynamics.push("我方充滿激情與力量，偏好直接快速。");
    if (bBeast === "玄武") sexPowerDynamics.push("對方重安全與信任，需要時間建立深度連結。");
    if (bBeast === "朱雀") sexPowerDynamics.push("對方重視溝通與情感交流，易受言語挑逗。");
    if (aBeast === "螣蛇" && bBeast === "勾陳") sexPowerDynamics.push("我方追求新奇，對方偏好穩定，需協調探索與安全的需求。");

    // ----- CH4：性愛場景與角色扮演 (更動態) -----
    const scenePicks = picks.filter(p => p.includes("情境描述") || p.includes("場景"));
    const ch4Content = [
      `• ${isDual ? "兩人組合基調" : "單人能量場域"}：${titleA}${titleB ? ` × ${titleB}` : ""} → ${getRandom(dynamicSexContent.能量流[aBeast][elA])}${isDual ? ` 與 ${getRandom(dynamicSexContent.能量流[bBeast][elB])} 的交織。` : "的內在探索。"}`,
      `• 能量流動：${
          isDual 
            ? `兩股力量的相互激盪，${(sexPowerDynamics.length > 0 ? sexPowerDynamics.join('；') : '在平衡與協調中找到最佳共振點。')}`
            : `我方內在的能量流動呈現為：${getRandom(dynamicSexContent.能量流[aBeast][elA])}`
      }`,
      `• 角色探索：${generateDynamicSection("情境描述", aBeast, aBranch, sexDetail, isDual)}`
    ];
    if (picks.length > 0 && sexDetail.length > 0) {
      ch4Content.push(`• 偏好側重：從您的描述「${sexDetail}」中，我們觀察到對${picks.join("、")}的傾向。`);
    }

    const ch4 = `性愛場景與角色扮演
${bullet(ch4Content)}`.trim();

    // ----- CH5：性愛技巧與體位推薦 (更動態) -----
    const positionPicks = picks.filter(p => p.includes("姿勢建議") || p.includes("體位"));
    const ch5Content = [
      `• 核心動能：根據兩人的特質，建議著重於${
        scores.pace > 70 ? "快速而富有張力的互動" : 
        scores.trust > 70 ? "深度連結與情感共鳴" : 
        scores.innov > 70 ? "探索多變的刺激" : 
        scores.comm > 70 ? "言語挑逗與非語言交流" : "穩定舒適的基礎體驗"
      }。`,
      `• 體位推薦：${generateDynamicSection("姿勢建議", aBeast, aBranch, sexDetail, isDual)}`
    ];
    if (isDual) { // 雙人模式，考慮對方
        ch5Content.push(`• 協調建議：結合雙方特性，可以嘗試${
            (aBeast === "青龍" && bBeast === "玄武") ? "青龍的引導與玄武的沉穩融合" :
            (aBeast === "朱雀" && bBeast === "白虎") ? "朱雀的熱情對話與白虎的直接回應" :
            (aBeast === "螣蛇" && bBeast === "勾陳") ? "螣蛇的實驗精神與勾陳的安全考量" :
            "雙方互相探索與調整，找到契合點"
        }。`);
    }

    const ch5 = `性愛技巧與體位推薦
${bullet(ch5Content)}`.trim();

    // ----- CH6：性愛玩具與情境設置 (更動態) -----
    const toolPicks = picks.filter(p => p.includes("情境設置") || p.includes("玩具"));
    const ch6Content = [
      `• 感官引導：${
        (scores.innov > 75) ? "可嘗試感官剝奪（眼罩、輕柔束縛）或新奇道具以增強體驗。" :
        (scores.trust > 75) ? "以柔和的燈光、舒適的觸感來營造安全與放鬆。" :
        (scores.pace > 75) ? "節奏感強烈的音樂，或有助於釋放能量的輕道具。" :
        "舒適的環境佈置，配合輕柔音樂與氛圍燈。"
      }`,
      `• 環境建議：${
        (elA === "水" || elB === "水") ? "流動的水聲、精油香氛，營造沉浸式體驗。" :
        (elA === "火" || elB === "火") ? "暖色調燈光、略帶刺激的氣味，點燃激情。" :
        (elA === "木" || elB === "木") ? "自然氣息、植物裝飾，帶來生機與活力。" :
        "柔和光線、舒適寢具，營造放鬆氛圍。"
      }`
    ];
    if (sexDetail.includes("對話引導")) {
      ch6Content.push(`• 溝通設計：${generateDynamicSection("對話引導", aBeast, aBranch, sexDetail, isDual)}`);
    } else {
      ch6Content.push(`• 溝通設計：${getRandom(dynamicSexContent["對話引導"]["預設"])}`);
    }

    const ch6 = `情境營造與感官啟動
${bullet(ch6Content)}`.trim();


    // ----- CH7：六獸X地支全劇本合集 (更動態) -----
    const scriptLines = [
      "開場：SAFE 確認（同意信號/安全詞），透過約定好的儀式進入狀態。",
      "進程：根據彼此的身體語言與口語反饋，動態調整節奏與深度。",
      "峰值：保持專注與連結，必要時放慢速度，確保同步與安全。",
      "收束：Aftercare（補水/擁抱/真誠的回饋），討論下次可優化之處。"
    ];
    if (aBeast === "青龍") scriptLines.unshift("青龍能量：由一方輕柔引導，關注對方的細微反應來調整方向。");
    if (bBeast === "玄武" && isDual) scriptLines.push("玄武回應：特別留意安全訊號與情感需求，以封閉式問題確認舒適。");
    if (aBeast === "螣蛇" || bBeast === "螣蛇") scriptLines.push("螣蛇靈活：鼓勵嘗試新奇元素，但須明確溝通邊界與退出機制。");
    if (elemOf(aBranch) === "火" || elemOf(bBranch) === "火") scriptLines.push("火元素影響：注意節奏變化與熱情表達，確保能量的均衡釋放。");
    if (elemOf(aBranch) === "水" || elemOf(bBranch) === "水") scriptLines.push("水元素影響：注重情感的流動與深度連結，創造沉浸式體驗。");


    const ch7 = `六獸X地支全劇本合集
• 結合兩人的特質與元素傾向，提供一套可操作的互動框架，強調尊重與流暢。
${bullet(scriptLines)}`;

    const sexBlock = isSex ? `\n${ch4}\n\n${ch5}\n\n${ch6}\n\n${ch7}` : "";

    // ===== tags（取前二高維度 + 情境 + 性愛專屬標籤）=====
    const dimLabel = { fit:"契合", comm:"溝通", pace:"節奏", account:"責任", trust:"信任", innov:"創新" };
    const top2 = Object.entries(scores).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([k])=>dimLabel[k]);
    const tags = [...top2];
    if (isSex) {
      tags.push("情感連結", "感官探索", "角色互動", "安全邊界"); // 更貼近性愛情境的標籤
      if (sexDetail.includes("情境描述")) tags.push("場景營造");
      if (sexDetail.includes("姿勢建議")) tags.push("姿勢體位");
      if (sexDetail.includes("對話引導")) tags.push("言語挑逗");
      // 根據六獸特性添加更多細緻標籤
      if (aBeast === "青龍" || bBeast === "青龍") tags.push("節奏主導");
      if (aBeast === "朱雀" || bBeast === "朱雀") tags.push("口語交流");
      if (aBeast === "螣蛇" || bBeast === "螣蛇") tags.push("新奇體驗");
      if (aBeast === "玄武" || bBeast === "玄武") tags.push("深度信任");
    }

    // 去除重複標籤並限制數量
    const uniqueTags = Array.from(new Set(tags)).slice(0, 6); // 最多顯示6個標籤

    // ===== 組裝輸出 =====
    const head = [p1, "", p2, "", p3, "", p4].join("\n");
    const jsonBlock =
` \`\`\`json
{
  "scores": { "fit": ${scores.fit}, "comm": ${scores.comm}, "pace": ${scores.pace}, "account": ${scores.account}, "trust": ${scores.trust}, "innov": ${scores.innov} },
  "tags": ${JSON.stringify(uniqueTags)}
}
\`\`\``;

    const text = `${head}${sexBlock ? `\n\n${sexBlock}` : ""}\n\n${jsonBlock}`.trim();
    return res.status(200).json({ text });

  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e) });
  }
}
