// (在 script 標籤內部，找到 buildSexDeepCard 函數)

async function buildSexDeepCard(sel){
  const isSex = sel.context === '性愛';
  const box = $('#sexDeep');
  const body = $('#sexDeepBody');
  if(!isSex){
    box.classList.add('hidden');
    body.innerHTML='';
    return;
  }

  // ==== 修改這一段 ====
  let templateData = null; // 用來儲存從 API 獲取的模板數據
  try {
    // 構建請求體，將我方/對方獸支傳遞給後端 API
    const requestBody = {
      aBeast: sel.aBeast,
      aBranch: sel.aBranch,
      bBeast: sel.bBeast,
      bBranch: sel.bBranch // 如果是單人模式，這些會是空字符串，後端會自行判斷
    };

    const r = await fetch('/api/sex-template', { // 修改 API 路徑
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(requestBody),
      cache: 'no-store'
    });

    if (!r.ok) {
      throw new Error(`API 請求失敗: ${r.status} ${r.statusText}`);
    }

    const data = await r.json();
    templateData = data.template; // 根據 /api/sex-template.js 的響應結構，模板數據在 `template` 鍵中

    if (!templateData) {
      throw new Error('API 回傳的模板數據為空');
    }

  } catch(e){
    console.error("載入性愛深入分析模板失敗", e);
    box.classList.add('hidden'); // 如果失敗，確保隱藏
    body.innerHTML = `<p class="text-red-500">無法載入性愛深入分析：${e.message || e}</p>`;
    return;
  }
  // ====================

  // 從這裡開始，使用 templateData 來渲染，而不是 templates[key]
  const tpl = templateData; // 現在 tpl 就是從 API 獲取的單個模板數據

  const titleA = [sel.aBeast||'', sel.aBranch||''].join('');
  const titleB = sel.mode==='dual' ? [sel.bBeast||'', sel.bBranch||''].join('') : '';
  const picks = (sel.sexDetail || '').replace(/^重點：/,'').split('；')[0] || '';

  const html = `
    <div class="pill">組合：<b>${titleA}</b> ${titleB?`× <b>${titleB}</b>`:''}</div>
    ${tpl.index ? `<div class="mt-2 text-[14px]"><span class="pill">${tpl.index}</span></div>` : ''}
    ${picks ? `<div class="mt-2 text-[14px]"><span class="pill">偏好重點：${picks}</span></div>` : ''}

    ${tpl.title ? `<h4 class="section-title">${tpl.title}</h4>` : ''}

    <h4 class="section-title">互動模式</h4>
    <ul class="list-disc pl-5 space-y-1">${(tpl.modes||[]).map(m=>`<li>${m}</li>`).join('')}</ul>

    <h4 class="section-title">潛在雷點</h4>
    <ul class="list-disc pl-5 space-y-1">${(tpl.hotspots||[]).map(h=>`<li>${h}</li>`).join('')}</ul>

    <h4 class="section-title">劇本風格推薦</h4>
    <ul class="list-disc pl-5 space-y-1">${(tpl.scripts||[]).map(s=>`<li>${s}</li>`).join('')}</ul>

    <h4 class="section-title">溝通與照護</h4>
    <ul class="list-disc pl-5 space-y-1">${(tpl.care||[]).map(c=>`<li>${c}</li>`).join('')}</ul>
  `;

  body.innerHTML = html;
  box.classList.remove('hidden');
}
