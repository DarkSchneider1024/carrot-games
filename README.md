# 🥕 Carrot Games — 頂級純前端對戰遊戲平台

![Carrot Games Banner](/public/assets/images/logo_carrot.png)

> **Carrot Games** 是一個不需要任何伺服器後端、打開瀏覽器即可開始的純前端對戰遊戲平台。包含 **中國象棋 (Xiangqi)**、**俄羅斯方塊即時對戰 (Tetris Battle 2P)** 以及全新的 **德州撲克 (Texas Hold'em Poker)**。支援高智能 WebAssembly / Minimax AI 對戰與基於 WebRTC 的 P2P 點對點連線對弈，全站採用 **Happy Hues 粉嫩清爽主題** 與 **三麗鷗/吉卜力 Q 版繪畫風格**，並提供 **PWA 全自動零感更新** 與 **單手搖桿觸控** 支援。

---

## 🎮 遊戲列表 (Games Suite)

### 1. ♟️ 中國象棋 (Xiangqi)
- **AI 戰術引擎**：Negamax + Alpha-Beta 剪枝演算法與全棋子位置評估矩陣 (Piece-Square Tables)。
- **Web Workers 背景運算**：思考過程完全不阻塞 UI 渲染。
- **對戰模式**：`[🤖 對戰 AI]`（簡單/中等/困難）及 `[🌐 連線開房]` P2P 實時開房對局。

### 2. 🧩 俄羅斯方塊即時對戰 (Tetris Battle 2P)
- **WebAssembly 核心引擎**：採用 C / WebAssembly 編譯之極速核心 (`tetris-engine.wasm`)，支援 7-Bag 隨機抽樣、SRS 旋轉牆踢系統與 Zero-GC 零垃圾回收停頓。
- **經典 2 分鐘對決機制**：
  - **120 秒倒數計時**：時間結束時依據 K.O. 擊倒數、送出垃圾行總數進行判定。
  - **K.O. 擊倒系統與垃圾行攻擊反制 (Garbage Counter)**：消行產生攻擊垃圾行，可透過及時消行抵消 (Counter) 抵擋攻擊。
- **行動端單手虛擬搖桿 (Mobile Single-Handed Joystick)**：專為單手持手機大拇指設計之滑動搖桿與 D-Pad 雙模式控制器，且行動端自動將主玩家面板放大、對手面板縮小為右上角 Mini HUD。
- **對戰模式**：`[🤖 對戰 AI]`（WASM Bot）及 `[🌐 連線開房]` P2P 連線對決。

### 3. 🂡 德州撲克 (Texas Hold'em Poker)
- **無限注德州撲克核心 (Texas Hold'em Engine)**：52 張標準撲克牌、手牌強度 7 選 5 評估器（皇家同花順、鐵支、葫蘆、同花、順子、三條、兩對、一對、高牌）與盲注底池管理。
- **AI 電腦玩家與賭注心理大腦 (`poker-ai.js`)**：搭配 3 位萌化 AI 玩家（🐰 兔兔、🐱 貓咪、🐻 熊熊）進行下注、跟注、加注與詐唬 (Bluffing) 博弈。
- **Happy Hues 粉嫩風綠氈撲克桌**：具備發牌動畫、公牌展示 (Flop, Turn, River)、手牌翻面與下注控制面板（棄牌 FOLD、過牌 CHECK、跟注 CALL、加注 RAISE）。
- **對戰模式**：`[🤖 對戰 AI]`（3 位電腦 AI 對決）及 `[🌐 連線開房]` 多人 P2P 連線對決。

---

## 🎨 設計系統與主題 (Design System & Theme)

- **Happy Hues 清爽粉嫩配色**：參考 Happy Hues 調色盤，採用奶白 (`#faeee7`) 與胡蘿蔔橘 (`#ff7544`)、薄荷粉綠 (`#2ec4b6`) 與櫻花粉紅 (`#ff70a6`)。
- **三麗鷗 / 吉卜力 Q 版繪畫風格**：Logo 與遊戲封面、撲克頭像均採用可愛繪本插畫風格。
- **iOS 瀏海屏與動態島安全區域適配 (Safe Area Insets)**：全站頂欄與手持按鈕適配 `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`，確保不會遮擋任何操作。

---

## 📲 PWA (Progressive Web App) 與自動更新

- **全站 PWA 安裝**：支援 iOS (Safari) 與 Android (Chrome/Edge) 獨立主畫面 App 安裝。
- **PWA 全自動零感更新機制**：
  - Service Worker 啟用 `skipWaiting()` 與 `clients.claim()`。
  - 當發表新版本時，App 在前景切換時自動背景檢查並提示 **「⚡ 已更新至最新版本！」** 自動刷新載入最新程式碼。
- **專屬 PWA 安裝教學頁面 (`#/pwa-guide`)**：提供完整的 iOS Safari「加入主畫面」與 Android「安裝應用程式」步驟圖文引導。

---

## ⚡ 核心技術棧與架構 (Technology Stack & Architecture)

### 1. 核心前端與 WebAssembly (WASM) 引擎
- **WebAssembly (C / WASM)**：`tetris-engine.wasm` 處理 10×20 位元棋盤運算、SRS 旋轉與 WASM AI 評估。
- **Vanilla JavaScript (ESNext)**：無框架負擔，極速渲染。
- **HTML5 Canvas 2D**：High-DPI 實時繪圖渲染器。
- **Hash-based SPA Router**：相容 GitHub Pages 靜態託管的單頁路由系統。

### 2. 三級自動降級持久化存儲 (Triple-Tier Fallback Storage)
1. **OPFS (Origin Private File System)**：優先使用 Chrome/Edge/Firefox 原生專屬私有檔案系統。
2. **IndexedDB**：當 OPFS 不可用時自動降級至 IndexedDB 物件資料庫。
3. **localStorage**：最終備援方案，包含容量限制監控與舊資料自動清理機制。

### 3. 無伺服器 P2P 連線對戰 (Serverless WebRTC P2P)
- **WebRTC DataChannel (PeerJS)**：0 後端成本點對點實時對戰。

---

## 📂 專案結構 (Directory Structure)

```
carrot-games/
├── .github/
│   └── workflows/
│       └── deploy.yml            # GitHub Actions 自動部署工作流
├── public/
│   ├── manifest.json             # PWA Web App Manifest
│   ├── sw.js                     # PWA Service Worker (Auto-Update)
│   └── assets/
│       └── images/               # AI 生成之三麗鷗/吉卜力風圖像資產
├── src/
│   ├── components/
│   │   ├── icons.js              # 全站 SVG 向量圖庫
│   │   ├── modal.js              # 通用 Modal 彈窗
│   │   └── toast.js              # Toast 提示通知
│   ├── games/
│   │   ├── xiangqi/              # 中國象棋引擎與渲染器
│   │   ├── tetris/               # 俄羅斯方塊引擎 (WASM & Dual Canvas)
│   │   └── poker/                # 德州撲克引擎 & AI
│   ├── pages/
│   │   ├── home/                 # 遊戲大廳首頁
│   │   ├── xiangqi/              # 象棋對局頁面
│   │   ├── tetris/               # 俄羅斯方塊對戰頁面
│   │   ├── poker/                # 德州撲克對局頁面
│   │   └── pwa-guide/            # PWA 安裝指南頁面 (iOS/Android)
│   ├── storage/                  # OPFS / IndexedDB / localStorage 存儲層
│   ├── styles/                   # Happy Hues Design Tokens & Responsive CSS
│   ├── main.js                   # 應用主入口 (PWA Auto-Update Manager)
│   └── router.js                 # SPA 路由管理器
├── index.html
├── package.json
└── vite.config.js
```

---

## 📖 4 款對戰遊戲玩法說明與規則文檔

用戶可於線上平台點擊頂欄「**📖 遊戲玩法說明**」按鈕，或透過 URL `/#/guide` 開啟線上互動說明書。

### 1. ♟️ 中國象棋 (Xiangqi Rulebook)
- **勝負目標**：紅方先行、黑方後行，透過陣型推進將死 (Checkmate) 對方帥/將或使其困斃。
- **棋子走法**：
  - **帥/將**：九宮格內直/橫走一步，不可與對手帥/將在同一無子直線上相對（飛將殺）。
  - **仕/士**：九宮格內沿斜線走一步。
  - **相/象**：走「田」字對角線兩步，不過河，塞象眼時無法行走。
  - **馬**：走「日」字格，遇到蹩馬腿時該方向受阻。
  - **車**：直橫自由行走任意距離，直線無子阻擋即可吃子。
  - **砲**：移動同車，但吃子時必須隔正好一個棋子（砲架）跳躍吃子。
  - **兵/卒**：未過河只能直前一步；過河後可直前或左右走一步，不可後退。

### 2. 🧩 俄羅斯方塊即時對戰 (Tetris Battle 2P Rulebook)
- **比賽規則**：單局 120 秒對決，倒數結束依據 K.O. 擊倒數與送出垃圾行總數判定勝負。若版面方塊頂到天井上限被判定 K.O. 擊倒並重置版面。
- **消行攻擊與反制 (Garbage Counter)**：
  - 消 2 行送出 1 行垃圾行；消 3 行送出 2 行；消 4 行 (Tetris) 送出 4 行。
  - **攻擊抵消**：受到對手垃圾行攻擊時，若及時進行消行，產生的攻擊力優先抵消對手的垃圾行！
- **操作指令**：
  - 電腦：【← →】移動，【↑】順旋，【↓】軟降，【空白鍵】硬降，【C】HOLD。
  - 手機：單手手勢搖桿 (Joystick) 與虛擬按鍵 (D-Pad) 雙模式。

### 3. 🃏 德州撲克 (Texas Hold'em Poker Rulebook)
- **基礎概念**：52 張標準撲克牌，每人發 2 張底牌與 5 張桌面公牌組合最佳 5 張牌型。
- **牌型大小**：皇家同花順 > 同花順 > 四條 (鐵支) > 葫蘆 > 同花 > 順子 > 三條 > 兩對 > 一對 > 高牌。
- **下注環節**：翻牌前 (Pre-Flop) -> 翻牌 (Flop 3張) -> 轉牌 (Turn 1張) -> 河牌 (River 1張) -> 攤牌 (Showdown)。
- **帳號本金紀錄**：登入即享 $1,000 初始本金紀錄，輸光自動觸發破產救濟補滿 $1,000！

### 4. ✈️ 魔法對戰 3D (Magic Fighter 3D / Battle City Classic Rulebook)
- **遊戲目標**：重塑經典 NES《坦克大戰》，防守地圖底部 **蘿蔔 HQ 水晶總部**，擊退一共 5 波次攻勢敵軍！
- **6 大經典寶物道具**：
  - 🛡️ **無敵頭盔 (Helmet)**：8 秒無敵防禦光罩。
  - ⏱️ **時鐘定身 (Clock)**：凍結全場敵機 6 秒無法移動射擊。
  - 💣 **手榴彈 (Grenade)**：全滅爆破當前全場敵機。
  - ⭐️ **星星火力 (Star)**：升級雙發彈與破鋼貫穿子彈（可打碎鋼牆）。
  - 🏰 **鐵鏟加固 (Shovel)**：將總部四周磚牆瞬間變更為堅硬鋼鐵牆 15 秒。
  - 🛩️ **戰機加命 (Extra Life)**：生命值 HP +1。
- **地形與敵機**：紅磚牆、鋼牆、樹叢隱密、冰面滑行、水域阻擋。含偵察機、突擊機、3 HP 重裝機與閃爍紅光道具機。

---

## 🚀 本機開發與測試 (Local Development)

```bash
npm install
npm run dev
```

---

## 🌐 部署 (Deployment)

推送到 GitHub `main` 分支後，GitHub Actions 會自動完成構建並發布至 GitHub Pages。

- **倉庫地址**：[DarkSchneider1024/carrot-games](https://github.com/DarkSchneider1024/carrot-games)
