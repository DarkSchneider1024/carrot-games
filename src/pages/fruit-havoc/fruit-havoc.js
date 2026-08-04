/**
 * Fruit Havoc Page — 2D Party Trap Platformer (水果傷害 派對對戰)
 * Features Drag & Drop Placement System, PeerJS WebRTC DataChannel Sync (60 FPS UDP Movement & Trap Sync).
 */

import { SVG_ICONS } from '../../components/icons.js';
import { navigate } from '../../router.js';
import { showToast } from '../../components/toast.js';
import {
  initFruitPeer,
  sendTrapPlacement,
  sendMovementState,
  closeFruitPeer
} from '../../network/fruit-peer-manager.js';

export async function renderFruitHavoc(container, params = {}) {
  const mode = params.mode || 'local'; // 'local' or 'online'

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
  let placedTraps = [
    { id: 1, trap: TRAP_ITEMS[0], gridX: 6, gridY: 9 },
    { id: 2, trap: TRAP_ITEMS[1], gridX: 9, gridY: 7 }
  ];
  let hoverGrid = null;

  // Realtime Movement State & Interpolation
  let isPeerConnected = false;
  let isRacing = false;
  let animFrameId = null;

  const localPlayer = { x: 80, y: 380, vx: 0, vy: 0 };
  const remotePlayer = { x: 80, y: 380, vx: 0, vy: 0, icon: '🍌' };
  const remoteTarget = { x: 80, y: 380, vx: 0, vy: 0 };

  container.innerHTML = `
    <div class="fruit-havoc-page animate-fade-in">
      <!-- Topbar Header -->
      <div class="topbar">
        <div class="topbar-left">
          <button class="btn btn-ghost btn-sm" id="btn-back" title="返回大廳">
            ${SVG_ICONS.back} <span>大廳</span>
          </button>
          <div class="topbar-title">
            <span class="game-name">🍓 水果傷害 (FRUIT HAVOC)</span>
            <span class="badge badge-warning">${mode === 'online' ? '🌐 WebRTC DataChannel 即時連線' : '👥 單機同屏 (玩家輪流擺放競速)'}</span>
          </div>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-ghost btn-sm" id="btn-settings" title="遊戲說明">
            📖 規則說明
          </button>
        </div>
      </div>

      ${mode === 'online' ? `
        <!-- WebRTC PeerJS Room Control Bar -->
        <div class="peer-room-bar glass" style="padding:12px 16px;border-radius:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--color-bg-card);">
          <div style="display:flex;align-items:center;gap:10px;">
            <button class="btn btn-primary btn-sm" id="btn-create-room" style="background:linear-gradient(135deg,#0284c7,#38bdf8);border:none;">
              🏠 創建連線房間
            </button>
            <div style="display:flex;align-items:center;gap:6px;">
              <input type="text" id="input-room-code" placeholder="輸入4位數代碼" style="width:130px;padding:5px 10px;border-radius:8px;border:1px solid var(--color-border);font-size:0.85rem;" />
              <button class="btn btn-cyan btn-sm" id="btn-join-room">
                🔗 加入對戰
              </button>
            </div>
          </div>
          <div id="peer-status-bar" style="font-size:0.85rem;font-weight:600;color:var(--color-text-secondary);">
            ⚪ 未連線 (請創建或輸入房間號)
          </div>
        </div>
      ` : ''}

      <!-- Main Workspace -->
      <div class="fruit-havoc-main">
        <!-- Left Panel: Character & Drag Trap Selection -->
        <aside class="fruit-panel-left">
          <!-- Character Selector -->
          <div class="panel-card glass">
            <h4 class="panel-title">1. 選擇水果角色</h4>
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

          <!-- Draggable Trap Selector (20 Traps) -->
          <div class="panel-card glass">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <h4 class="panel-title">2. 拖拉道具至右側地圖 (20種)</h4>
              <span class="badge badge-warning" style="font-size:0.7rem;">按住拖拽放置 ✋</span>
            </div>
            <div class="trap-selector-grid">
              ${TRAP_ITEMS.map(t => `
                <div class="trap-select-item ${t.id === selectedTrap.id ? 'active' : ''}" 
                     draggable="true" 
                     data-trap-id="${t.id}" 
                     title="按住滑鼠拖拉此道具至右側地圖上！">
                  <span class="trap-icon">${t.icon}</span>
                  <span class="trap-name">${t.name}</span>
                  <span class="drag-handle-hint">⋮⋮</span>
                </div>
              `).join('')}
            </div>
          </div>
        </aside>

        <!-- Right Panel: Stage Canvas & Drop Zone -->
        <main class="fruit-stage-area glass">
          <div class="stage-header">
            <span class="badge badge-info" id="stage-round-badge">第 1 / 5 輪次：擺放階段</span>
            <span class="stage-tip" id="stage-tip">🖐️ 請將左側道具【拖拉放至】右側地圖網格！</span>
          </div>

          <div class="canvas-wrapper" id="canvas-drop-zone">
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

  // Attach Navigation Handlers
  container.querySelector('#btn-back')?.addEventListener('click', () => {
    closeFruitPeer();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    navigate('/');
  });
  container.querySelector('#btn-settings')?.addEventListener('click', () => navigate('/guide?game=fruitHavoc'));

  // PeerJS WebRTC Connection Logic (Online Mode)
  const statusEl = container.querySelector('#peer-status-bar');

  if (mode === 'online') {
    const handleStatusChange = (status, msg) => {
      if (statusEl) {
        if (status === 'connected') {
          statusEl.innerHTML = `<span style="color:#16a34a;">${msg}</span>`;
          isPeerConnected = true;
          showToast('🟢 P2P WebRTC 連線成功！60 FPS UDP 位置同步已就緒', 'success');
        } else if (status === 'waiting' || status === 'connecting') {
          statusEl.innerHTML = `<span style="color:#d97706;">${msg}</span>`;
        } else {
          statusEl.innerHTML = `<span style="color:#dc2626;">${msg}</span>`;
          isPeerConnected = false;
        }
      }
    };

    const handleDataReceive = (packet) => {
      if (packet.type === 'TRAP_PLACE') {
        // 同步放置陷阱
        const targetTrap = TRAP_ITEMS.find(t => t.id === packet.trapId);
        if (targetTrap) {
          placedTraps = placedTraps.filter(pt => !(pt.gridX === packet.gridX && pt.gridY === packet.gridY));
          placedTraps.push({ id: Date.now(), trap: targetTrap, gridX: packet.gridX, gridY: packet.gridY });
          showToast(`🌐 對手拖放放置了【${targetTrap.icon} ${targetTrap.name}】(${packet.gridX}, ${packet.gridY})`, 'info');
          drawStage();
        }
      } else if (packet.type === 'MOVE') {
        // 60 FPS 位置 packet -> 更新遠端目標點（供 Lerp 外推插值）
        remoteTarget.x = packet.x;
        remoteTarget.y = packet.y;
        remoteTarget.vx = packet.vx;
        remoteTarget.vy = packet.vy;
      }
    };

    container.querySelector('#btn-create-room')?.addEventListener('click', () => {
      const randomCode = 'HAVOC-' + Math.floor(1000 + Math.random() * 9000);
      const input = container.querySelector('#input-room-code');
      if (input) input.value = randomCode;
      initFruitPeer(randomCode, true, handleStatusChange, handleDataReceive);
    });

    container.querySelector('#btn-join-room')?.addEventListener('click', () => {
      const input = container.querySelector('#input-room-code');
      const code = input ? input.value.trim().toUpperCase() : '';
      if (!code) {
        showToast('請輸入對手的 4 位數房間代碼', 'warning');
        return;
      }
      const fullCode = code.startsWith('HAVOC-') ? code : 'HAVOC-' + code;
      initFruitPeer(fullCode, false, handleStatusChange, handleDataReceive);
    });
  }

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
      drawStage();
    });
  });

  // Canvas & Trap Placement & 60 FPS Interpolation Loop
  const canvas = container.querySelector('#fruit-canvas');
  const dropZone = container.querySelector('#canvas-drop-zone');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const TILE_SIZE = 40;

  const drawStage = () => {
    if (!ctx) return;

    // 1. Smooth Interpolation for Remote Player (遠端對手位置線性插值)
    remotePlayer.x += (remoteTarget.x - remotePlayer.x) * 0.3;
    remotePlayer.y += (remoteTarget.y - remotePlayer.y) * 0.3;

    // 2. Clear Background & Draw Grid
    ctx.fillStyle = '#f0f9ff';
    ctx.fillRect(0, 0, 640, 480);

    ctx.strokeStyle = 'rgba(2, 132, 199, 0.18)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 640; x += TILE_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 480);
      ctx.stroke();
    }
    for (let y = 0; y <= 480; y += TILE_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(640, y);
      ctx.stroke();
    }

    // 3. Platforms & Goal
    ctx.fillStyle = '#fdba74';
    ctx.fillRect(40, 400, 160, 40); // Start
    ctx.fillRect(440, 200, 160, 40); // Goal

    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏆', 540, 180);
    ctx.fillText('🎂', 480, 180);

    // 4. Draw All Placed Traps
    placedTraps.forEach(pt => {
      const px = pt.gridX * TILE_SIZE + TILE_SIZE / 2;
      const py = pt.gridY * TILE_SIZE + TILE_SIZE / 2;

      ctx.fillStyle = 'rgba(255, 237, 213, 0.85)';
      ctx.fillRect(pt.gridX * TILE_SIZE + 2, pt.gridY * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      ctx.strokeStyle = '#fdba74';
      ctx.strokeRect(pt.gridX * TILE_SIZE + 2, pt.gridY * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);

      ctx.font = '24px sans-serif';
      ctx.fillText(pt.trap.icon, px, py);
    });

    // 5. Draw Drag Hover Ghost Box
    if (hoverGrid) {
      const gx = hoverGrid.gridX * TILE_SIZE;
      const gy = hoverGrid.gridY * TILE_SIZE;

      ctx.fillStyle = 'rgba(14, 165, 233, 0.35)';
      ctx.fillRect(gx + 2, gy + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.strokeRect(gx + 2, gy + 2, TILE_SIZE - 4, TILE_SIZE - 4);

      ctx.font = '26px sans-serif';
      ctx.fillText(selectedTrap.icon, gx + TILE_SIZE / 2, gy + TILE_SIZE / 2);
    }

    // 6. Draw Local Player
    ctx.font = '30px sans-serif';
    ctx.fillText(selectedChar.icon, localPlayer.x, localPlayer.y);

    // 7. Draw Remote Player (Online Mode Only)
    if (mode === 'online' && isPeerConnected) {
      ctx.font = '30px sans-serif';
      ctx.fillText(remotePlayer.icon, remotePlayer.x, remotePlayer.y);
      ctx.fillStyle = '#0284c7';
      ctx.font = '11px sans-serif';
      ctx.fillText('對手 (P2P)', remotePlayer.x, remotePlayer.y - 24);
    }
  };

  // Continuous Animation Loop for Smooth 60 FPS Rendering
  const gameLoop = () => {
    drawStage();

    if (isRacing) {
      // Simulate simple Movement Run
      if (localPlayer.x < 480) {
        localPlayer.x += selectedChar.speed * 0.6;
        if (localPlayer.x > 180 && localPlayer.y > 220) {
          localPlayer.y -= 1.8; // jump curve
        }
      }

      // Broadcast 60 FPS Movement Packet via WebRTC DataChannel
      if (mode === 'online' && isPeerConnected) {
        sendMovementState(localPlayer.x, localPlayer.y, localPlayer.vx, localPlayer.vy, 'run');
      }
    }

    animFrameId = requestAnimationFrame(gameLoop);
  };

  animFrameId = requestAnimationFrame(gameLoop);

  // Drag & Drop Traps Event Handlers
  let draggedTrapId = null;

  container.querySelectorAll('.trap-select-item').forEach(item => {
    item.addEventListener('click', () => {
      container.querySelectorAll('.trap-select-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const trapId = parseInt(item.dataset.trapId, 10);
      selectedTrap = TRAP_ITEMS.find(t => t.id === trapId);
      draggedTrapId = trapId;

      showToast(`已選中：${selectedTrap.name}`, 'info');
    });

    item.addEventListener('dragstart', (e) => {
      const trapId = parseInt(item.dataset.trapId, 10);
      draggedTrapId = trapId;
      selectedTrap = TRAP_ITEMS.find(t => t.id === trapId);

      container.querySelectorAll('.trap-select-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      item.classList.add('is-dragging');

      e.dataTransfer.setData('text/plain', trapId.toString());
      e.dataTransfer.effectAllowed = 'copy';
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('is-dragging');
      hoverGrid = null;
    });
  });

  // Drop Zone Handlers
  if (dropZone && canvas) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const relX = (e.clientX - rect.left) * scaleX;
      const relY = (e.clientY - rect.top) * scaleY;

      if (relX >= 0 && relX < 640 && relY >= 0 && relY < 480) {
        const gridX = Math.floor(relX / TILE_SIZE);
        const gridY = Math.floor(relY / TILE_SIZE);
        hoverGrid = { gridX, gridY };
      }
    });

    dropZone.addEventListener('dragleave', () => {
      hoverGrid = null;
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      hoverGrid = null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const relX = (e.clientX - rect.left) * scaleX;
      const relY = (e.clientY - rect.top) * scaleY;

      if (relX >= 0 && relX < 640 && relY >= 0 && relY < 480) {
        const gridX = Math.floor(relX / TILE_SIZE);
        const gridY = Math.floor(relY / TILE_SIZE);
        const targetTrap = TRAP_ITEMS.find(t => t.id === (draggedTrapId || selectedTrap.id)) || selectedTrap;

        placedTraps = placedTraps.filter(pt => !(pt.gridX === gridX && pt.gridY === gridY));
        placedTraps.push({ id: Date.now(), trap: targetTrap, gridX, gridY });

        showToast(`🎉 成功拖放【${targetTrap.icon} ${targetTrap.name}】至 (${gridX}, ${gridY})！`, 'success');

        // Broadcast Trap Placement via WebRTC DataChannel
        if (mode === 'online' && isPeerConnected) {
          sendTrapPlacement(gridX, gridY, targetTrap.id);
        }
      }
    });
  }

  // Start Round Button
  container.querySelector('#btn-start-round')?.addEventListener('click', () => {
    isRacing = true;
    localPlayer.x = 80;
    localPlayer.y = 380;
    showToast(`🍓 ${selectedChar.name} 踩下油門！出發穿越陷阱陣！`, 'success');
  });

  return () => {
    closeFruitPeer();
    if (animFrameId) cancelAnimationFrame(animFrameId);
  };
}
