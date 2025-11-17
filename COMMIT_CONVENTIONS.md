# Commit 規範（Conventional Commits）

本專案遵循 Conventional Commits 1.0 規範，搭配本倉庫常見的範圍（scope）與實例。請在提交（commit）訊息中清楚表達變更目的，讓變更記錄與版本發布自動化更順利。

參考標準：https://www.conventionalcommits.org/en/v1.0.0/

---

## 格式

<type>(<scope>): <subject>

<body>

<footer>

- `type`：變更類型（必填）
- `scope`：影響範圍（建議填，便於檢索）
- `subject`：簡要說明，使用祈使句，無句號（必填）
- `body`：必要時補充動機、變更內容、對比設計；可多段
- `footer`：關聯議題、重大變更說明等（例如 `BREAKING CHANGE:`、`Closes #123`）

限制建議：
- `subject` 最長 72 字元，使用中文或英文皆可（中文優先）
- 不在 `subject` 結尾加句號
- 英文用祈使句（e.g. "add", "fix"），中文直接描述（e.g. 「新增…」、「修正…」）

---

## 類型（type）

- `feat`：新增功能
- `fix`：修正錯誤
- `docs`：文件變更（僅文件）
- `style`：程式碼風格（空白、格式、缺少分號…不影響邏輯）
- `refactor`：重構（非新增功能、非修 bug）
- `perf`：效能優化
- `test`：新增/調整測試
- `build`：建置系統或相依（vite、npm、dotnet、nuget、docker 等）
- `ci`：CI 設定與腳本
- `chore`：其他雜項（不影響程式碼邏輯的維護）
- `revert`：回復先前 commit（格式見下方）

---

## 範圍（scope）

依本專案目錄結構，建議使用下列 scope：

- `frontend`：前端專案總稱
  - `frontend/pages`、`frontend/components`、`frontend/charts`、`frontend/hooks`、`frontend/services`、`frontend/lib`、`frontend/styles`、`frontend/config`
- `backend`：後端專案總稱
  - `backend/Controllers`、`backend/Services`、`backend/Models`、`backend/Data`、`backend/Migrations`、`backend/Program`、`backend/Config`
- `docker`：容器相關
  - `docker/compose`、`docker/Dockerfile.backend`、`docker/Dockerfile.frontend`、`docker/nginx`
- `database`：資料庫腳本/初始化
  - `database/schema`、`database/init.sql`
- `repo`：倉庫層（README、工作流程、根設定等）

可自行擴充，但請盡量沿用既有命名以利檢索。

---

## Footer 與關聯

- 關聯議題：`Closes #123`、`Fixes #456`、`Refs #789`
- 重大變更：`BREAKING CHANGE: <說明>`（也可使用 `!` 標記，例如 `feat!: ...` 或 `feat(scope)!: ...`）
- 共筆/外部連結：必要時可附上設計 PRD、討論串連結

---

## 實例（依本倉庫）

### 前端（React + Vite）
- `feat(frontend/pages): 儀表板新增分類與日期篩選`
- `fix(frontend/charts): 修正月趨勢圖在無資料時崩潰`
- `perf(frontend/charts): 優化 CategoryPieChart 計算使用 useMemo`
- `refactor(frontend/services): 拆分 reportService 以降低耦合`
- `build(frontend): 升級依賴並調整 Vite 設定`

### 後端（.NET 8 + EF Core）
- `feat(backend/Controllers): 新增 ReportsController 匯總 API`
- `fix(backend/Services): 修正在日期區間為空時的查詢條件`
- `refactor(backend/Models): 調整 Transaction 與 Split 關聯`
- `feat(backend/Migrations): 新增 GroupInvite 與 receiptUrl 欄位`
- `docs(backend/Config): 補充 appsettings 說明`

### Docker/Infra
- `chore(docker/compose): 調整 postgres healthcheck 參數`
- `build(docker/Dockerfile.backend): 降低映像層級並快取 nuget 套件`
- `build(docker/nginx): 更新反向代理緩存設定`

### Database/SQL
- `feat(database/init.sql): 新增預設分類與測試資料`

### 重大變更範例
- `feat(backend/Controllers)!: 調整報表 API 回傳結構`

  BREAKING CHANGE: `GET /api/reports/{groupId}` 移除 `oldField`，新增 `categorySummaries` 與 `monthlySummaries`。

### 回復（revert）
- `revert: feat(frontend/pages): 儀表板新增分類與日期篩選`

  This reverts commit <hash>.

---

## 撰寫建議

- 盡量以「為何」與「做了什麼」為主；「怎麼做」可放在 PR 描述或程式碼註解
- 一個 commit 僅處理一件事；若需同時修改多處，請拆分為多個 commit
- 與 Issue/任務對應：在 footer 使用 `Closes #<id>` 或 `Refs #<id>`
- 針對 EF Core migration：
  - 生成：`dotnet ef migrations add <Name>`
  - 若只包含自動產生檔案，建議單獨一個 commit：`feat(backend/Migrations): 新增 <Name> migration`

---

## Commit Template（選用）

可在倉庫根目錄使用 `.gitmessage.txt` 作為提交模板並設為預設：

```bash
# 設定倉庫層級（Windows PowerShell）
git config commit.template .gitmessage.txt

# 或使用全域設定（將路徑改成實際絕對路徑）
# git config --global commit.template "C:/path/to/.gitmessage.txt"
```

---

## `.gitmessage.txt` 建議內容

```
<type>(<scope>): <subject>

<body 可選>
- 變更動機：
- 主要修改：
- 風險與影響：

<footer 可選>
Closes #
Refs #
BREAKING CHANGE: 
```

---

## 快速對照

- 常用 type：`feat`、`fix`、`refactor`、`perf`、`docs`、`test`、`build`、`chore`、`ci`
- 常用 scope：`frontend/*`、`backend/*`、`docker/*`、`database/*`、`repo`
- 重大變更：`!` 或 `BREAKING CHANGE:`
- 關聯議題：`Closes #123`、`Refs #456`
