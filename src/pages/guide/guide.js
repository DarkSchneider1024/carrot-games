/**
 * Game Guide & Rulebook Page (遊戲玩法與規則說明全書)
 * Interactive tabbed rulebooks for all 4 games: Xiangqi, Tetris, Poker, and Magic Fighter 3D.
 */

import { navigate } from '../../router.js';
import { SVG_ICONS } from '../../components/icons.js';

export async function renderGameGuide(container, params = {}) {
  const defaultTab = params.game || 'xiangqi';

  container.innerHTML = `
    <div class="guide-page-container animate-fade-in">
      <!-- Header -->
      <header class="guide-header">
        <button class="btn btn-ghost btn-sm" id="btn-guide-back">
          ${SVG_ICONS.back} <span>返回遊戲大廳</span>
        </button>
        <div class="guide-header-title">
          <h2>CARROT GAMES 遊戲玩法說明大全</h2>
          <p>提供平台上 4 款對戰遊戲的詳細玩法規則、道具手冊與控制指令</p>
        </div>
      </header>

      <!-- Navigation Tabs -->
      <div class="guide-tabs-bar">
        <button class="guide-tab-btn ${defaultTab === 'xiangqi' ? 'active' : ''}" data-tab="xiangqi">
          中國象棋
        </button>
        <button class="guide-tab-btn ${defaultTab === 'tetris' ? 'active' : ''}" data-tab="tetris">
          俄羅斯方塊對戰
        </button>
        <button class="guide-tab-btn ${defaultTab === 'poker' ? 'active' : ''}" data-tab="poker">
          德州撲克
        </button>
        <button class="guide-tab-btn ${defaultTab === 'magicFighter' ? 'active' : ''}" data-tab="magicFighter">
          魔法對戰 3D
        </button>
      </div>

      <!-- Main Content Area -->
      <main class="guide-content-area glass">
        <!-- 1. Chinese Chess Guide -->
        <article class="guide-article ${defaultTab === 'xiangqi' ? 'active' : ''}" id="guide-xiangqi">
          <h3>中國象棋 (XIANGQI) 玩法與規則指南</h3>
          
          <section class="guide-section">
            <h4>1. 遊戲目標與勝負判定</h4>
            <p>中國象棋為兩方對弈棋藝，紅方先行，黑方後行。目標為透過吃子與陣型防守，將死 (Checkmate) 對方的「將/帥」，或使對方困斃 (Stalemate) 無子可走時獲勝。</p>
          </section>

          <section class="guide-section">
            <h4>2. 棋子走法與吃子規則</h4>
            <ul>
              <li><strong>帥 / 將 (General)</strong>：只能在「九宮格」內九個點直走或橫走，每次一步。雙方帥將不能在同一直線上直接對面（飛將殺）。</li>
              <li><strong>仕 / 士 (Advisor)</strong>：只能在「九宮格」內沿對角線斜走一步，負責守護九宮。</li>
              <li><strong>相 / 象 (Elephant)</strong>：沿對角線走兩步（田字格），不能過河。若「田」字中心有棋子稱為「塞象眼」，無法跳過。</li>
              <li><strong>馬 (Horse)</strong>：走「日」字格。若前進方向緊鄰有棋子稱為「蹩馬腿」，該方向無法行走。</li>
              <li><strong>車 (Chariot)</strong>：橫直皆可自由直線行走任意距離，沿途無棋子阻擋即可吃子。</li>
              <li><strong>砲 (Cannon)</strong>：移動方式與車相同；但「吃子」時必須隔著正好一個棋子（稱為「砲架」）跳過吃子。</li>
              <li><strong>兵 / 卒 (Soldier)</strong>：未過河前只能向前直走一步；過河後可向前、向左或向右走一步，不可後退。</li>
            </ul>
          </section>

          <section class="guide-section">
            <h4>3. 系統對戰模式</h4>
            <p><strong>[對戰 AI]</strong>：內建 Negamax + Alpha-Beta 剪枝 AI，提供簡單、中等、困難三種智力強度。<br/>
            <strong>[連線開房]</strong>：點擊「連線開房」產生房間網址，傳送給好友即可進行 P2P 無延遲點對點連線對弈。</p>
          </section>
        </article>

        <!-- 2. Tetris Guide -->
        <article class="guide-article ${defaultTab === 'tetris' ? 'active' : ''}" id="guide-tetris">
          <h3>俄羅斯方塊 (TETRIS BATTLE 2P) 對戰手冊</h3>

          <section class="guide-section">
            <h4>1. 經典 2 分鐘對決規則</h4>
            <p>每局比賽固定 120 秒（2 分鐘）。時間結束時，系統將計算**擊倒數 (K.O.)** 與**送出垃圾行總數**決定最終勝負；若比賽中某一方的方塊頂到天井上限，該方被擊倒 (K.O.) 並自動重置版面。</p>
          </section>

          <section class="guide-section">
            <h4>2. 消行與垃圾行攻擊反制 (Garbage Counter)</h4>
            <ul>
              <li><strong>單次消 1 行</strong>：獲得 100 分。</li>
              <li><strong>單次消 2 行</strong>：送出 1 行垃圾行給對手。</li>
              <li><strong>單次消 3 行</strong>：送出 2 行垃圾行給對手。</li>
              <li><strong>TETRIS 消 4 行</strong>：送出 4 行垃圾行給對手。</li>
              <li><strong>反制機制 (Counter)</strong>：當接收到對手的垃圾行攻擊時，若您及時進行消行，消行產生的攻擊量會優先抵消對手的攻擊垃圾行！</li>
            </ul>
          </section>

          <section class="guide-section">
            <h4>3. WASM 引擎與控制手感</h4>
            <p>採用 C / WebAssembly (tetris-engine.wasm) 打造 7-Bag 隨機與 SRS 牆踢旋轉系統。<br/>
            <strong>電腦控制</strong>：【← →】左右移動，【↑】順時針旋轉，【↓】軟降，【空白鍵 Space】硬降，【C 鍵】HOLD 暫存。<br/>
            <strong>手機控制</strong>：提供專利「單手搖桿 (Joystick)」與「虛擬按鍵 (D-Pad)」兩種觸控手感。</p>
          </section>
        </article>

        <!-- 3. Poker Guide -->
        <article class="guide-article ${defaultTab === 'poker' ? 'active' : ''}" id="guide-poker">
          <h3>德州撲克 (TEXAS HOLD'EM POKER) 規則手冊</h3>

          <section class="guide-section">
            <h4>1. 基本概念與籌碼本金</h4>
            <p>德州撲克使用 52 張標準撲克牌（不含鬼牌）。每位玩家發 2 張底牌 (Hole Cards)，與桌面上發出的 5 張公牌 (Community Cards) 組合，挑選最佳的 5 張牌組合進行比牌。<br/>
            登入帳號將具備 <strong>$1,000 初始本金紀錄</strong>，若破產系統會自動觸發救濟補滿 $1,000！</p>
          </section>

          <section class="guide-section">
            <h4>2. 牌型大小比較（由大至小）</h4>
            <ol>
              <li><strong>皇家同花順 (Royal Flush)</strong>：同花色的 A, K, Q, J, 10。</li>
              <li><strong>同花順 (Straight Flush)</strong>：同花色的 5 張連續數字。</li>
              <li><strong>四條 / 鐵支 (Four of a Kind)</strong>：4 張相同點數的牌。</li>
              <li><strong>葫蘆 (Full House)</strong>：3 張相同點數 + 1 對。</li>
              <li><strong>同花 (Flush)</strong>：5 張相同花色。</li>
              <li><strong>順子 (Straight)</strong>：5 張連續數字（不限花色）。</li>
              <li><strong>三條 (Three of a Kind)</strong>：3 張相同點數。</li>
              <li><strong>兩對 (Two Pair)</strong>：2 組不同點數的對子。</li>
              <li><strong>一對 (One Pair)</strong>：1 組相同點數的對子。</li>
              <li><strong>高牌 (High Card)</strong>：無任何組合，比較單張最大點數。</li>
            </ol>
          </section>

          <section class="guide-section">
            <h4>3. 下注環節 (Betting Rounds)</h4>
            <ul>
              <li><strong>翻牌前 (Pre-Flop)</strong>：發放 2 張底牌後開始第一輪下注。</li>
              <li><strong>翻牌 (Flop)</strong>：發出前 3 張公牌，進行第二輪下注。</li>
              <li><strong>轉牌 (Turn)</strong>：發出第 4 張公牌，進行第三輪下注。</li>
              <li><strong>河牌 (River)</strong>：發出第 5 張公牌，進行最終下注與灘牌 (Showdown)。</li>
            </ul>
          </section>
        </article>

        <!-- 4. Magic Fighter Guide -->
        <article class="guide-article ${defaultTab === 'magicFighter' ? 'active' : ''}" id="guide-magicFighter">
          <h3>魔法對戰 3D (MAGIC FIGHTER) 手冊與道具大全</h3>

          <section class="guide-section">
            <h4>1. 遊戲核心目標</h4>
            <p>傳承經典《坦克大戰 (Battle City)》靈魂，重塑為 Three.js WebGL 3D 魔法空戰對決！保護地圖底部的 <strong>蘿蔔 HQ 水晶總部</strong>，擊退一共 5 波次攻勢敵軍，保護基地不被摧毀！</p>
          </section>

          <section class="guide-section">
            <h4>2. 經典 6 大寶箱道具功能列表</h4>
            <ul>
              <li><strong>頭盔 / 護盾 (Helmet)</strong>：觸發 8 秒藍色無敵光罩，防禦所有子彈攻擊。</li>
              <li><strong>時鐘 / 定身 (Clock)</strong>：凍結全場所有敵機 6 秒，敵機停止移動與射擊。</li>
              <li><strong>手榴彈 / 全滅爆破 (Grenade / Bomb)</strong>：引爆當前全場畫面上所有敵機，獲得相應得分！</li>
              <li><strong>星星 / 火力升級 (Star)</strong>：升級戰機火力。LV.1 標準 -> LV.2 雙發子彈 -> LV.4 破鋼貫穿子彈（可打碎鋼鐵牆）。</li>
              <li><strong>鐵鏟 / 總部加固 (Shovel)</strong>：將總部四周磚牆瞬間升級為堅硬鋼鐵牆 (Steel Wall) 15 秒！</li>
              <li><strong>戰機加命 (Extra Life)</strong>：戰機生命值 HP +1（最高上限 5 HP）。</li>
            </ul>
          </section>

          <section class="guide-section">
            <h4>3. 地形與敵軍種類</h4>
            <p><strong>五大地形</strong>：紅磚牆（可打碎）、鋼鐵牆（防普通彈/貫穿彈可破）、森林樹叢（飛入半透明隱密）、冰面（滑行慣性）、水域（子彈穿透/戰機阻擋）。<br/>
            <strong>四類敵機</strong>：普通偵察機、超高速突擊機、3 HP 重型裝甲機（受擊變色）、閃爍紅光道具機（擊毀 100% 掉落隨機寶物）。</p>
          </section>

          <section class="guide-section">
            <h4>4. 手機 360° 模擬手勢搖桿</h4>
            <p>手機端左側視窗提供 360 度無死角動態虛擬搖桿，具備高速飛行回應，右側按鈕快速開火！</p>
          </section>
        </article>
      </main>
    </div>
  `;

  // Attach Event Listeners
  container.querySelector('#btn-guide-back')?.addEventListener('click', () => {
    navigate('/');
  });

  const tabBtns = container.querySelectorAll('.guide-tab-btn');
  const articles = container.querySelectorAll('.guide-article');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;

      tabBtns.forEach(b => b.classList.remove('active'));
      articles.forEach(a => a.classList.remove('active'));

      btn.classList.add('active');
      const targetArticle = container.querySelector(`#guide-${targetTab}`);
      if (targetArticle) targetArticle.classList.add('active');
    });
  });
}
