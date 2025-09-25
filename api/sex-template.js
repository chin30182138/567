// /api/sex-template.js
// 測試版：直接回傳固定內容，不呼叫 OpenAI

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { aBeast, aKin, aBranch, bBeast, bKin, bBranch, context } = req.body ?? {};

    // 模擬輸出
    const fakeText = `
<h3>🔮 性愛深入模板（測試版）</h3>
<p>我方：${aBeast || "—"} × ${aKin || "—"} × ${aBranch || "—"}</p>
<p>對方：${bBeast || "—"} × ${bKin || "—"} × ${bBranch || "—"}</p>
<p>情境：${context || "—"}</p>

<h4>情愛指數</h4>
<p>9.5 / 10 —— 測試中假資料</p>

<h4>互動模式</h4>
<ul>
  <li>靈活挑逗，互動遊戲感強。</li>
  <li>測試版固定描述，代表 API 已經串接成功。</li>
</ul>

<h4>推薦場景</h4>
<ul>
  <li>隱密酒吧沙發區（假資料）</li>
  <li>私人遊戲室（假資料）</li>
</ul>
`;

    return res.status(200).json({ text: fakeText });
  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e) });
  }
}
