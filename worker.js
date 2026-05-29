const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
})

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── Fransızca App: şifre koruması ───────────────────────────────────────
    if (
      url.pathname === '/verbyte-login' ||
      url.pathname === '/verbyte' ||
      url.pathname.startsWith('/verbyte/')
    ) {

      // Login POST
      if (url.pathname === '/verbyte-login' && request.method === 'POST') {
        const form = await request.formData();
        const pw = form.get('pw') || '';
        const correct = env.FRAPP_PW ? pw === env.FRAPP_PW : pw === 'fransizca';
        if (correct) {
          return new Response(null, {
            status: 302,
            headers: {
              'Location': '/verbyte/',
              'Set-Cookie': `frapp_ok=${encodeURIComponent(pw)}; Path=/verbyte; HttpOnly; SameSite=Strict; Max-Age=2592000`,
            },
          });
        }
        return new Response(loginPage('Şifre yanlış, tekrar dene.'), {
          status: 401,
          headers: { 'Content-Type': 'text/html;charset=UTF-8' },
        });
      }

      // Cookie kontrolü
      if (url.pathname === '/verbyte-login' && request.method === 'GET') {
        return new Response(loginPage(), {
          status: 200,
          headers: { 'Content-Type': 'text/html;charset=UTF-8' },
        });
      }

      const cookie = request.headers.get('Cookie') || '';
      const match = cookie.match(/frapp_ok=([^;]+)/);
      const token = match ? decodeURIComponent(match[1]) : null;
      const expected = env.FRAPP_PW || 'fransizca';
      if (token !== expected) {
        return new Response(loginPage(), {
          status: 200,
          headers: { 'Content-Type': 'text/html;charset=UTF-8' },
        });
      }

      // Yetkili: static dosyaları sun
      return env.ASSETS.fetch(request);
    }
    // ────────────────────────────────────────────────────────────────────────

    if (url.pathname === '/api/auth' && request.method === 'POST') {
      try {
        const { pw } = await request.json();
        if (pw && pw === env.ADMIN_PW) return Response.json({ ok: true });
        return Response.json({ ok: false }, { status: 401 });
      } catch (e) {
        return Response.json({ ok: false }, { status: 400 });
      }
    }

    if (url.pathname === '/api/responses') {
      try {
        return await handleResponses(request, env);
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    // POST /api/vb/users — anonim kullanıcı oluştur
    if (url.pathname === '/api/vb/users' && request.method === 'POST') {
      const { id, nickname } = await request.json()
      if (!id || !nickname) return json({ error: 'missing fields' }, 400)
      await env.DB.prepare(
        `INSERT OR IGNORE INTO vb_users (id, nickname, created_at) VALUES (?, ?, ?)`
      ).bind(id, nickname, Date.now()).run()
      return json({ ok: true })
    }

    // POST /api/vb/sync — veri sync et
    if (url.pathname === '/api/vb/sync' && request.method === 'POST') {
      const { userId, settings, progress, streak, achievements } = await request.json()
      if (!userId) return json({ error: 'missing userId' }, 400)

      // settings
      if (settings) {
        await env.DB.prepare(
          `INSERT OR REPLACE INTO vb_settings (user_id, lang_code, daily_goal, user_level, theme, first_use_date)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(userId, settings.langCode, settings.dailyGoal, settings.userLevel, settings.theme, settings.firstUseDate).run()
      }

      // progress (bulk upsert)
      if (progress && Object.keys(progress).length > 0) {
        for (const [lang, words] of Object.entries(progress)) {
          for (const [wordKey, entry] of Object.entries(words)) {
            await env.DB.prepare(
              `INSERT OR REPLACE INTO vb_progress (user_id, lang, word_key, interval, ease, due, reps)
               VALUES (?, ?, ?, ?, ?, ?, ?)`
            ).bind(userId, lang, wordKey, entry.interval ?? 0, entry.ease ?? 2.5, entry.due ?? 0, entry.reps ?? 0).run()
          }
        }
      }

      // streak
      if (streak) {
        await env.DB.prepare(
          `INSERT OR REPLACE INTO vb_streak (user_id, count, last_date) VALUES (?, ?, ?)`
        ).bind(userId, streak.count, streak.lastDate).run()
      }

      return json({ ok: true })
    }

    // GET /api/vb/sync/:id — veri çek
    if (url.pathname.startsWith('/api/vb/sync/') && request.method === 'GET') {
      const userId = url.pathname.split('/').pop()
      const settings = await env.DB.prepare(`SELECT * FROM vb_settings WHERE user_id = ?`).bind(userId).first()
      const progress = await env.DB.prepare(`SELECT * FROM vb_progress WHERE user_id = ?`).bind(userId).all()
      const streak = await env.DB.prepare(`SELECT * FROM vb_streak WHERE user_id = ?`).bind(userId).first()
      return json({ settings, progress: progress.results, streak })
    }

    return env.ASSETS.fetch(request);
  }
};

function loginPage(error = '') {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Giriş</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      background:#0f0f1a;
      min-height:100dvh;
      display:flex;align-items:center;justify-content:center;
    }
    .card{
      background:#1a1a2e;
      border:1px solid #2e2e4a;
      border-radius:20px;
      padding:40px 36px;
      width:100%;max-width:360px;
      text-align:center;
    }
    .flag{font-size:52px;margin-bottom:16px;}
    h1{color:#fff;font-size:22px;font-weight:700;margin-bottom:6px;}
    p{color:#9ca3af;font-size:14px;margin-bottom:28px;}
    input[type=password]{
      width:100%;
      padding:14px 16px;
      border-radius:12px;
      border:1px solid #2e2e4a;
      background:#111827;
      color:#fff;
      font-size:16px;
      margin-bottom:14px;
      outline:none;
      transition:border-color .2s;
    }
    input[type=password]:focus{border-color:#4F46E5;}
    button{
      width:100%;
      padding:14px;
      border-radius:12px;
      border:none;
      background:#4F46E5;
      color:#fff;
      font-size:16px;
      font-weight:600;
      cursor:pointer;
      transition:opacity .2s;
    }
    button:hover{opacity:.9;}
    .error{
      color:#f87171;
      font-size:13px;
      margin-top:12px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="flag">🇫🇷</div>
    <h1>Français Öğren</h1>
    <p>Bu sayfaya erişmek için şifre gerekli</p>
    <form method="POST" action="/verbyte-login">
      <input type="password" name="pw" placeholder="Şifre" autofocus autocomplete="current-password"/>
      <button type="submit">Giriş</button>
    </form>
    ${error ? `<div class="error">${error}</div>` : ''}
  </div>
</body>
</html>`;
}

async function handleResponses(request, env) {
  const DB = env.DB;

  if (request.method === 'GET') {
    const { results } = await DB.prepare(
      'SELECT * FROM responses ORDER BY id DESC'
    ).all();
    const data = results.map(r => ({ ...r, virgin: r.virgin === 1 }));
    return Response.json(data);
  }

  if (request.method === 'POST') {
    const body = await request.json();
    const id = Date.now();
    await DB.prepare(
      `INSERT INTO responses (id, tarih, isim, virgin, yas, kullaniyor, sikluk, rutin, mevcutUrun, sikayet, problem, his, icerik, ikna, fiyat, fiyatNum, acik)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      body.tarih || '',
      body.isim || '',
      body.virgin ? 1 : 0,
      body.yas || '—',
      body.kullaniyor || '—',
      body.sikluk || '—',
      body.rutin || '—',
      body.mevcutUrun || '—',
      body.sikayet || '—',
      body.problem || '—',
      body.his || '—',
      body.icerik || '—',
      body.ikna || '—',
      body.fiyat || '—',
      body.fiyatNum || 0,
      body.acik || '—'
    ).run();
    return Response.json({ ok: true, id });
  }

  if (request.method === 'DELETE') {
    await DB.prepare('DELETE FROM responses').run();
    return Response.json({ ok: true });
  }

  return new Response('Method not allowed', { status: 405 });
}
