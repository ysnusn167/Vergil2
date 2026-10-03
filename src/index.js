import HTML from './index.html';
import PANEL_HTML from './panel.html';
import PAYLOAD from './vpn-worker.txt';

const CF = 'https://api.cloudflare.com/client/v4';
const J = { 'content-type': 'application/json' };
const out = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: J });

export default {
  async fetch(req) {
    const { pathname } = new URL(req.url);
    if (req.method === 'POST' && pathname === '/api/deploy') {
      try {
        return out(await deploy(await req.json()));
      } catch (e) {
        return out({ error: e.message }, 400);
      }
    }
    return new Response(HTML, { headers: { 'content-type': 'text/html;charset=utf-8' } });
  },
};

// The key/token is used only for these calls. It is never stored or logged.
async function cf(auth, path, init = {}) {
  const r = await fetch(CF + path, { ...init, headers: { ...auth, ...init.headers } });
  const d = await r.json();
  if (!d.success) throw new Error(d.errors?.[0]?.message || 'Cloudflare API error');
  return d.result;
}

async function deploy({ email, key, token, name, password, consent }) {
  if (!consent) throw new Error('برای ادامه باید رضایت بدهید');
  if (!/^[a-z0-9-]{3,40}$/.test(name || '')) throw new Error('نام Worker فقط حروف کوچک انگلیسی، عدد و خط تیره (۳ تا ۴۰ کاراکتر)');
  if (!password || password.length < 8) throw new Error('رمز پنل باید حداقل ۸ کاراکتر باشد');

  const auth = token
    ? { Authorization: 'Bearer ' + token }
    : { 'X-Auth-Email': email, 'X-Auth-Key': key };

  const acc = (await cf(auth, '/accounts'))[0];
  if (!acc) throw new Error('اکانتی پیدا نشد');
  const A = `/accounts/${acc.id}`;

  const ns = await cf(auth, `${A}/storage/kv/namespaces`, {
    method: 'POST', headers: J, body: JSON.stringify({ title: name + '-kv' }),
  });

  const code = PAYLOAD.replace('__PANEL__', () => JSON.stringify(PANEL_HTML));
  const fd = new FormData();
  fd.append('metadata', JSON.stringify({
    main_module: 'worker.js',
    compatibility_date: '2024-09-01',
    bindings: [
      { type: 'kv_namespace', name: 'KV', namespace_id: ns.id },
      { type: 'secret_text', name: 'ADMIN_PASSWORD', text: password },
    ],
  }));
  fd.append('worker.js', new Blob([code], { type: 'application/javascript+module' }), 'worker.js');
  await cf(auth, `${A}/workers/scripts/${name}`, { method: 'PUT', body: fd });

  let sub = (await cf(auth, `${A}/workers/subdomain`).catch(() => null))?.subdomain;
  if (!sub) {
    sub = (await cf(auth, `${A}/workers/subdomain`, {
      method: 'PUT', headers: J, body: JSON.stringify({ subdomain: 'p' + crypto.randomUUID().slice(0, 8) }),
    })).subdomain;
  }
  await cf(auth, `${A}/workers/scripts/${name}/subdomain`, {
    method: 'POST', headers: J, body: JSON.stringify({ enabled: true }),
  });

  return { url: `https://${name}.${sub}.workers.dev` };
}
