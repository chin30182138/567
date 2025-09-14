// ==========================
//    文件：/pages/api/analyze.js
// ==========================
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "missing_env", detail: "OPENAI_API_KEY not set" });
    }

    const {
      mode, aBeast, aKin, aBranch,
      bBeast, bKin, bBranch,
      context, sexDetail
    } = req.body ?? {};

    // 組 prompt
    let prompt = `請根據以下條件進行完整分析，並且最後務必輸出一個 JSON 區塊：
我方：${aBeast} × ${aKin} × ${aBranch}
對方：${mode === 'dual' ? `${bBeast} × ${bKin} × ${bBranch}` : '（單人模式）'}
情境：${context || '—'}
性愛細節：${sexDetail || '（無）'}

分析步驟：
1. 個性推演與衝突點
2. 自我調整策略
3. 六維度分數（fit, comm, pace, account, trust, innov 各 0~100）
4. 若情境是「性愛」，請額外加入性愛場景、角色扮演、技巧建議、玩具與設置、完整劇本等豐富描述。

⚠️ 輸出規範：
- 先給完整文字說明（繁體中文）
- 結尾一定要加上 \`\`\`json 區塊，內容格式如下：
{
  "scores": {
    "fit": 整數,
    "comm": 整數,
    "pace": 整數,
    "account": 整數,
    "trust": 整數,
    "innov": 整數
  },
  "tags": ["可選的關鍵詞","用來生成小標籤"]
}`;

    // 呼叫 OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "你是一位精通六爻與人格分析的專業卜卦師助手。" },
          { role: "user", content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 1200
      })
    });

    const data = await response.json();
    const text =
      data.choices?.[0]?.message?.content ||
      data.choices?.[0]?.text ||
      JSON.stringify(data);

    res.status(200).json({ text });

  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ error: "server_error", detail: String(err) });
  }
}
