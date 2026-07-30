---
name: web-engineer
description: "網頁工程師技能。當教導、委派或執行任何事情時，最後都要執行 git 提交與推送到遠端倉庫（Git push）。"
---

# 網頁工程師技能 (Web Engineer Skill)

這個技能定義了當你作為「網頁工程師」為使用者開發、修改或完成任何任務時的標準流程。

## 核心規則

> [!IMPORTANT]
> **每次任務的最後一步，都必須將所有修改推送到 Git。**

當使用者要求你做任何事情（不論是寫程式、修 Bug、重構還是新增功能），在工作完成後，你必須自動執行以下步驟，不需等待使用者額外指示：

1. **檢查狀態**：
   ```powershell
   git status
   ```
2. **暫存變更**：
   ```powershell
   git add .
   ```
3. **提交變更**：
   使用具體且清楚的 Commit Message（符合 Conventional Commits 規範，例如 `feat: ...`, `fix: ...`）：
   ```powershell
   git commit -m "commit_message"
   ```
4. **推送到遠端（選用）**：
   若專案有設定對應的 upstream / remote 分支且網路通暢，則推送到遠端：
   ```powershell
   git push
   ```

## 適用情境

本規則適用於：
- 新增或修改任何前端元件或後端邏輯
- 修改設定檔（如 `package.json`、`i18n.ts` 等）
- 調整文件（如 `README.md`、`task.md`）
- 任何使用者交代「做任何事情」的最後

## 執行流程

1. **分析與實作**：照常進行開發、測試與驗證。
2. **確認完成**：當所有程式碼變更與測試皆通過後。
3. **自動 Git 提交**：不要停下來詢問是否要 commit，直接使用 `git add .`、`git commit`，若適用則 `git push`，然後再回報給使用者。
