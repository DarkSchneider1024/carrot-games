/**
 * Carrot Games — SPA Router
 * Hash-based router for static hosting compatibility (GitHub Pages)
 */

import { hideLoadingScreen } from './utils/loading-manager.js';

const routes = {};
let currentCleanup = null;

/**
 * Register a route
 * @param {string} path - Route path (e.g. '/', '/xiangqi')
 * @param {Function} handler - async function(container, params) that renders the page and returns cleanup fn
 */
export function registerRoute(path, handler) {
  routes[path] = handler;
}

/**
 * Navigate to a route
 * @param {string} path
 */
export function navigate(path) {
  window.location.hash = '#' + path;
}

/**
 * Get current route path (with normalized trailing slashes)
 */
function getCurrentPath() {
  let hash = window.location.hash.slice(1) || '/';
  if (hash.length > 1 && hash.endsWith('/')) {
    hash = hash.slice(0, -1);
  }
  return hash;
}

/**
 * Route matching — extract params from path & query string
 */
function matchRoute(fullPath) {
  const [path, queryString] = fullPath.split('?');
  const searchParams = new URLSearchParams(queryString || '');
  const queryObj = {};
  searchParams.forEach((val, key) => queryObj[key] = val);

  // Exact match first
  if (routes[path]) return { handler: routes[path], params: { ...queryObj } };

  // Pattern matching (e.g., /xiangqi/:mode, /poker/:mode)
  for (const [pattern, handler] of Object.entries(routes)) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) continue;

    const params = { ...queryObj };
    let match = true;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }

    if (match) return { handler, params };
  }

  return null;
}

const ROUTE_SEO = {
  '/': { title: 'Carrot Games — 免費線上多重對戰遊戲平台 | 台灣麻將、大老二、中國象棋', desc: '正宗台灣16張麻將、台灣大老二、中國象棋、德州撲克大賽與3D魔法對戰，即點即玩，支援 AI 陪練與好友線上連線開房！' },
  '/mahjong': { title: '台灣 16 張麻將 (Taiwan Mahjong) — Carrot Games', desc: '正宗十六張台灣麻將！具備智慧 AI 聽牌分析提示、吃碰槓與經典台數自動結算。' },
  '/big-two': { title: '台灣大老二 (Big Two 13 Cards) — Carrot Games', desc: '經典十三張大老二！支援快殺結束與全打完排名雙模式，業界標準爆張與持2雙倍計分。' },
  '/xiangqi': { title: '中國象棋 (Xiangqi) — Carrot Games', desc: '楚河漢界戰術攻防！提供高智能 AI 陪練與線上好友連線對弈。' },
  '/poker': { title: '德州撲克 (Texas Holdem Poker) — Carrot Games', desc: '心理博弈與籌碼決戰！支援可愛 AI 電腦對決與好友連線開房。' },
  '/tetris': { title: '俄羅斯方塊對戰 (Tetris Battle 2P) — Carrot Games', desc: '經典 2 分鐘對決！考驗反應與消除技巧，支援 K.O. 擊倒與反制攻擊。' },
  '/magic-fighter': { title: '魔法對戰 3D (Magic Fighter) — Carrot Games', desc: '重塑經典《坦克大戰》靈魂為魔法戰機 3D 空戰對決，保護蘿蔔水晶基地！' },
  '/fruit-havoc': { title: '水果極限闖關 (Fruit Extreme) — Carrot Games', desc: '類似《超級雞馬》的派對平台對戰！支援單機同屏輪流擺放 20 種陷阱道具。' },
  '/guide': { title: '遊戲玩法與規則教學手冊 — Carrot Games', desc: 'Carrot Games 全系列遊戲詳細規則、台數計算與技巧操作教學。' }
};

function updateRouteSEO(path) {
  const baseKey = '/' + (path.split('/')[1] || '');
  const seo = ROUTE_SEO[baseKey] || ROUTE_SEO['/'];
  document.title = seo.title;
  const descMeta = document.querySelector('meta[name="description"]');
  if (descMeta) descMeta.setAttribute('content', seo.desc);
}

/**
 * Render the current route
 */
async function renderRoute() {
  const path = getCurrentPath();
  const app = document.getElementById('app');
  updateRouteSEO(path);

  // Clean up previous page
  if (currentCleanup) {
    try {
      currentCleanup();
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }
    currentCleanup = null;
  }

  const match = matchRoute(path);

  try {
    if (match) {
      app.style.opacity = '0';
      app.style.transition = 'opacity 0.15s ease';

      await new Promise(r => setTimeout(r, 100));
      app.innerHTML = '';

      currentCleanup = await match.handler(app, match.params);

      requestAnimationFrame(() => {
        app.style.opacity = '1';
      });
    } else {
      // 404
      app.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:1rem;background-color:var(--color-bg-primary);color:var(--color-text-primary);">
          <h2>找不到頁面</h2>
          <p style="color:var(--color-text-secondary)">這裡什麼都沒有...</p>
          <a href="#/" class="btn btn-primary" style="margin-top:1rem;">回到首頁</a>
        </div>
      `;
    }
  } catch (err) {
    console.error('[Router] Render route error:', err);
    app.style.opacity = '1';
    app.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:1rem;background-color:#0f172a;color:#f8fafc;padding:20px;text-align:center;">
        <h2>頁面載入異常</h2>
        <p style="color:#94a3b8;max-width:400px;">系統遇到不預期的錯誤：${err.message || err}</p>
        <button onclick="window.location.reload()" class="btn btn-primary" style="margin-top:1rem;padding:10px 24px;">重新載入頁面</button>
      </div>
    `;
  } finally {
    hideLoadingScreen();
  }
}

/**
 * Initialize the router
 */
export function initRouter() {
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
}
