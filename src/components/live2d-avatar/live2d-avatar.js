/**
 * Live2D 神來也風格情境角色動態舞台 (ShenLaiYe-Style Interactive Live2D Avatar Controller)
 * 支援卡洛特 6 大主角立繪與各種情境觸發（思考、強勢出擊/碰槓、過牌、獲勝大贏、放槍慘敗、緊張倒數）
 */

export const LIVE2D_CHARACTERS = {
  carrot: {
    id: 'carrot',
    name: '新卡洛特',
    img: './assets/images/characters/live2d_carrot.png',
    title: '首席魔法學者',
    lines: {
      thinking: ['思考中... 計算最優解！', '這步棋理，大有深意...', '讓我想想術式組合...'],
      strike: ['出牌！魔法與牌理的完美共鳴！', '看招！無可匹敵的大牌！', '這手你擋得住嗎？！', '將！全場由我主導！'],
      pass: ['暫避鋒芒，待我重整術式。', '此回合非我節奏，先過。', '這牌太大，不宜硬碰。'],
      win: ['🎉 獲勝！一切皆在算計之中！', '🏆 牌理的終極奧義，正是如此！', '大滿貫！今天手氣與實力兼備！'],
      lose: ['😱 怎會如此？計算竟然出現誤差？！', '嗚...這局是我大意了！', '這記偷襲太過刁鑽...！'],
      urgent: ['時間緊迫！必須果決出牌！', '倒數了！就是這張！']
    }
  },
  carol: {
    id: 'carol',
    name: '新卡洛兒',
    img: './assets/images/characters/live2d_carol.png',
    title: '甜美守護者',
    lines: {
      thinking: ['嗯～要出哪一張呢？', '等等卡洛兒一下下嘛～', '看我挑一張最厲害的！'],
      strike: ['接招囉～可別小看卡洛兒！', '閃亮登場！這手超級強！', '這張大牌你一定壓不住！', '哼哼～看我的厲害！'],
      pass: ['好啦好啦～這次就先讓給你！', '這張好大，卡洛兒先跳過～', '先忍一手，下把再算帳！'],
      win: ['🎉 太棒啦！卡洛兒贏囉，耶～！', '🏆 獎金都歸卡洛兒！今晚慶祝！', '好開心！卡洛特家族最強！'],
      lose: ['嗚哇～怎麼會這樣啦！', '放槍給壞人了啦...哭哭！', '下次一定要贏回來！'],
      urgent: ['呀！倒數快結束了啦！', '好緊張好緊張～出這張！']
    }
  },
  aubergine: {
    id: 'aubergine',
    name: '新歐蓓樂希',
    img: './assets/images/characters/live2d_aubergine.png',
    title: '星象牌理教授',
    lines: {
      thinking: ['星辰之律動，正在推演命運。', '且看星圖，盤算時機。', '萬象變幻，需得靜觀。'],
      strike: ['星象爆發！此牌註定支配全場！', '天星齊聚，不可逆轉！', '爾等唯有臣服於此手！', '命運之將軍，落定！'],
      pass: ['星光微晦，且看爾等起伏。', '時機未至，先退一步。', '優雅的隱忍，是為了下次絕殺。'],
      win: ['🎉 星象早已揭示，勝利本屬必然。', '🏆 感謝諸位陪襯，這份榮耀收下了。', '天意如此，無人可擋。'],
      lose: ['嘖...居然被逆位愚者鑽了空子。', '星盤竟然微偏了一毫秒...！', '失算...下回定當嚴懲！'],
      urgent: ['命運之輪在催促了！', '星象示警，速決！']
    }
  },
  bobo: {
    id: 'bobo',
    name: '兔子波波',
    img: './assets/images/characters/live2d_bobo.png',
    title: '軟萌冒險家',
    lines: {
      thinking: ['抖抖兔耳～讓波波選一張！', '胡蘿蔔在哪裡？波波在想要出啥！', '轉動小腦袋，思考思考～'],
      strike: ['看波波這招跳跳胡蘿蔔大爆發！', '碰！蹦蹦跳跳大出擊！', '哇哈哈！這張牌超級無敵大！', '給波波壓住！誰也別想過！'],
      pass: ['嗚嗚～這張太大波波打不過啦！', '波波要不起，先吃個蘿蔔乾！', '溜了溜了～下輪看我的！'],
      win: ['🎉 耶～胡蘿蔔大豐收！吃大餐囉！', '🏆 波波是第一名！好幸福呀！', '滿滿的金幣～全部抱回家！'],
      lose: ['呀啊！踩到陷阱啦～痛痛痛！', '波波的胡蘿蔔被搶走啦～嗚嗚！', '大壞蛋～波波放槍了啦！'],
      urgent: ['哇啊啊！秒數要跑完啦！', '跳起來出牌！快快快！']
    }
  },
  frenchie: {
    id: 'frenchie',
    name: '可頌',
    img: './assets/images/characters/live2d_frenchie.png',
    title: '鬥牛犬紳士',
    lines: {
      thinking: ['紳士的牌局，講究優雅沉思。', '嗯...品味這一局的起伏。', '不疾不徐，方顯風度。'],
      strike: ['Bon appétit！這手大牌無可匹敵！', '以法式優雅，給予精準一擊！', '這記重拳，閣下能否招架？', '將軍！優雅的終局！'],
      pass: ['無妨，優雅退讓亦是風度。', '閣下手氣正旺，我且避讓。', '先留實力，靜候良機。'],
      win: ['🎉 完美！這場牌局的終極勝利！', '🏆 優雅至極，滿盤皆贏！', '感謝各位的款待，承讓！'],
      lose: ['噢，Mon dieu！居然被將了一軍...', '哎呀...紳士的顏面有些掛不住了。', '這記失誤...真是痛徹心扉。'],
      urgent: ['時間不等人，出這張了！', '刻不容緩，優雅落子！']
    }
  },
  kiwi: {
    id: 'kiwi',
    name: '奇異貓',
    img: './assets/images/characters/live2d_kiwi.png',
    title: '機靈小美短',
    lines: {
      thinking: ['喵呼～小爪子撥一撥，選哪張好？', '本喵正在盤算獵物呢，喵～', '胡蘿蔔圍巾動一動，喵想想～'],
      strike: ['喵嗚！看本喵的無影貓爪暴擊！', '這張大牌一出，嚇壞你們，喵！', '喵哈！誰敢壓本喵的牌？！', '爪子出鞘！吃我一擊喵！'],
      pass: ['喵...爪子打滑，先放過你們！', '這牌扎手，本喵先不接！', '喵嗚～過就過，下把抓你！'],
      win: ['🎉 喵哈哈！小魚乾跟金幣全是我的！', '🏆 本喵果然是全宇宙最聰明的貓！', '胡啦！喵嗚大勝利～！'],
      lose: ['喵嗚？！我的小魚乾全飛走了～！', '放槍了啦！是誰害本喵的？！', '嗚喵～炸毛了啦！痛死了！'],
      urgent: ['喵呀！倒數要咬到尾巴了！', '隨便抓一張丟出去，喵！']
    }
  }
};

/**
 * 創建 Live2D 神來也情境角色動態元件
 */
export class Live2dAvatar {
  /**
   * @param {Object} options
   * @param {HTMLElement|string} options.container - 欲掛載的 DOM 容器
   * @param {string} options.characterId - 'carrot' | 'carol' | 'aubergine' | 'bobo' | 'frenchie' | 'kiwi'
   * @param {string} [options.name] - 顯示的名字
   * @param {'bottom'|'top'|'left'|'right'} [options.bubblePos='bottom'] - 對話氣泡彈出方位
   * @param {'sm'|'md'|'lg'} [options.size='md'] - 舞台尺寸
   * @param {boolean} [options.isTurn=false] - 是否當前回合
   */
  constructor(options = {}) {
    this.container = typeof options.container === 'string'
      ? document.querySelector(options.container)
      : options.container;

    this.charDef = LIVE2D_CHARACTERS[options.characterId] || LIVE2D_CHARACTERS.carrot;
    this.name = options.name || this.charDef.name;
    this.bubblePos = options.bubblePos || 'bottom';
    this.size = options.size || 'md';
    this.currentEmotion = 'idle';
    this.timer = null;
    this.bubbleTimer = null;

    this.initDOM(options.isTurn);
  }

  initDOM(isTurn = false) {
    if (!this.container) return;

    this.rootEl = document.createElement('div');
    this.rootEl.className = `live2d-avatar-container bubble-pos-${this.bubblePos} state-idle ${isTurn ? 'is-turn' : ''}`;

    const sizeClass = this.size === 'sm' ? 'stage-sm' : (this.size === 'lg' ? 'stage-lg' : '');

    this.rootEl.innerHTML = `
      <!-- 對話台詞氣泡 -->
      <div class="live2d-speech-bubble" id="l2d-bubble"></div>

      <!-- 神來也立繪半身舞台 -->
      <div class="live2d-stage ${sizeClass}">
        <!-- 特效層 (冷汗、星芒、金幣) -->
        <div class="live2d-fx-layer">
          <div class="fx-sweat"></div>
          <div class="fx-sparkle">
            <svg viewBox="0 0 24 24" fill="#f59e0b">
              <polygon points="12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9" />
            </svg>
          </div>
          <div class="fx-coins">
            <div class="fx-coin-particle"></div>
            <div class="fx-coin-particle"></div>
            <div class="fx-coin-particle"></div>
          </div>
        </div>

        <!-- 角色動態層 -->
        <div class="live2d-char-wrap">
          <img src="${this.charDef.img}" alt="${this.name}" class="live2d-char-img" />
        </div>

        <!-- 底部角色名牌 -->
        <div class="live2d-nameplate">
          <span class="live2d-name-text">${this.name}</span>
        </div>
      </div>
    `;

    this.container.innerHTML = '';
    this.container.appendChild(this.rootEl);

    this.bubbleEl = this.rootEl.querySelector('.live2d-speech-bubble');
    this.charWrapEl = this.rootEl.querySelector('.live2d-char-wrap');
  }

  /**
   * 觸發情境動作與表情
   * @param {'idle'|'thinking'|'strike'|'pass'|'win'|'lose'|'urgent'} emotion
   * @param {string} [customText] - 自訂台詞氣泡（若未提供則從角色語錄庫隨機抽取）
   * @param {number} [durationMs=2800] - 持續時間後恢復 idle
   */
  setEmotion(emotion = 'idle', customText = null, durationMs = 2800) {
    if (!this.rootEl) return;

    this.currentEmotion = emotion;

    // 清除既有情緒 class
    this.rootEl.classList.remove(
      'state-idle', 'state-thinking', 'state-strike',
      'state-pass', 'state-win', 'state-lose', 'state-urgent'
    );
    this.rootEl.classList.add(`state-${emotion}`);

    // 設定對話氣泡台詞
    let textToSay = customText;
    if (textToSay === null && emotion !== 'idle') {
      const linePool = this.charDef.lines[emotion];
      if (linePool && linePool.length > 0) {
        textToSay = linePool[Math.floor(Math.random() * linePool.length)];
      }
    }

    if (textToSay) {
      this.say(textToSay, emotion, durationMs);
    } else {
      this.hideBubble();
    }

    clearTimeout(this.timer);
    if (emotion !== 'idle' && durationMs > 0) {
      this.timer = setTimeout(() => {
        if (this.currentEmotion === emotion) {
          this.setEmotion('idle', null, 0);
        }
      }, durationMs);
    }
  }

  /**
   * 彈出動態對話氣泡
   * @param {string} text
   * @param {string} [type='thinking']
   * @param {number} [durationMs=2800]
   */
  say(text, type = 'thinking', durationMs = 2800) {
    if (!this.bubbleEl) return;

    this.bubbleEl.className = `live2d-speech-bubble type-${type} active`;
    this.bubbleEl.textContent = text;

    clearTimeout(this.bubbleTimer);
    if (durationMs > 0) {
      this.bubbleTimer = setTimeout(() => {
        this.hideBubble();
      }, durationMs);
    }
  }

  hideBubble() {
    if (this.bubbleEl) {
      this.bubbleEl.classList.remove('active');
    }
  }

  /**
   * 設定回合高光
   * @param {boolean} isTurn
   */
  setTurn(isTurn) {
    if (!this.rootEl) return;
    this.rootEl.classList.toggle('is-turn', !!isTurn);
    if (isTurn && this.currentEmotion === 'idle') {
      this.setEmotion('thinking', null, 3500);
    }
  }

  /**
   * 更新名字
   * @param {string} newName
   */
  setName(newName) {
    this.name = newName;
    const nameText = this.rootEl?.querySelector('.live2d-name-text');
    if (nameText) nameText.textContent = newName;
  }

  destroy() {
    clearTimeout(this.timer);
    clearTimeout(this.bubbleTimer);
    if (this.rootEl && this.rootEl.parentNode) {
      this.rootEl.parentNode.removeChild(this.rootEl);
    }
  }
}

