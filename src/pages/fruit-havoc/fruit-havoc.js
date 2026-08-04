/**
 * Fruit Havoc Page — 2D Party Trap Platformer (水果傷害 2D 派對對戰)
 * Features Chiikawa / Sanrio Kawaii Fruit Characters, 20 Placement Traps, & Super Chicken Horse Race Dynamics.
 */

import { SVG_ICONS } from '../../components/icons.js';
import { navigate } from '../../router.js';
import { showToast } from '../../components/toast.js';

export async function renderFruitHavoc(container, params = {}) {
  const mode = params.mode || 'ai';

  const FRUIT_CHARACTERS = [
    { id: 'strawberry', name: '草莓吉伊', icon: '🍓', img: './assets/images/char_strawberry_berry.png', trait: '速度型 (淚流衝刺)', speed: 7.5, jump: 6.5 },
    { id: 'banana', name: '香蕉烏薩奇', icon: '🍌', img: './assets/images/char_banana_usagi.png', trait: '高跳型 (烏拉旋風跳)', speed: 6.0, jump: 9.5 },
    { id: 'melon', name: '哈密瓜小八', icon: '🍈', img: './assets/images/char_melon_hachi.png', trait: '智慧型 (陷阱擬態)', speed: 6.5, jump: 7.0 },
    { id: 'peach', name: '水桃栗饅頭', icon: '🍑', img: './assets/images/char_peach_kuriman.png', trait: '重裝型 (哈哼霸體)', speed: 5.5, jump: 6.0 },
    { id: 'grape', name: '飛天葡萄飛鼠', icon: '🍇', img: './assets/images/char_grape_momonga.png', trait: '滑翔型 (葡萄空降)', speed: 8.0, jump: 7.5 }
  ];

  const TRAP_ITEMS = [
    { id: 1, name: '彈簧拳擊手套', icon: '🥊', desc: '向前猛力彈出擊飛玩家' },
    { id: 2, name: '草莓電鋸擺錘', icon: '🪚', desc: '半空來回擺動的切割刀' },
    { id: 3, name: '香蕉皮滑行區', icon: '🍌', desc: '踩中失控向前滑行' },
    { id: 4, name: '蜂蜜黏黏膠', icon: '🍯', desc: '踩中移動速度 -70%' },
    { id: 5, name: '西瓜大砲', icon: '💣', desc: '定時發射重型西瓜砲彈' },
    { id: 6, name: '龍捲風漩渦', icon: '🌪️', desc: '高空向上強勁風場吹升' },
    { id: 7, name: '葡萄十字弩', icon: '🏹', desc: '感應式連環葡萄箭矢' },
    { id: 8, name: '仙人掌刺球', icon: '🌵', desc: '滾動刺球觸碰即陣亡' },
    { id: 9, name: '超高跳跳菇', icon: '🍄', desc: '向上 3 倍高高彈跳' },
    { id: 10, name: '雷電檸檬', icon: '⚡', desc: '釋放 360 度麻痺電流' },
    { id: 11, name: '奇異果傳送門', icon: '🌀', desc: '入口與出口瞬間轉移' },
    { id: 12, name: '冰棒極速檔板', icon: '🧊', desc: '光滑冰面牆阻擋或滑行' },
    { id: 13, name: '黑洞塌陷箱', icon: '🕳️', desc: '踩上去 0.5 秒後破裂' },
    { id: 14, name: '強風大風扇', icon: '扇', desc: '持續強風干擾跳躍軌跡' },
    { id: 15, name: '櫻桃雷射炮塔', icon: '🍒', desc: '旋轉掃射紅外能量極光' },
    { id: 16, name: '飄飄熱氣球', icon: '🎈', desc: '停留過久會下沉的浮台' },
    { id: 17, name: '椰子防禦盾', icon: '🛡️', desc: '阻擋弩箭與砲彈的壁壘' },
    { id: 18, name: '蘋果極性磁鐵', icon: '🧲', desc: '強烈吸引或排斥玩家' },
    { id: 19, name: '履帶跑道', icon: '🏃', desc: '滾動傳送帶加速或阻退' },
    { id: 20, name: '草莓蛋糕終點旗', icon: '🏆', desc: '率先抵達且通過考驗者勝' }
  ];

  let selectedChar = FRUIT_CHARACTERS[0];
  let selectedTrap = TRAP_ITEMS[0];

  container.innerHTML = `
    <div class="fruit-havoc-page animate-fade-in">
      <!-- Topbar Header -->
      <div class="topbar">
        <div class="topbar-left">
          <button class="btn btn-ghost btn-sm" id="btn-back" title="返回大廳">
            ${SVG_ICONS.back} <span>大廳</span>
          </button>
          <div class="topbar-title">
            <span class="game-name">🍓 水果傷害 (FRUIT HAVOC) 2D</span>
            <span class="badge badge-warning">${mode === 'ai' ? '超級雞馬對戰 AI 模式' : '線上 P2P 派對房間'}</span>
          </div>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-ghost btn-sm" id="btn-settings" title="遊戲說明">
            📖 規則說明
          </button>
        </div>
      </div>

      <!-- Main Workspace -->
      <div class="fruit-havoc-main">
        <!-- Left Panel: Character & Trap Selection -->
        <aside class="fruit-panel-left">
          <!-- Character Selector -->
          <div class="panel-card glass">
            <h4 class="panel-title">1. 選擇三麗鷗吉伊水果角色</h4>
            <div class="char-selector-grid">
              ${FRUIT_CHARACTERS.map(c => `
                <div class="char-select-item ${c.id === selectedChar.id ? 'active' : ''}" data-char-id="${c.id}">
                  <img src="${c.img}" alt="${c.name}" class="char-select-img" />
                  <span class="char-select-name">${c.name}</span>
                </div>
              `).join('')}
            </div>
            <div class="char-details-box" id="char-details-box">
              <strong id="cdetail-name">${selectedChar.name}</strong>
              <p id="cdetail-trait" style="font-size:0.8rem;color:#ea580c;margin:2px 0 6px 0;">${selectedChar.trait}</p>
              <div class="stat-bar"><span style="width:${selectedChar.speed * 10}%;"></span></div>
            </div>
          </div>

          <!-- Trap Selector (20 Traps) -->
          <div class="panel-card glass">
            <h4 class="panel-title">2. 擺放階段陷阱清單 (20種)</h4>
            <div class="trap-selector-grid">
              ${TRAP_ITEMS.map(t => `
                <button class="trap-select-item ${t.id === selectedTrap.id ? 'active' : ''}" data-trap-id="${t.id}" title="${t.name}: ${t.desc}">
                  <span class="trap-icon">${t.icon}</span>
                  <span class="trap-name">${t.name}</span>
                </button>
              `).join('')}
            </div>
          </div>
        </aside>

        <!-- Right Panel: 2D Stage Canvas & Race Field -->
        <main class="fruit-stage-area glass">
          <div class="stage-header">
            <span class="badge badge-info">第 1 / 5 輪次：擺放與競速中</span>
            <span class="stage-tip">點擊地圖選擇格子以放置 ${selectedTrap.name}</span>
          </div>

          <div class="canvas-wrapper">
            <canvas id="fruit-canvas" width="640" height="480"></canvas>
            <div class="canvas-overlay-ui" id="canvas-overlay-ui">
              <button class="btn btn-primary btn-lg" id="btn-start-round" style="background:linear-gradient(135deg,#ff7544,#ff70a6);border:none;box-shadow:0 4px 16px rgba(255,117,68,0.4);">
                🚀 擺放完成！開始出發競速
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  `;

  // Attach Event Handlers
  container.querySelector('#btn-back')?.addEventListener('click', () => navigate('/'));
  container.querySelector('#btn-settings')?.addEventListener('click', () => navigate('/guide?game=fruitHavoc'));

  // Character Selector Handlers
  container.querySelectorAll('.char-select-item').forEach(item => {
    item.addEventListener('click', () => {
      container.querySelectorAll('.char-select-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const charId = item.dataset.charId;
      selectedChar = FRUIT_CHARACTERS.find(c => c.id === charId);

      const nameEl = container.querySelector('#cdetail-name');
      const traitEl = container.querySelector('#cdetail-trait');
      if (nameEl) nameEl.textContent = selectedChar.name;
      if (traitEl) traitEl.textContent = selectedChar.trait;

      showToast(`已選擇角色：${selectedChar.name}`, 'info');
    });
  });

  // Trap Selector Handlers
  container.querySelectorAll('.trap-select-item').forEach(item => {
    item.addEventListener('click', () => {
      container.querySelectorAll('.trap-select-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const trapId = parseInt(item.dataset.trapId, 10);
      selectedTrap = TRAP_ITEMS.find(t => t.id === trapId);

      showToast(`準備放置陷阱：${selectedTrap.name}`, 'info');
    });
  });

  // Start Round Button
  container.querySelector('#btn-start-round')?.addEventListener('click', () => {
    showToast(`🍓 ${selectedChar.name} 開啟極速衝刺！通過陷阱到達終點吧！`, 'success');
  });

  // 2D Canvas Simple Demo Render
  const canvas = container.querySelector('#fruit-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const drawStage = () => {
      ctx.fillStyle = '#f0f9ff';
      ctx.fillRect(0, 0, 640, 480);

      // Grid Lines
      ctx.strokeStyle = 'rgba(2, 132, 199, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 640; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 480);
        ctx.stroke();
      }
      for (let y = 0; y < 480; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(640, y);
        ctx.stroke();
      }

      // Platforms
      ctx.fillStyle = '#fdba74';
      ctx.fillRect(40, 400, 160, 40); // Start Platform
      ctx.fillRect(440, 200, 160, 40); // Goal Platform

      // Goal Flag
      ctx.font = '28px sans-serif';
      ctx.fillText('🏆', 540, 190);
      ctx.fillText('🎂', 480, 190);

      // Start Player
      ctx.fillText(selectedChar.icon, 80, 390);

      // Traps Demo
      ctx.fillText('🥊', 240, 400);
      ctx.fillText('🪚', 360, 300);
      ctx.fillText('🍄', 320, 420);
    };

    drawStage();
  }
}
