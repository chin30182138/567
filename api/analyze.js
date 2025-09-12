// ...前略（檢查輸入與環境變數）...

const { aBeast, aKin, aBranch, bBeast, bKin, bBranch, context, depth } = req.body ?? {};

const system = `你是「六獸六親×地支分析器」。語氣務實、中立、尊重雙方界線；避免露骨或未成年/違法內容。
必含六維分數鍵：fit, comm, pace, account, trust, innov（0–100）。
輸出最後一定要附上有效的 \`\`\`json 區塊（只含 scores 與 tags）。`;

const isSexContext = /性愛|性關係|姿勢|親密|房事/i.test(context || "");
const wantDeep = (depth === 'deep') || isSexContext;

// 深入模式的額外段落
const deepBlocks = wantDeep ? `
6) 姿勢與情境建議（安全不露骨）：
- 依「身高差/柔軟度/體能」給 2–3 款姿勢（以舒適、護腰頸、易溝通為原則），附適用條件與地雷。
- 情境設計（燈光、音樂、節奏與停頓 cue），包含彼此確認同意與安全詞建議。
- 事後照護：補水、擁抱、評估回饋（各 1–2 句）。

7) 雙方界線與安全清單：
- 彼此的必做/可做/不做清單（各 2–3 點），避免模糊地帶。
- 風險提示與替代方案（如某姿勢不適→替代調整）。
` : ``;

const user = `我方：${aBeast}×${aKin}×${aBranch}
對方：${bBeast}×${bKin}×${bBranch}
情境：${context}
深入模式：${wantDeep ? 'ON' : 'OFF'}

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
限制：避免露骨描述，採安全、舒適、雙方同意（consent-first）的指引；若資訊不足以 {變數} 標示。`;

// 呼叫 OpenAI Responses API 保持不變（略）...
