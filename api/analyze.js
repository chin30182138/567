// /api/analyze.js  (Vercel Serverless, Node 18+)
// Debug 版：加強日誌，協助判斷金鑰/請求錯誤

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // 1) 檢查環境變數（不印金鑰，只印是否存在）
    const hasKey = !!process.env.OPENAI_API_KEY;
    if (!hasKey) {
      console.error('ENV CHECK ❌ : OPENAI_API_KEY is MISSING (Production env not set or no redeploy)');
      return res.status(500).json({
        error: 'missing_env',
        detail: 'OPENAI_API_KEY not set in Vercel (Settings → Environment Variables). After saving, Redeploy.'
      });
    } else {
      console.log('ENV CHECK ✅ : OPENAI_API_KEY is PRESENT');
    }

    // 2) 解析輸入
    const { aBeast, aKin, bBeast, bKin, context } = req.body ?? {};
    if (!aBeast || !aKin || !bBeast || !bKin || !context) {
      console.warn('INPUT WARN: missing fields', { aBeast, aKin, bBeast, bKin, context });
      return res.status(400).json({ error: 'missing_fields', need: ['aBeast','aKin','bBeast','bKin','context'] });
    }

    // 3) Prompt
    const system = `你是「六獸六親分析器」。依規則輸出：個性、衝突、協調策略、六維分數與JSON。
規則：六獸=青龍(創新/展望/溝通)、朱雀(表達/輿論/快)、勾陳(穩健/流程/保守)、螣蛇(機巧/變通/隱憂)、白虎(決斷/競爭/高壓)、玄武(洞察/內控/風險)；
六親=父母(規範/知識/文件)、兄弟(協作/資源)、子孫(創意/解法/舒緩)、妻財(資源/績效/交付)、官鬼(秩序/責任/壓力)；
六維：fit/comm/pace/account/trust/innov（0–100）。語氣中立務實，不涉宿命。字數≤500+JSON。`;

    const user = `我方＝「${aBeast}×${aKin}」；對方＝「${bBeast}×${bKin}」；情境＝「${context}」。
請產出：
1) 個性描述（各2–3句）
2) 衝突熱點≤3
3) 協調策略：短期3條／長期3條
4) 六維度分數（每維一句解讀）
5) JSON：
{
 "pair":{"A":{"beast":"${aBeast}","kin":"${aKin}"},"B":{"beast":"${bBeast}","kin":"${bKin}"},"context":"${context}"},
 "scores":{"fit":0-100,"comm":0-100,"pace":0-100,"account":0-100,"trust":0-100,"innov":0-100},
 "tags":[]
}`;

    // 4) 呼叫 OpenAI Responses API
    const resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });

    // 5) 錯誤處理（把 OpenAI 的錯誤原文印到 Logs）
    if (!resp.ok) {
      const errText = await resp.text();
      console.error('OPENAI API ERROR ❌ :', errText);
      return res.status(500).json({ error: 'openai_failed', detail: errText });
    }

    // 6) 正常回傳
    const data = await resp.json();
    const text =
      data.output_text ??
      data.choices?.[0]?.message?.content ??
      JSON.stringify(data, null, 2);

    console.log('OPENAI API OK ✅');
    return res.status(200).json({ text });
  } catch (e) {
    console.error('SERVER ERROR ❌ :', e);
    return res.status(500).json({ error: 'server_error', detail: String(e) });
  }
}
