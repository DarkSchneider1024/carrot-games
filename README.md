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

## 🚀 本機開發與測試 (Local Development)

```bash
npm install
npm run dev
```

---

## 🌐 部署 (Deployment)

推送到 GitHub `main` 分支後，GitHub Actions 會自動完成構建並發布至 GitHub Pages。

- **倉庫地址**：[DarkSchneider1024/carrot-games](https://github.com/DarkSchneider1024/carrot-games)
