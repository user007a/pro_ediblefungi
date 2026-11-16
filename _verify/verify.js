/* Integration verification harness for the mushroom backend prototype.
 * Usage: node verify.js <chromeDebugPort> <httpPort> [pagesFile]
 * Assumes a static server serves html/applefarm_backhand at http://127.0.0.1:<httpPort>/
 * and headless Chrome listens on <chromeDebugPort>. Logs in, opens every page in the
 * index iframe, collects console errors / exceptions / network failures, screenshots,
 * and runs lightweight content sanity assertions. Prints a JSON report.
 */
const fs = require('fs');
const path = require('path');

const DEBUG_PORT = process.argv[2] || '9333';
const HTTP_PORT = process.argv[3] || '8123';
const BASE = `http://127.0.0.1:${HTTP_PORT}/`;
const OUT = __dirname;

const PAGES = [
  ['home.html', '系统首页'],
  ['enterprise_info.html', '企业信息'], ['enterprise_base.html', '厂区档案'],
  ['material_info.html', '物料种质'], ['team_manage.html', '人员班组'], ['guide_standard.html', '工艺标准'],
  ['material_io.html', '菌包制备'], ['harvest_report.html', '高压灭菌'], ['farming_record.html', '无菌接种'],
  ['harvest_record.html', '菌丝培养'], ['harvest_plan.html', '出菇培育'], ['harvest_process.html', '采收分拣'],
  ['harvest_storage.html', '仓储冷链'],
  ['device_info.html', '设备管理'], ['env_monitor.html', '设备环境数据'], ['device_control.html', '设备运行监控'],
  ['device_maintain.html', '设备运维工单'], ['device_spare.html', '备品备件'],
  ['alert_overview.html', '预警管理'], ['alert_settings.html', '预警设置'],
  ['trace_code.html', '追溯码管理'], ['trace_batch.html', '全链条录入'], ['trace_blockchain.html', '区块链存证'],
  ['trace_query.html', '产品召回'], ['data_source.html', '监管对接'],
  ['system_settings.html', '系统设置'], ['menu_settings.html', '菜单设置'], ['user_settings.html', '用户设置']
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getWsUrl() {
  const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  const list = await res.json();
  let page = list.find(t => t.type === 'page');
  if (!page) {
    const r = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: 'PUT' });
    page = await r.json();
  }
  return page.webSocketDebuggerUrl;
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0; const pending = new Map(); const handlers = [];
    ws.onmessage = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id); pending.delete(msg.id);
        msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
      } else if (msg.method) { handlers.forEach(h => h(msg)); }
    };
    ws.onerror = e => reject(e);
    ws.onopen = () => resolve({
      send(method, params = {}) {
        return new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
      },
      on(h) { handlers.push(h); },
      close() { ws.close(); }
    });
  });
}

(async () => {
  const wsUrl = await getWsUrl();
  const cdp = await connect(wsUrl);
  const errors = [];   // {page, type, text}
  const netFail = [];  // {page, url, status}
  let currentPage = '(init)';
  cdp.on(msg => {
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      errors.push({ page: currentPage, type: 'exception', text: (d.exception && (d.exception.description || d.exception.value)) || d.text });
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      const txt = (msg.params.args || []).map(a => a.value || a.description || '').join(' ');
      errors.push({ page: currentPage, type: 'console', text: txt });
    } else if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400) {
      netFail.push({ page: currentPage, url: msg.params.response.url, status: msg.params.response.status });
    } else if (msg.method === 'Network.loadingFailed') {
      netFail.push({ page: currentPage, url: msg.params.url || '(unknown)', status: 'FAILED:' + msg.params.errorText });
    }
  });
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });

  const evalTop = async (expr) => {
    const r = await cdp.send('Runtime.evaluate', { expression: `(function(){${expr}})()`, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };

  // fresh state
  await cdp.send('Page.navigate', { url: BASE + 'login.html' });
  await sleep(1500);
  await evalTop(`localStorage.clear(); sessionStorage.clear(); return 'cleared';`);
  await cdp.send('Page.navigate', { url: BASE + 'login.html' });
  await sleep(1500);
  // login
  await evalTop(`
    var u=document.getElementById('username'), p=document.getElementById('password');
    if(u){u.value='admin';} if(p){p.value='admin123';}
    var b=document.getElementById('loginBtn'); if(b){b.click();}
    return 'login-clicked';
  `);
  await sleep(2000);
  const loggedIn = await evalTop(`return sessionStorage.getItem('snzg_logged_in')||'none';`);
  console.log('LOGIN:', loggedIn);

  // ensure index shell
  await cdp.send('Page.navigate', { url: BASE + 'index.html' });
  await sleep(2000);

  const report = [];
  for (const [file, title] of PAGES) {
    currentPage = file;
    const beforeErr = errors.length, beforeNet = netFail.length;
    await evalTop(`if(window.openPage){openPage('${file}','${title}');}else{document.getElementById('mainFrame').src='${file}';} return 'opened';`);
    await sleep(1600);
    const info = await evalTop(`
      var f=document.getElementById('mainFrame'); var d=f&&f.contentDocument;
      if(!d) return {ok:false,reason:'no iframe doc'};
      var txt=d.body?d.body.innerText:'';
      var bad=(txt.match(/undefined|NaN|\\[object Object\\]/g)||[]).length;
      var rows=d.querySelectorAll('table tbody tr').length;
      var cards=d.querySelectorAll('.card,.stat-card,.panel,.model-card').length;
      var btns=d.querySelectorAll('button').length;
      return {ok:true, title:d.title, len:txt.length, bad:bad, rows:rows, cards:cards, btns:btns,
              h1:(d.querySelector('h1,h2,.page-title,.content-title')||{}).innerText||''};
    `);
    const shot = path.join(OUT, 'shot_' + file.replace('.html', '') + '.png');
    try {
      const s = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(shot, Buffer.from(s.data, 'base64'));
    } catch (e) { /* screenshot optional */ }
    const newErr = errors.slice(beforeErr), newNet = netFail.slice(beforeNet);
    report.push({ file, title, info, errors: newErr, netFail: newNet, shot });
    const flag = (info.ok && info.len > 200 && info.bad === 0 && newErr.length === 0 && newNet.length === 0) ? 'OK' : 'CHECK';
    console.log(`[${flag}] ${file} len=${info.len} bad=${info.bad} rows=${info.rows} btns=${info.btns} err=${newErr.length} net=${newNet.length}`);
    if (newErr.length) console.log('   ERR:', JSON.stringify(newErr.slice(0, 3)));
    if (newNet.length) console.log('   NET:', JSON.stringify(newNet.slice(0, 3)));
  }

  // cross-page caliber consistency
  currentPage = '(caliber)';
  const caliber = await evalTop(`
    var f=document.getElementById('mainFrame');
    return 'see-home';
  `);
  await evalTop(`openPage('home.html','系统首页'); return 'home';`);
  await sleep(1500);
  const homeTrace = await evalTop(`
    var f=document.getElementById('mainFrame'); var d=f.contentDocument;
    var el=d.getElementById('kpiTrace'); var w=f.contentWindow;
    var fsTrace=w.FungiStore?w.FungiStore.stats().trace:null;
    return {kpiTrace: el?el.innerText.trim():null, fsTrace: fsTrace};
  `);
  console.log('CALIBER home kpiTrace vs FS:', JSON.stringify(homeTrace));

  // cleanup
  await evalTop(`localStorage.clear(); sessionStorage.clear(); return 'cleared';`);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ login: loggedIn, report, caliber: homeTrace, errors, netFail }, null, 2));
  const totalErr = errors.length, totalNet = netFail.length;
  const checks = report.filter(r => !(r.info.ok && r.info.len > 200 && r.info.bad === 0 && r.errors.length === 0 && r.netFail.length === 0));
  console.log(`\nSUMMARY pages=${report.length} checks=${checks.length} consoleErrors=${totalErr} netFail=${totalNet}`);
  if (checks.length) console.log('NEEDS REVIEW:', checks.map(c => c.file).join(', '));
  cdp.close();
  process.exit(0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(1); });