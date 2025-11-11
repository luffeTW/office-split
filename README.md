# 債主版分帳記帳系統

一個用於辦公室日常分帳記帳的 .NET Core 前後端分離應用程式。

## 專案結構

```
債主版/
├── backend/              # .NET Core Web API
├── frontend/            # React + TypeScript Web 應用
├── mobile/              # React Native 移動應用
├── database/            # 資料庫相關檔案
└── docker/              # Docker 配置
```

## 技術棧

### 後端
- .NET 8.0 Core Web API
- Entity Framework Core (PostgreSQL)
- JWT Authentication
- Swagger/OpenAPI

### 前端 Web
- React 18 + TypeScript
- React Router
- Axios
- React Query
- Material-UI

### 移動應用
- React Native + TypeScript
- React Navigation
- Axios
- AsyncStorage

### 資料庫
- PostgreSQL 15+

### 容器化
- Docker & Docker Compose
- Nginx (前端服務)

## 快速開始

### 使用 Docker Compose (推薦)

1. 確保已安裝 Docker 和 Docker Compose

2. 進入 docker 目錄：
```bash
cd docker
```

3. 啟動所有服務：
```bash
docker-compose up -d
```

4. 訪問應用：
   - Web 前端: http://localhost:3000
   - API 後端: http://localhost:5000
   - Swagger API 文檔: http://localhost:5000/swagger

### 本地開發

#### 後端

1. 確保已安裝 .NET 8.0 SDK 和 PostgreSQL

2. 進入後端目錄：
```bash
cd backend
```

3. 還原套件：
```bash
dotnet restore
```

4. 更新資料庫連接字串（如需要）：
   - 編輯 `appsettings.json` 或 `appsettings.Development.json`

5. 啟動應用：
```bash
dotnet run
```

#### 前端 Web

1. 確保已安裝 Node.js 18+

2. 進入前端目錄：
```bash
cd frontend
```

3. 安裝依賴：
```bash
npm install
```

4. 啟動開發伺服器：
```bash
npm run dev
```

#### 移動應用

1. 確保已安裝 React Native 開發環境

2. 進入移動應用目錄：
```bash
cd mobile
```

3. 安裝依賴：
```bash
npm install
```

4. 啟動 Metro bundler：
```bash
npm start
```

5. 在另一個終端運行：
   - iOS: `npm run ios`
   - Android: `npm run android`

## 環境變數

### 後端
- `ConnectionStrings__DefaultConnection`: PostgreSQL 連接字串
- `Jwt__Key`: JWT 密鑰（至少 32 個字元）
- `Jwt__Issuer`: JWT 發行者
- `Jwt__Audience`: JWT 受眾
- `Jwt__ExpiryMinutes`: Token 過期時間（分鐘）

### 前端
- `VITE_API_BASE_URL`: API 基礎 URL（預設: http://localhost:5000/api）

## API 文檔

啟動後端服務後，訪問 Swagger UI：
- 開發環境: http://localhost:5000/swagger

## 功能特色

- ✅ 用戶認證（註冊、登入、JWT）
- ✅ 群組管理（創建、編輯、成員管理）
- ✅ 分類管理（收入/支出分類）
- ✅ 記帳功能（新增、編輯、刪除交易）
- ✅ 支援指定「墊款者」（可對群組內任一成員新增墊款紀錄）
- ✅ 自動分帳（等比例分配）
- ✅ 報表查詢（統計、圖表）
- ✅ 報表匯出（CSV、Excel）
- ✅ 移動應用支援

### 新增功能（邀請與收據）
- ✅ 邀請連結 / QR Code：群組擁有者或管理員可產生邀請代碼（可設定有效期與使用次數），他人可透過「/join?token=...」自行加入。
- ✅ 自動加入：未登入點開邀請連結時會暫存 token，登入後自動導回 /join 完成加入。
- ✅ 邀請管理：可檢視歷史/有效邀請並停用指定邀請。
- ✅ 收據上傳：建立交易時可直接上傳收據圖片，或後續再補上傳；前端列表支援縮圖預覽與原圖查看。

## 資料庫初始化

本專案使用 Entity Framework Core Migrations 管理 schema。

應用啟動時會自動：
- 套用最新的 EF Core Migrations（自動建立/更新資料表結構）
- 初始化預設分類

若需手動操作遷移（可選）：
- 產生遷移：dotnet ef migrations add <MigrationName>
- 套用遷移：dotnet ef database update

所有遷移檔位於 `backend/Migrations/`，請納入版控。

注意：已改為在啟動時呼叫 `Database.Migrate()`，不再使用 `EnsureCreated()`。

## 靜態檔案與收據儲存

- 後端會提供靜態檔案服務（`wwwroot`）。
- 收據圖片會儲存於 `backend/wwwroot/uploads/receipts/{groupId}/`，API 回傳相對路徑（例如：`/uploads/receipts/1/xxx.jpg`）。
- 前端會使用 `VITE_API_BASE_URL` 自動拼接為可訪問之完整網址。
- 已在 `.gitignore` 忽略 `backend/wwwroot/uploads/`，避免把使用者上傳檔案提交到版控。

## 提交前檢查清單

- [ ] 後端變更：Controllers/Services/Models 對應的 DTO 與路由是否一致。
- [ ] 已包含最新 EF Core 遷移檔（`backend/Migrations/*`）。
- [ ] 前端已更新 service 呼叫與頁面（`src/services/*`, `src/pages/*`, 新增 `JoinPage.tsx`）。
- [ ] `frontend/package.json` 已加入 `qrcode.react` 依賴並完成安裝（建議一併提交 lock 檔）。
- [ ] `.gitignore` 包含 `backend/wwwroot/uploads/` 忽略規則。
- [ ] README 已更新新增功能、遷移與靜態檔案說明。

## 注意事項

1. 生產環境請務必修改 JWT 密鑰
2. 生產環境請使用強密碼的資料庫連接
3. 移動應用需要配置正確的 API 基礎 URL
4. 建議使用環境變數管理敏感資訊

## 使用說明：墊款者（Advance / Paid by）

- 新增交易時可在前端「新增交易」對話框選擇「墊款者」，預設為當前登入者。
- 後端 API `POST /api/transactions` 允許傳入欄位 `payerUserId`（可選），用以指定付款人（必須為該群組成員）。
- 若未提供 `payerUserId`，系統會以發出請求的當前用戶作為墊款者。
- 系統目前採「等額分攤」模式，並會自動將墊款者自己的分帳標記為「已支付」。

## 授權

MIT License
