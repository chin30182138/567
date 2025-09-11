
// /api/analyze.js  (Node 18+)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  const { aBeast, aKin, bBeast, bKin, context } = req.body ?? {};
  if (!aBeast || !aKin || !bBeast || !bKin || !context) {
    return res.status(400).json({error:'missing fields'});
  }

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
5) JSON 欄位：
{
 "pair":{"A":{"beast":"${aBeast}","kin":"${aKin}"},"B":{"beast":"${bBeast}","kin":"${bKin}"},"context":"${context}"},
 "scores":{"fit":0-100,"comm":0-100,"pace":0-100,"account":0-100,"trust":0-100,"innov":0-100},
 "tags":[]
}`;

  // 使用 Responses API
  const r = await fetch('https://api.openai.com/v1/responses', {
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

  if (!r.ok) {
    const err = await r.text();
    return res.status(500).json({ error: 'openai_failed', detail: err });
    }

  const data = await r.json();
  const text =
    data.output_text ??
    (data.choices?.[0]?.message?.content ?? JSON.stringify(data));
  res.status(200).json({ text });
}
