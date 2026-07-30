# 🥕 Carrot Games — 頂級純前端對戰遊戲平台

![Carrot Games Banner](/public/assets/images/icon_xiangqi.png)

> **Carrot Games** 是一個不需要任何伺服器後端、打開瀏覽器即可開始的純前端對戰遊戲平台。首款遊戲為**中國象棋（Xiangqi）**，支援高智能 AI 對戰與基於 WebRTC 的 P2P 點對點連線對弈。

---

## ⚡ 核心技術棧與架構 (Technology Stack & Architecture)

### 1. 核心前端引擎 (Core Frontend Engine)
- **Vanilla JavaScript (ESNext)**：無框架負擔，追求極致效能與原生掌控力。
- **HTML5 Canvas 2D**：High-DPI 自適應縮放棋盤渲染器，包含木紋質感、選棋高亮、走步軌跡與流暢補間動畫。
- **Hash-based SPA Router**：相容 GitHub Pages 靜態託管的無刷新單頁路由系統。

### 2. 戰術 AI 引擎 (Minimax + Web Workers)
- **Negamax + Alpha-Beta 剪枝演算法**：包含多層搜尋樹優化與動態走步排序（Captures-first move ordering）。
- **Piece-Square Position Tables**：全棋子位置評估矩陣（帥/將、仕/士、相/象、車、馬、炮、兵/卒）。
- **Web Workers 非同步線程**：AI 計算完全運行於獨立背景 Worker，100% 避免阻塞 UI 主線程。
- **WebAssembly (WASM) 模組接口**：預留 C / WASM 深度算力編譯接口。

### 3. 三級自動降級持久化存儲 (Triple-Tier Fallback Storage)
為確保遊戲歷史、棋譜紀錄與玩家設定在各種瀏覽器環境下都能永久保存，採用了統一的儲存管理適配器 (Storage Manager)：
1. **OPFS (Origin Private File System)**：優先使用 Chrome/Edge/Firefox 原生的專屬私有檔案系統進行高速 File I/O。
2. **IndexedDB**：當 OPFS 不可用時自動降級至 IndexedDB 物件資料庫。
3. **localStorage**：最終備援方案，包含容量限制監控與舊資料自動清理機制。

### 4. 無伺服器 P2P 連線對戰 (Serverless WebRTC P2P)
- **WebRTC DataChannel (PeerJS)**：實現 0 後端成本的點對點實時對戰。
- **Host-Authoritative 房主架構**：建立房間的使用者作為權威 Server 端驗證走步合法性。
- **完整對戰通訊協定 (Protocol)**：包含 6 位數房間短碼、心跳保活 (Heartbeat)、悔棋請求/同意/拒絕協商、和棋提議與認輸機制。

### 5. Tactical Cyberpunk 設計系統 (Design System)
- **電競專業字體**：整合 Google Fonts (`Chakra Petch` & `Russo One`)。
- **Retro-Futurism / Tactical HUD**：深色高對比主題、CRT 掃描線遮罩 (Scanlines)、霓虹光暈與動態卡片。
- **100% SVG 向量圖示**：自定義 `SVG_ICONS` 圖庫，全站無硬編碼 Emoji，呈現極致品質。

### 6. 自動化 CI/CD 部署 (GitHub Actions & GitHub Pages)
- 配置 `.github/workflows/deploy.yml`，推送到 `main` 分支時自動執行 `npm install` 與 Vite 打包構建，並自動發布至 **GitHub Pages**。

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
│   │   └── xiangqi/
│   │       ├── ai-engine.js      # Negamax Alpha-Beta AI 算力核心
│   │       ├── ai-worker.js      # Web Worker AI 獨立線程
│   │       ├── board.js          # Canvas 棋盤繪製與動畫引擎
│   │       ├── game-controller.js# 遊戲狀態機與計時器
│   │       ├── pieces.js         # 象棋棋子移動規則生成器
│   │       └── rules.js          # 將軍/將死/困斃與飛將判定
│   ├── network/
│   │   ├── peer-manager.js       # PeerJS WebRTC P2P 管理器
│   │   ├── protocol.js           # P2P 通訊協定定義
│   │   └── room.js               # 房間狀態與開房/加房邏輯
│   ├── pages/
│   │   ├── home/                 # 遊戲大廳首頁 (Home)
│   │   └── xiangqi/              # 象棋對局頁面 (Xiangqi)
│   ├── storage/
│   │   ├── indexeddb-adapter.js  # IndexedDB 存儲適配器
│   │   ├── localstorage-adapter.js# localStorage 降級適配器
│   │   ├── opfs-adapter.js       # OPFS 高效檔案適配器
│   │   └── storage-manager.js    # 統一存儲管理器
│   ├── styles/
│   │   ├── animations.css        # 動畫 Keyframes
│   │   ├── index.css             # 全局樣式 & CRT 掃描線
│   │   └── variables.css         # Design System Tokens
│   ├── main.js                   # 應用主入口
│   └── router.js                 # SPA 路由管理器
├── index.html                    # HTML 入口
├── package.json
└── vite.config.js                # Vite 構建與 Web Worker 配置
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
瀏覽器開啟 `http://localhost:5173/carrot-games/` 即可進行開發。

### 打包構建 (Production Build)
```bash
npm run build
```

---

## 🌐 部署 (Deployment)

專案推送到 GitHub 的 `main` 分支後，GitHub Actions 會自動觸發構建並將 `./dist` 目錄部署到 GitHub Pages。

- **倉庫地址**：[DarkSchneider1024/carrot-games](https://github.com/DarkSchneider1024/carrot-games)
