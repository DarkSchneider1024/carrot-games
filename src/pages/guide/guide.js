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
          <p>提供平台上 5 款對戰遊戲的詳細玩法規則、道具手冊與控制指令</p>
        </div>
      </header>

      <!-- Navigation Tabs -->
      <div class="guide-tabs-bar">
        <button class="guide-tab-btn ${defaultTab === 'bigTwo' ? 'active' : ''}" data-tab="bigTwo" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;">
          ♠ 台灣大老二
        </button>
        <button class="guide-tab-btn ${defaultTab === 'mahjong' ? 'active' : ''}" data-tab="mahjong">
          🀄 台灣16張麻將
        </button>
        <button class="guide-tab-btn ${defaultTab === 'fruitHavoc' ? 'active' : ''}" data-tab="fruitHavoc">
          🍓 水果極限闖關
        </button>
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
        <button class="guide-tab-btn ${defaultTab === 'bomberman' ? 'active' : ''}" data-tab="bomberman" style="background:linear-gradient(135deg,#ff7544,#e11d48);color:#fff;border:none;">
          🐉 土星炸彈人
        </button>
      </div>

      <!-- Main Content Area -->
      <main class="guide-content-area">
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
          <h3>魔法對戰 3D (MAGIC FIGHTER) 角色與技能全書</h3>

          <section class="guide-section">
            <h4>1. 遊戲核心目標與戰局簡介</h4>
            <p>傳承經典《坦克大戰 (Battle City)》靈魂，重塑為 Three.js WebGL 3D 魔法空戰對決！玩家駕駛橘黑雙色賽亞戰機，保護地圖底部的 <strong>蘿蔔 HQ 水晶總部</strong>，擊退一共 5 波次攻勢敵軍，保護基地不被摧毀！</p>
          </section>

          <!-- 3D 角色與技能特刊 (3D Character & Skill Showcase) -->
          <section class="guide-section">
            <h4>2. 3D 魔法角色與敵對陣營說明特刊</h4>
            <div class="guide-character-grid">
              <!-- Card 1: 魔法師卡洛特 -->
              <div class="character-card">
                <div class="character-img-wrapper">
                  <img src="./assets/images/characters/mr_carrot_mage.webp" alt="魔法師卡洛特" class="character-img" />
                  <span class="character-tag">玩家主控英雄</span>
                </div>
                <div class="character-info">
                  <div class="character-header">
                    <h5 class="character-name">魔法師卡洛特 (Carrot Mage)</h5>
                  </div>
                  <div class="character-stats-row">
                    <span>速度: <strong>6.5</strong></span>
                    <span>血量: <strong>5 HP</strong></span>
                    <span>出發: <strong>水晶基地</strong></span>
                  </div>
                  <p class="character-desc">身披星空法袍，手握星光法杖。具備靈活法術平移與連發奧術飛彈能力，誓死捍衛小鎮總部水晶。</p>
                  <div class="character-skill-box">
                    <span class="skill-title">專屬技能：奧術共鳴升級 (Arcane Burst)</span>
                    <p class="skill-desc">拾取星星即可激發金黃奧術氣場！LV.1 升級雙發法術彈，LV.3 解鎖【貫穿奧術彈】，可一擊粉碎堅硬障礙！</p>
                  </div>
                </div>
              </div>

              <!-- Card 2: 兔子波波 / 守衛 -->
              <div class="character-card">
                <div class="character-img-wrapper">
                  <img src="./assets/images/characters/guard.webp" alt="小鎮守衛" class="character-img" />
                  <span class="character-tag">友方防衛先鋒</span>
                </div>
                <div class="character-info">
                  <div class="character-header">
                    <h5 class="character-name">小鎮鋼鐵守衛 (Town Guard)</h5>
                  </div>
                  <div class="character-stats-row">
                    <span>速度: <strong>4.0</strong></span>
                    <span>血量: <strong>4 HP</strong></span>
                    <span>消耗: <strong>100 Mana</strong></span>
                  </div>
                  <p class="character-desc">全副武裝的皇家守衛，手持長盾防禦線。玩家可消耗 100 瑪那魔力召喚出陣，向敵陣正面衝鋒。</p>
                  <div class="character-skill-box">
                    <span class="skill-title">專屬技能：盾牌結陣推進 (Shield March)</span>
                    <p class="skill-desc">高頻率揮盾射擊，具備強大的中距離火力壓制與護衛水晶效果！</p>
                  </div>
                </div>
              </div>

              <!-- Card 3: 黑森林魔狼王 -->
              <div class="character-card">
                <div class="character-img-wrapper">
                  <img src="./assets/images/characters/journey_magic_wolf.webp" alt="黑森林魔狼王" class="character-img" />
                  <span class="character-tag">重裝 BOSS</span>
                </div>
                <div class="character-info">
                  <div class="character-header">
                    <h5 class="character-name">黑森林魔狼王 (Magic Wolf King)</h5>
                  </div>
                  <div class="character-stats-row">
                    <span>速度: <strong>2.2</strong></span>
                    <span>血量: <strong>10 HP</strong></span>
                    <span>生成: <strong>北方法陣</strong></span>
                  </div>
                  <p class="character-desc">率領群狼來犯的黑森林巨獸領袖。具備極高的生存血量與破壞衝撞力。</p>
                  <div class="character-skill-box">
                    <span class="skill-title">專屬技能：暗影咆哮連彈 (Shadow Roar)</span>
                    <p class="skill-desc">10 HP 超高防禦。近身對水晶基地造成毀滅傷害，遠距離持續釋放暗影魔球！</p>
                  </div>
                </div>
              </div>
                </div>
              </div>
            </div>
          </section>

          <!-- 地形與建物說明 (包含 3D 國泰人壽大樹) -->
          <section class="guide-section">
            <h4>3. 3D 地形與地圖要素介紹</h4>
            <ul>
              <li><strong>🌳 國泰人壽大樹 (Cathay Life Tree - Forest)</strong>：經典圓弧造型大樹冠與寬底樹幹！戰機飛入樹冠可享受半透明迷霧防禦，避開敵人雷射鎖定。</li>
              <li><strong>🏰 中世紀城垛石牆 (Battlement Stone Wall)</strong>：由溫暖石灰岩與頂部城垛口構成，可抵擋一般子彈防護基地。</li>
              <li><strong>🛡️ 鋼鐵地堡 (Steel Bunker)</strong>：極致防禦地堡，普通子彈無法打穿，唯有賽亞戰機 LV.3 貫穿能量彈可將其擊碎。</li>
              <li><strong>🧊 冰面 (Ice Field)</strong>：飛行行經冰面可獲得 1.3 倍極速滑行加速效果！</li>
              <li><strong>🌊 藍晶水域 (Water Zone)</strong>：戰機與空中怪物可飛越，但地面裝甲無法跨越，子彈可直接穿透水面。</li>
            </ul>
          </section>

          <section class="guide-section">
            <h4>4. 經典 6 大寶箱道具功能列表</h4>
            <ul>
              <li><strong>頭盔 / 護盾 (Helmet)</strong>：觸發 8 秒藍色無敵光罩，防禦所有子彈攻擊。</li>
              <li><strong>時鐘 / 定身 (Clock)</strong>：凍結全場所有敵機 6 秒，敵機停止移動與射擊。</li>
              <li><strong>手榴彈 / 全滅爆破 (Grenade / Bomb)</strong>：引爆當前全場畫面上所有敵機，獲得相應得分！</li>
              <li><strong>星星 / 火力升級 (Star)</strong>：升級戰機火力。LV.1 標準 -> LV.2 雙發子彈 -> LV.3 破鋼貫穿子彈（可打碎鋼鐵牆）。</li>
              <li><strong>鐵鏟 / 總部加固 (Shovel)</strong>：將總部四周磚牆瞬間升級為堅硬鋼鐵牆 (Steel Wall) 15 秒！</li>
              <li><strong>戰機加命 (Extra Life)</strong>：戰機生命值 HP +1（最高上限 5 HP）。</li>
            </ul>
          </section>
        </article>

        <!-- 5. Fruit Havoc Guide -->
        <article class="guide-article ${defaultTab === 'fruitHavoc' ? 'active' : ''}" id="guide-fruitHavoc">
          <h3>🍓 水果極限闖關 (FRUIT EXTREME) — 派對對戰手冊</h3>

          <section class="guide-section">
            <h4>1. 遊戲核心玩法與《超級雞馬》對戰機制</h4>
            <p>《水果極限闖關》是一款橫向平台派對競速對戰遊戲！玩家們輪流或同時在關卡地圖中<strong>自由擺放陷阱與助攻道具</strong>，擺放完畢後一齊衝向終點蛋糕旗！<br/>
            <strong>得分規則</strong>：如果所有人通通順利抵達終點，或所有人通通陣亡，則該輪「沒有人得分」；唯有<strong>成功穿越自己或朋友設置的危險陷阱到達終點</strong>，才能獲得勝場積分！</p>
          </section>

          <!-- 5 大小鎮冒險角色圖鑑 -->
          <section class="guide-section">
            <h4>2. 5 大小鎮冒險角色圖鑑</h4>
            <div class="guide-character-grid">
              <!-- Card 1: 魔法師卡洛特 -->
              <div class="character-card">
                <div class="character-img-wrapper">
                  <img src="./assets/images/characters/mr_carrot_mage.webp" alt="魔法師卡洛特" class="character-img" />
                  <span class="character-tag">魔法型</span>
                </div>
                <div class="character-info">
                  <div class="character-header">
                    <h5 class="character-name">魔法師卡洛特 (Carrot Mage)</h5>
                  </div>
                  <div class="character-stats-row">
                    <span>速度: <strong>5.2</strong></span>
                    <span>跳躍: <strong>13.0</strong></span>
                    <span>性格: <strong>睿智沈穩</strong></span>
                  </div>
                  <p class="character-desc">身披星空法袍的卡洛特魔法師，手持魔杖守護小鎮。具備瞬發奧術與輕盈的跳躍步伐。</p>
                  <div class="character-skill-box">
                    <span class="skill-title">專屬天賦：奧術星辰跳躍 (Star Dash)</span>
                    <p class="skill-desc">觸發陷阱瞬間有一定機率展開星光護盾，短暫平移避開致命傷害。</p>
                  </div>
                </div>
              </div>

              <!-- Card 2: 兔子波波 -->
              <div class="character-card">
                <div class="character-img-wrapper">
                  <img src="./assets/images/characters/bobo_v3.webp" alt="兔子波波" class="character-img" />
                  <span class="character-tag">敏捷型</span>
                </div>
                <div class="character-info">
                  <div class="character-header">
                    <h5 class="character-name">兔子波波 (Bobo the Rabbit)</h5>
                  </div>
                  <div class="character-stats-row">
                    <span>速度: <strong>5.6</strong></span>
                    <span>跳躍: <strong>13.5</strong></span>
                    <span>性格: <strong>活力滿點</strong></span>
                  </div>
                  <p class="character-desc">小鎮最具活力的兔族夥伴，身手矯健，擅長在複雜地形中極速穿梭。</p>
                  <div class="character-skill-box">
                    <span class="skill-title">專屬天賦：極限高空彈跳 (Super Leap)</span>
                    <p class="skill-desc">具備全小鎮最強勁的彈跳高度，空中可直接越過巨型高牆與深淵防線。</p>
                  </div>
                </div>
              </div>

              <!-- Card 3: 卡洛兒姐姐 -->
              <div class="character-card">
                <div class="character-img-wrapper">
                  <img src="./assets/images/characters/carol_v3.webp" alt="卡洛兒姐姐" class="character-img" />
                  <span class="character-tag">均衡型</span>
                </div>
                <div class="character-info">
                  <div class="character-header">
                    <h5 class="character-name">卡洛兒姐姐 (Carol)</h5>
                  </div>
                  <div class="character-stats-row">
                    <span>速度: <strong>4.8</strong></span>
                    <span>跳躍: <strong>13.0</strong></span>
                    <span>性格: <strong>溫柔沉著</strong></span>
                  </div>
                  <p class="character-desc">小鎮大家庭的守護者，兼具優雅與智慧，最懂得平穩應對各種未知突發考驗。</p>
                  <div class="character-skill-box">
                    <span class="skill-title">專屬天賦：穩健跑酷步伐 (Steady Steps)</span>
                    <p class="skill-desc">步伐扎實，在光滑冰面或窄橋平台不易打滑，大幅提升跑酷容錯率。</p>
                  </div>
                </div>
              </div>

              <!-- Card 4: 科學家卡洛特 -->
              <div class="character-card">
                <div class="character-img-wrapper">
                  <img src="./assets/images/characters/mr_carrot_sci.webp" alt="科學家卡洛特" class="character-img" />
                  <span class="character-tag">重裝型</span>
                </div>
                <div class="character-info">
                  <div class="character-header">
                    <h5 class="character-name">科學家卡洛特 (Carrot Scientist)</h5>
                  </div>
                  <div class="character-stats-row">
                    <span>速度: <strong>4.2</strong></span>
                    <span>跳躍: <strong>12.0</strong></span>
                    <span>性格: <strong>嚴謹理性</strong></span>
                  </div>
                  <p class="character-desc">隨身佩戴護目鏡與發明工具箱的博學者，擅長分析機關結構與物理特性。</p>
                  <div class="character-skill-box">
                    <span class="skill-title">專屬天賦：重裝護甲霸體 (Iron Armor)</span>
                    <p class="skill-desc">受到第一次輕微障礙（如黏液或小衝擊）時不產生硬直，直接霸體穩定通過。</p>
                  </div>
                </div>
              </div>

              <!-- Card 5: 琳達喵 -->
              <div class="character-card">
                <div class="character-img-wrapper">
                  <img src="./assets/images/characters/linda_nyan.webp" alt="琳達喵" class="character-img" />
                  <span class="character-tag">滑翔型</span>
                </div>
                <div class="character-info">
                  <div class="character-header">
                    <h5 class="character-name">琳達喵 (Linda Nyan)</h5>
                  </div>
                  <div class="character-stats-row">
                    <span>速度: <strong>5.4</strong></span>
                    <span>跳躍: <strong>13.5</strong></span>
                    <span>性格: <strong>靈巧自信</strong></span>
                  </div>
                  <p class="character-desc">身手如貓般敏捷優雅的小鎮夥伴，能在空中施展靈巧姿態輕盈滯空。</p>
                  <div class="character-skill-box">
                    <span class="skill-title">專屬天賦：輕盈踏空滑翔 (Glide Landing)</span>
                    <p class="skill-desc">墜落時可維持低速滯空滑行，輕鬆跨越超遠距離斷崖並安全降落。</p>
                  </div>
                </div>
              </div>
                  </div>
                  <div class="character-stats-row">
                    <span>速度: <strong>8.0</strong></span>
                    <span>跳躍: <strong>7.5</strong></span>
                    <span>性格: <strong>賣萌自戀</strong></span>
                  </div>
                  <p class="character-desc">深紫晶瑩葡萄串小飛鼠，帶著大蓬鬆大尾巴與賣萌眼神。喜歡在空中展示滑翔美姿。</p>
                  <div class="character-skill-box">
                    <span class="skill-title">🍇 專屬天賦：葡萄空降滑翔 (Grape Glide)</span>
                    <p class="skill-desc">空中長按跳躍鍵可展開滑翔翼慢速滯空，輕鬆橫跨深淵與長距離地底陷阱區！</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- 20 個障礙與助攻道具全集圖鑑 -->
          <section class="guide-section">
            <h4>3. 20 個障礙與助攻道具全集圖鑑</h4>
            <ul>
              <li><strong>1. 🥊 彈簧拳擊手套 (Spring Boxing Glove)</strong>：踏過時向前方猛力彈出拳擊手套，將玩家直接擊飛！</li>
              <li><strong>2. 🪚 草莓電鋸擺錘 (Strawberry Saw Pendulum)</strong>：懸掛於半空中來回擺動的可愛旋轉電鋸，切中即陣亡。</li>
              <li><strong>3. 🍌 香蕉皮滑行區 (Banana Peel Trap)</strong>：踩上去瞬間失控向前滑行，滑行期間無法進行跳躍。</li>
              <li><strong>4. 🍯 蜂蜜黏黏膠 (Honey Sticky Mud)</strong>：濃稠的甜蜜泥沼，踩中玩家移動速度大幅降低 70%。</li>
              <li><strong>5. 💣 西瓜大砲 (Watermelon Cannon)</strong>：定時向前方發射重型西瓜子砲彈，可破壞阻擋木箱。</li>
              <li><strong>6. 🌪️ 龍捲風漩渦 (Fruit Whirlwind)</strong>：產生高空向上強勁風場，將經過的玩家直接吹升至高空。</li>
              <li><strong>7. 🏹 葡萄十字弩 (Grape Crossbow)</strong>：感應式紅外線弩箭，玩家路過時瞬間發射連環葡萄箭矢。</li>
              <li><strong>8. 🌵 仙人掌刺球 (Cactus Spike Ball)</strong>：懸掛或地滑滾動的植物刺球，觸碰即產生致命傷。</li>
              <li><strong>9. 🍄 超高跳跳菇 (Super Bounce Mushroom)</strong>：高彈力蘑菇踏板，踩踏後向上 3 倍高高彈跳！</li>
              <li><strong>10. ⚡ 雷電檸檬 (Electric Lemon Trap)</strong>：觸發後向周圍 360 度釋放黃色電流，使玩家暫時麻痺。</li>
              <li><strong>11. 🌀 奇異果傳送門 (Kiwi Portal Gate)</strong>：成對的入口與出口傳送門，可瞬間將玩家轉移位置。</li>
              <li><strong>12. 🧊 冰棒極速檔板 (Popsicle Ice Wall)</strong>：光滑無比的冰面高牆，可順利滑牆降落或阻擋路徑。</li>
              <li><strong>13. 🕳️ 黑洞塌陷箱 (Pitfall Trap Box)</strong>：看似堅固的木箱踏板，踩上去 0.5 秒後瞬間坍榻破裂！</li>
              <li><strong>14. 扇 強力大風扇 (Giant Fruit Fan)</strong>：持續向左或右吹出強風干擾跳躍軌跡。</li>
              <li><strong>15. 🍒 櫻桃雷射炮塔 (Cherry Laser Turret)</strong>：360 度旋轉掃射紅外線能量極光光束。</li>
              <li><strong>16. 🎈 飄飄熱氣球 (Floating Balloon Platform)</strong>：浮空移動平台，隨著踩踏停留時間過長會緩緩下降。</li>
              <li><strong>17. 🛡️ 椰子防禦盾 (Coconut Shield Barrier)</strong>：硬度極高的堅固壁壘，可完全阻擋弩箭與砲彈。</li>
              <li><strong>18. 🧲 蘋果極性磁鐵 (Apple Magnet)</strong>：強烈吸引或排斥周圍的水果玩家，改變飛行軌跡。</li>
              <li><strong>19. 🏃 履帶跑道 (Conveyor Belt Track)</strong>：滾動傳送帶，大幅提升 forward 加速度或倒退阻礙。</li>
              <li><strong>20. 🏆 草莓蛋糕終點旗 (Fruit Cake Goal Flag)</strong>：關卡最終終點站！率先成功抵達且通過陷阱考驗者獲得高分！</li>
            </ul>
          </section>
        </article>

        <!-- Saturn Bomberman Guide -->
        <article class="guide-article ${defaultTab === 'bomberman' ? 'active' : ''}" id="guide-bomberman">
          <h3>土星炸彈人 (SATURN BOMBERMAN) 玩法與道具對照手冊</h3>

          <section class="guide-section">
            <h4>1. 遊戲目標與勝負條件</h4>
            <p>經典 13×13 網格炸彈超人！放置炸彈引爆破壞軟質木塊，消滅地圖上的怪獸敵人，炸出隱藏的「出口門」並順利走入即可通關！故事模式包含 5 大關卡與最後一關 BOSS 戰，具備星等評分機制。</p>
          </section>

          <section class="guide-section">
            <h4>2. 🐉 獨家騎龍載具系統</h4>
            <ul>
              <li><strong>騎龍機制</strong>：破壞方塊後掉落「龍蛋」，踩上去自動騎上龍。</li>
              <li><strong>龍能力增幅</strong>：移動速度提升 50%、騎乘瞬間獲得 2 秒無敵、碰撞敵人可進行踐踏傷害。</li>
              <li><strong>防禦擋傷</strong>：被火焰爆炸波及時，龍會自動替玩家吸收一次致死傷害（龍消失，玩家存活並給予短暫無敵脫離火場）。</li>
              <li><strong>自由放置炸彈</strong>：騎龍狀態下亦可正常放置炸彈攻擊！</li>
              <li><strong>下龍與騎回</strong>：按下龍鍵（P1: Q / P2: Numpad .）可隨時下龍，龍會留在原地待命 20 秒，走回去即可再次騎乘。</li>
            </ul>
          </section>

          <section class="guide-section">
            <h4>3. 💣 道具與控制指令</h4>
            <ul>
              <li>💣 <strong>炸彈 +1</strong>：增加可同時放置的炸彈上限。</li>
              <li>🔥 <strong>火力 +1</strong>：擴大爆炸十字延伸範圍。</li>
              <li>💨 <strong>速度提升</strong>：增加步行移動速度。</li>
              <li>🐉 <strong>龍蛋</strong>：獲得一條龍載具。</li>
              <li>⚡ <strong>快速引爆</strong>：縮短炸彈倒計時。</li>
              <li>🎯 <strong>遠程引爆</strong>：再按一次放彈鍵手動引爆。</li>
              <li>🛡️ <strong>保險箱</strong>：一次獲得炸彈 +1、火力 +1 與速度。</li>
            </ul>
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
