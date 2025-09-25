// /api/sex-template.js —— 測試版
// 功能：單純回傳一段 JSON，確認 API 路由正常
export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  return res.status(200).json({
    text: "✅ sex-template API is working on Vercel"
  });
}
