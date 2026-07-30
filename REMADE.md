# 🥕 Carrot Games — 頂級純前端對戰遊戲平台

![Carrot Games Banner](/public/assets/images/icon_xiangqi.png)

> **Carrot Games** 是一個不需要任何伺服器後端、打開瀏覽器即可開始的純前端對戰遊戲平台。包含**中國象棋 (Xiangqi)** 與全新的 **俄羅斯方塊即時對戰 (Tetris Battle 2P)**，支援高智能 WebAssembly / Minimax AI 對戰與基於 WebRTC 的 P2P 點對點連線對弈。

---

## 🎮 遊戲列表 (Games Suite)

### 1. ♟️ 中國象棋 (Xiangqi)
- **AI 戰術引擎**：Negamax + Alpha-Beta 剪枝演算法與全棋子位置評估矩陣 (Piece-Square Tables)。
- **Web Workers 背景運算**：思考過程完全不阻塞 UI 渲染。
- **對戰模式**：對戰 AI（簡單/中等/困難）及 P2P 實時開房對局。

### 2. 🧩 俄羅斯方塊即時對戰 (Tetris Battle 2P / Trace Battle)
- **WebAssembly 核心引擎**：採用 C / WebAssembly 語言編譯之極速核心 (`tetris-engine.wasm`)，支援 7-Bag 隨機抽樣、SRS 旋轉牆踢系統與零垃圾回收 (Zero-GC) 停頓。
- **經典 2 分鐘對決機制**：
  - **120 秒倒數計時**：時間結束時依據 K.O. 擊倒數、送出垃圾行總數、面板高度進行判定。
  - **K.O. 擊倒系統**：堆疊觸頂時觸發 K.O.，重置面板並累加 K.O. 勳章。
  - **垃圾行攻擊與反制 (Garbage Counter & Cancellation)**：消除 2/3/4 行、Combo 連消與 Back-to-Back Tetris 產生攻擊垃圾行；若己方有預警垃圾行（側邊紅色危險條），可透過消除及時抵消 (Counter) 攻擊！
- **對戰模式**：WASM AI Bot（初級/中級/大師）及 P2P 實時點對點連線對決。

---

## ⚡ 核心技術棧與架構 (Technology Stack & Architecture)

### 1. 核心前端與 WebAssembly (WASM) 引擎
- **WebAssembly (C / WASM)**：`tetris-engine.wasm` 處理 10×20 位元棋盤運算、SRS 旋轉、消行、攻擊數計算與 WASM AI 落點評估。
- **Vanilla JavaScript (ESNext)**：無框架負擔，追求極致效能與原生掌控力。
- **HTML5 Canvas 2D**：High-DPI 雙板實時渲染器（含斜角方塊、Ghost 影子落點、紅條危險儀表板、攻擊粒子特效）。
- **Hash-based SPA Router**：相容 GitHub Pages 靜態託管的無刷新單頁路由系統。

### 2. 三級自動降級持久化存儲 (Triple-Tier Fallback Storage)
1. **OPFS (Origin Private File System)**：優先使用 Chrome/Edge/Firefox 原生專屬私有檔案系統進行高速 File I/O。
2. **IndexedDB**：當 OPFS 不可用時自動降級至 IndexedDB 物件資料庫。
3. **localStorage**：最終備援方案，包含容量限制監控與舊資料自動清理機制。

### 3. 無伺服器 P2P 連線對戰 (Serverless WebRTC P2P)
- **WebRTC DataChannel (PeerJS)**：0 後端成本點對點實時對戰。
- **Host-Authoritative 房主架構**：建立房間的使用者作為權威 Server 端驗證步法合法性與同步雙方對戰面板。

### 4. Tactical Cyberpunk 設計系統 (Design System)
- **電競專業字體**：整合 Google Fonts (`Chakra Petch` & `Russo One`)。
- **Retro-Futurism / Tactical HUD**：深色高對比主題、CRT 掃描線遮罩 (Scanlines)、霓虹光暈與動態卡片。
- **100% SVG 向量圖示**：自定義 `SVG_ICONS` 圖庫，全站無硬編碼 Emoji。

---

## 📂 專案結構 (Directory Structure)

```
carrot-games/
├── .github/
│   └── workflows/
│       └── deploy.yml            # GitHub Actions 自動部署工作流
├── public/
│   └── assets/
│       └── images/               # 圖像資產 (Logo, Game Thumbnails)
├── src/
│   ├── components/
│   │   ├── icons.js              # 全站 SVG 向量圖庫
│   │   ├── modal.js              # 通用 Modal 彈窗
│   │   └── toast.js              # Toast 提示通知
│   ├── games/
│   │   ├── xiangqi/              # 中國象棋引擎與渲染器
│   │   └── tetris/               # 俄羅斯方塊引擎 (WASM & Dual Canvas)
│   │       ├── wasm/
│   │       │   ├── tetris-engine.c    # C 語言核心 WASM 原始碼
│   │       │   └── wasm-adapter.js   # WASM 記憶體與 JS 橋接適配器
│   │       ├── board-renderer.js     # 雙人對戰 Canvas 渲染器
│   │       └── game-controller.js    # Tetris Battle 2P 規則控制器
│   ├── network/                  # WebRTC P2P 通訊層
│   ├── pages/
│   │   ├── home/                 # 遊戲大廳首頁
│   │   ├── xiangqi/              # 象棋對局頁面
│   │   └── tetris/               # 俄羅斯方塊對戰頁面
│   ├── storage/                  # OPFS / IndexedDB / localStorage 存儲層
│   ├── styles/                   # Design Tokens & CRT 掃描線
│   ├── main.js                   # 應用主入口
│   └── router.js                 # SPA 路由管理器
├── index.html
├── package.json
└── vite.config.js
```

---

## 🚀 本機開發與測試 (Local Development)

### 安裝依賴
```bash
npm install
```

### 啟動開發伺服器
```bash
npm run dev
```

### 打包構建 (Production Build)
```bash
npm run build
```

---

## 🌐 部署 (Deployment)

推送到 GitHub `main` 分支後，GitHub Actions 會自動完成構建並發布至 GitHub Pages。

- **倉庫地址**：[DarkSchneider1024/carrot-games](https://github.com/DarkSchneider1024/carrot-games)
