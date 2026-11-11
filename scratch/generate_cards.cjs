const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const outDir = path.resolve(__dirname, '../public/assets/images/cards');
const artDir = path.resolve(__dirname, '../public/assets/images');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const CARDS = [
  {
    id: 'card_bigtwo',
    bg: 'town/town.webp',
    tint: 'linear-gradient(135deg, rgba(234, 88, 12, 0.4), rgba(30, 27, 75, 0.6))',
    badge: '卡洛特棋牌 ｜ 智慧對決',
    badgeBg: 'rgba(234, 88, 12, 0.25)',
    badgeColor: '#fb923c',
    title: '台灣大老二',
    desc: '經典 13 張大老二，與魔法師卡洛特和波波展開智慧出牌較量',
    charPri: 'characters/mr_carrot_mage.webp',
    charSec: 'characters/bobo_v3.webp'
  },
  {
    id: 'card_mahjong',
    bg: 'town/interior.webp',
    tint: 'linear-gradient(135deg, rgba(13, 148, 136, 0.45), rgba(15, 23, 42, 0.65))',
    badge: '卡洛特桌遊 ｜ 台灣十六張',
    badgeBg: 'rgba(13, 148, 136, 0.25)',
    badgeColor: '#2dd4bf',
    title: '台灣十六張麻將',
    desc: '正宗台牌規則，與卡洛兒姐姐和琳達喵享受摸牌聽牌胡牌樂趣',
    charPri: 'characters/carol_v3.webp',
    charSec: 'characters/linda_nyan.webp'
  },
  {
    id: 'card_xiangqi',
    bg: 'town/end_good.webp',
    tint: 'linear-gradient(135deg, rgba(220, 38, 38, 0.45), rgba(202, 138, 4, 0.45))',
    badge: '傳統棋藝 ｜ 楚河漢界',
    badgeBg: 'rgba(220, 38, 38, 0.25)',
    badgeColor: '#f87171',
    title: '台灣象棋與暗棋',
    desc: '齊天大聖與二郎神各顯神通，正統象棋推演與翻翻棋趣味大戰',
    charPri: 'characters/journey_wukong.webp',
    charSec: 'characters/journey_erlang.webp'
  },
  {
    id: 'card_tetris',
    bg: 'town/town.webp',
    tint: 'linear-gradient(135deg, rgba(37, 99, 235, 0.45), rgba(147, 51, 234, 0.55))',
    badge: '小鎮益智 ｜ 極限方塊',
    badgeBg: 'rgba(37, 99, 235, 0.25)',
    badgeColor: '#60a5fa',
    title: '俄羅斯方塊對戰',
    desc: '快節奏連線消除與即時干擾，小女孩與波波陪你挑戰消除極限',
    charPri: 'characters/girl_v4.webp',
    charSec: 'characters/rabbit.webp'
  },
  {
    id: 'card_poker',
    bg: 'town/interior.webp',
    tint: 'linear-gradient(135deg, rgba(159, 18, 57, 0.5), rgba(88, 28, 135, 0.65))',
    badge: '小鎮娛樂 ｜ 牌桌風雲',
    badgeBg: 'rgba(159, 18, 57, 0.25)',
    badgeColor: '#fb7185',
    title: '德州撲克與二十一點',
    desc: '科學家卡洛特親自擔任荷官，計算勝率展開精準博弈心理戰',
    charPri: 'characters/mr_carrot_sci.webp',
    charSec: 'characters/linda_nyan.webp'
  },
  {
    id: 'card_magic_fighter',
    bg: 'town/end_special.webp',
    tint: 'linear-gradient(135deg, rgba(124, 58, 237, 0.5), rgba(6, 182, 212, 0.5))',
    badge: '3D 動作對戰 ｜ 城堡防守',
    badgeBg: 'rgba(124, 58, 237, 0.25)',
    badgeColor: '#a78bfa',
    title: '魔法對戰 3D',
    desc: '魔法師卡洛特抵禦黑森林魔狼王，施展奧術守衛小鎮水晶基地',
    charPri: 'characters/mr_carrot_mage.webp',
    charSec: 'characters/journey_magic_wolf.webp'
  },
  {
    id: 'card_fruit_havoc',
    bg: 'town/town.webp',
    tint: 'linear-gradient(135deg, rgba(16, 185, 129, 0.45), rgba(245, 158, 11, 0.5))',
    badge: '3D 動作闖關 ｜ 極限跑酷',
    badgeBg: 'rgba(16, 185, 129, 0.25)',
    badgeColor: '#34d399',
    title: '水果極限跑酷',
    desc: '波波與小紅帽的小鎮冒險，穿越重重機關採集鮮甜水果',
    charPri: 'characters/bobo_v3.webp',
    charSec: 'characters/red_hood.webp'
  },
  {
    id: 'card_bomberman',
    bg: 'town/interior.webp',
    tint: 'linear-gradient(135deg, rgba(234, 88, 12, 0.5), rgba(79, 70, 229, 0.55))',
    badge: '經典懷舊 ｜ 迷宮爆破',
    badgeBg: 'rgba(234, 88, 12, 0.25)',
    badgeColor: '#fb923c',
    title: '土星炸彈人',
    desc: '科學家卡洛特與陶藝師的機關實驗，在經典迷宮中引爆歡樂連環炸彈',
    charPri: 'characters/mr_carrot_sci.webp',
    charSec: 'characters/potter.webp'
  }
];

for (const c of CARDS) {
  const bgPath = path.join(artDir, c.bg).replace(/\\/g, '/');
  const priPath = path.join(artDir, c.charPri).replace(/\\/g, '/');
  const secPath = path.join(artDir, c.charSec).replace(/\\/g, '/');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 600px;
    height: 340px;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif;
    position: relative;
    background: #0f172a;
  }
  .bg-layer {
    position: absolute;
    inset: 0;
    background-image: url('file:///${bgPath}');
    background-size: cover;
    background-position: center;
    filter: brightness(0.65) saturate(1.25);
  }
  .gradient-overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 75% 50%, rgba(15, 23, 42, 0.15) 0%, rgba(15, 23, 42, 0.85) 100%),
                linear-gradient(to right, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.55) 55%, transparent 100%);
  }
  .jewel-tint {
    position: absolute;
    inset: 0;
    background: ${c.tint};
    mix-blend-mode: overlay;
    opacity: 0.75;
  }
  .char-container {
    position: absolute;
    right: 15px;
    bottom: -15px;
    height: 350px;
    display: flex;
    align-items: flex-end;
    pointer-events: none;
  }
  .char-img-secondary {
    height: 250px;
    object-fit: contain;
    filter: drop-shadow(0 10px 20px rgba(0,0,0,0.6));
    margin-right: -45px;
    z-index: 1;
    transform: translateY(15px);
  }
  .char-img-primary {
    height: 330px;
    object-fit: contain;
    filter: drop-shadow(0 15px 30px rgba(0,0,0,0.85));
    z-index: 2;
  }
  .content {
    position: absolute;
    left: 32px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 5;
    max-width: 320px;
  }
  .badge {
    display: inline-block;
    padding: 5px 12px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
    background: ${c.badgeBg};
    color: ${c.badgeColor};
    border: 1px solid ${c.badgeColor}40;
    backdrop-filter: blur(4px);
  }
  .title {
    font-size: 30px;
    font-weight: 900;
    color: #ffffff;
    line-height: 1.2;
    margin-bottom: 10px;
    text-shadow: 0 4px 14px rgba(0,0,0,0.85);
    letter-spacing: 0.5px;
  }
  .desc {
    font-size: 13px;
    color: #cbd5e1;
    line-height: 1.5;
    text-shadow: 0 2px 8px rgba(0,0,0,0.9);
  }
  .decor-border {
    position: absolute;
    inset: 8px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    pointer-events: none;
    z-index: 10;
  }
</style>
</head>
<body>
  <div class="bg-layer"></div>
  <div class="gradient-overlay"></div>
  <div class="jewel-tint"></div>
  <div class="decor-border"></div>

  <div class="content">
    <div class="badge">${c.badge}</div>
    <h1 class="title">${c.title}</h1>
    <p class="desc">${c.desc}</p>
  </div>

  <div class="char-container">
    <img class="char-img-secondary" src="file:///${secPath}" />
    <img class="char-img-primary" src="file:///${priPath}" />
  </div>
</body>
</html>`;

  const tmpHtml = path.join(__dirname, `${c.id}.html`);
  const outPng = path.join(outDir, `${c.id}.png`);
  fs.writeFileSync(tmpHtml, html, 'utf8');

  console.log(`Rendering ${c.id}...`);
  try {
    execSync(`"${edgePath}" --headless --disable-gpu --window-size=600,340 --screenshot="${outPng}" "file:///${tmpHtml.replace(/\\/g, '/')}"`);
    console.log(`Generated ${c.id}.png (${fs.statSync(outPng).size} bytes)`);
  } catch (err) {
    console.error(`Failed ${c.id}:`, err);
  } finally {
    try { fs.unlinkSync(tmpHtml); } catch(e) {}
  }
}

console.log('All cards successfully rendered!');
