# 帳本輸入流程 UI/UX Spec

> Dembrandt Stages 3–5 | Skipped: Stage 1–2 (brand & tokens settled in DESIGN.md/styles.css), Stage 6 (accessibility pass deferred to implementation)

---

## 目標

移除 fake demo（ImportPanel），替換為兩條真實資料輸入路徑：

1. **單筆輸入（Quick Entry）** — 一次新增一筆交易記錄
2. **批次線上填寫（Batch Editor）** — 類 spreadsheet 的多列 CSV 編輯器

設計原則：**最小化輸入門檻**。零摩擦進入 workbench，用漸進式引導取代一次性表單爆量。

---

## Stage 3 — Layout & Structure

### 資訊架構變更

```text
目前：
  App → ImportPanel (fake demo) → DashboardView (workbench)

新設計：
  App → EntryPanel (landing / empty state) → DashboardView (workbench)
                                                └─ inline "新增" 功能整合在 workbench 內
```

**關鍵決策**：帳本一旦有 ≥1 筆記錄就直接進 workbench。「新增」不是獨立頁面，而是 workbench 內的 primary action。

### 頁面狀態矩陣

| 帳本狀態 | 顯示內容 |
|---------|---------|
| 空帳本（0 筆） | EntryPanel：引導首次輸入 |
| 有資料（≥1 筆） | DashboardView + workbench，header 提供「+ 新增」按鈕 |

### Landing（空帳本）佈局

```text
sticky product header

┌─────────────────────────────────────────────────────────────┐
│  eyebrow: 開始記錄                                            │
│  h1: 建立你的投資帳本                                          │
│  description: 逐筆加入或批次貼上交易記錄，即刻看到績效。          │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐          │
│  │  ✏️  逐筆新增          │  │  📋  批次填寫          │          │
│  │  快速加入單筆交易      │  │  一次填入多筆記錄      │          │
│  └──────────────────────┘  └──────────────────────┘          │
│                                                              │
│  (下方展開對應面板)                                             │
└─────────────────────────────────────────────────────────────┘
```

兩張 card 作為入口，點擊展開對應輸入面板（非頁面跳轉）。降低決策負擔：不強迫選擇，兩個入口並列。

### Workbench 內新增入口

在 `ledger-workbench-layout-reference.md` 定義的 page introduction 區域：

```text
page title + purpose                      [+ 新增交易] [批次填寫]
```

- `+ 新增交易`：primary filled button → 開啟 modal/drawer
- `批次填寫`：secondary outlined button → 開啟 batch editor modal

### Responsive 折疊策略

| 斷點 | 行為 |
|------|------|
| >1120px | Landing 兩張 card 並排；workbench 按鈕在 header |
| 761–1120px | Landing card 兩欄不變；workbench 按鈕保持 |
| ≤760px | Landing card 改為垂直堆疊；workbench 內「新增」用 FAB-style 固定在右下角 |

---

## Stage 4 — Components & Interaction

### 4.1 單筆輸入表單（QuickEntryForm）

#### 欄位設計

依 `LedgerEntry` 資料模型，以**填寫順序**排列（非欄位定義順序）：

| 順序 | 欄位 | 類型 | 必填 | 預設值 | Helper text | Placeholder |
|------|------|------|------|--------|-------------|-------------|
| 1 | 交易類型 | segmented control | ✓ | `buy` | 選擇此筆記錄的類型 | — |
| 2 | 日期 | date input | ✓ | today | 交易實際發生日 | `2025-01-15` |
| 3 | 標的代號 | text + autocomplete | 條件* | — | 輸入股票代號或名稱 | `2330` |
| 4 | 數量 | number | 條件* | — | 買賣或配股的股數 | `1000` |
| 5 | 單價 | number | 條件** | — | 每股成交價（含整股） | `580.00` |
| 6 | 現金金額 | number (auto-calc) | ✓ | auto | 實際現金變動（正=流入） | `-580000` |
| 7 | 手續費 | number | ✓ | `0` | 券商手續費（0 則免填） | `165` |

*條件必填：entryType 為 buy/sell/dividend 時必填 securityId；buy/sell 時必填 quantity
**條件必填：buy/sell 時必填 unitPrice

#### 動態欄位邏輯

```
entryType === 'cash_deposit' | 'cash_withdrawal'
  → 隱藏 securityId, quantity, unitPrice
  → 只顯示 grossCashAmount + feeAmount

entryType === 'buy' | 'sell'
  → 顯示全部欄位
  → grossCashAmount 自動計算: -(quantity × unitPrice) for buy, +(quantity × unitPrice) for sell
  → 使用者可覆寫 grossCashAmount（顯示「自動計算」tag）

entryType === 'dividend'
  → 隱藏 quantity, unitPrice
  → 顯示 securityId + grossCashAmount

entryType === 'fee' | 'reversal'
  → 隱藏 securityId, quantity, unitPrice
  → 只顯示 grossCashAmount + feeAmount
```

#### 交互細節

- **Segmented control** 用於 entryType：7 種類型以中文 label 展示（買進/賣出/現金存入/現金提領/股利/費用/沖回）。每切換 type，欄位 visibility 用 `v-show` transition 帶入。
- **日期**：用原生 `<input type="date">` 配合 `max=today` constraint。
- **即時驗證**：blur 時驗證；數字欄位在輸入時即時格式化顯示千分位。
- **Submit 行為**：
  - 按鈕文字：「新增記錄」
  - 成功後：toast 通知（`✓ 已新增 1 筆`）、表單重設（保留 entryType 和 date，方便連續輸入）、帳本 table 即時更新
  - 失敗：inline error 在表單底部，不清空已填資料
- **連續輸入最佳化**：成功後焦點回到第一個有意義的空欄位（通常是 securityId 或 grossCashAmount）

#### 載入方式

- **空帳本 landing**：直接內嵌在 EntryPanel 卡片展開區
- **Workbench 內**：Drawer（從右滑入），寬度 `clamp(320px, 40vw, 480px)`，不遮蔽 ledger table

### 4.2 批次線上編輯器（BatchEditor）

#### 設計概念

類似 spreadsheet 的線上 CSV 編輯器，以表格形式一次填入多筆資料。**不是上傳 CSV 檔案**——是提供一個可填寫的 grid。

#### 佈局

```text
┌─────────────────────────────────────────────────────────┐
│  批次填寫交易記錄                              [取消] [儲存 N 筆] │
│  ─────────────────────────────────────────────────────── │
│  工具列：[+ 新增列] [貼上 CSV] [清除全部]                      │
│                                                          │
│  ┌───────┬──────┬──────┬────┬──────┬──────┬────┬──┐      │
│  │ 日期   │ 類型  │ 標的  │ 數量 │ 單價  │ 金額  │ 費用 │❌│      │
│  ├───────┼──────┼──────┼────┼──────┼──────┼────┼──┤      │
│  │       │ ▾    │      │    │      │(auto)│ 0  │❌│      │
│  │       │ ▾    │      │    │      │(auto)│ 0  │❌│      │
│  │  ...  │      │      │    │      │      │    │  │      │
│  └───────┴──────┴──────┴────┴──────┴──────┴────┴──┘      │
│                                                          │
│  已填 N 筆 · M 筆有錯誤                                    │
└─────────────────────────────────────────────────────────┘
```

#### 行為規格

| 功能 | 說明 |
|------|------|
| 初始狀態 | 5 空列（滿則自動追加 3 列） |
| + 新增列 | 在底部追加 1 列 |
| 貼上 CSV | 從剪貼簿解析 CSV 文字，自動填入 grid（支援 tab/comma 分隔） |
| 清除全部 | confirm dialog → 清空所有列 |
| 刪除列 | 每列最右邊紅色 ❌ 按鈕 |
| 欄位驗證 | 同單筆表單規則；錯誤以 cell-level 紅框 + tooltip 提示 |
| 儲存 | 只提交通過驗證的列；跳過空列；顯示成功數/失敗數 |

#### 「貼上 CSV」功能

核心降低門檻功能：使用者可從 Excel/Numbers/Google Sheets 複製表格，直接 `Ctrl+V` 貼入。

解析策略：
1. 偵測分隔符（tab > comma > 其他）
2. 嘗試 match header row → 自動對應欄位
3. 無 header → 按位置映射（日期, 類型, 標的, 數量, 單價, 金額, 費用）
4. 容錯：忽略無法解析的列，標示為「需修正」

#### 載入方式

- **空帳本 landing**：內嵌展開（全寬）
- **Workbench 內**：Full-screen modal overlay（`z-index: 10`），因為需要足夠空間操作 grid

### 4.3 共用元件

| 元件 | 用途 |
|------|------|
| `EntryTypeSegment` | 7 值 segmented control，共用於 QuickEntry 和 BatchEditor 每列 |
| `SecurityAutocomplete` | 股票代號搜尋，支援 id 或名稱模糊匹配 |
| `CurrencyInput` | 數字輸入 + 千分位格式化 + 正負號顏色 |
| `InlineValidation` | 欄位級錯誤提示（紅框 + 下方 error text） |
| `Toast` | 操作成功/失敗通知，自動 dismiss 5s |

---

## Stage 5 — UX Polish

### 漸進式引導（User Flow）

```
首次進入（空帳本）
  │
  ├─ 選「逐筆新增」→ 展開 QuickEntry form
  │   └─ 填完送出 → toast「✓ 已新增」→ 帳本有資料 → 自動跳轉 workbench
  │
  └─ 選「批次填寫」→ 展開 BatchEditor
      └─ 填完送出 → toast「✓ 已新增 N 筆」→ 自動跳轉 workbench

已有資料（workbench）
  │
  ├─ 點「+ 新增交易」→ Drawer 滑入 QuickEntry
  │   └─ 連續新增；關閉 drawer 時 ledger table 已更新
  │
  └─ 點「批次填寫」→ Full modal BatchEditor
      └─ 儲存 → 關閉 modal → ledger table 更新
```

### Loading States

| 操作 | Loading 表現 |
|------|-------------|
| 提交單筆 | 按鈕 disabled + spinner + text 改為「新增中…」 |
| 提交批次 | 底部 progress bar（已處理 / 總數） |
| 帳本重新載入 | LedgerList skeleton（已有實作） |

### 錯誤恢復

| 錯誤場景 | 處理方式 |
|---------|---------|
| 單筆提交失敗 | inline error，保留表單資料，可重試 |
| 批次部分失敗 | 高亮失敗列，顯示 per-row error，使用者修正後可重新提交該列 |
| 網路斷線 | 全域 banner「目前離線，儲存操作將在恢復連線後執行」 |

### Micro-interactions

- entryType 切換：欄位 visibility 用 `height` transition（150ms ease-out）
- Drawer 開啟：`transform: translateX` 200ms + backdrop fade
- 成功新增：toast 從右上角 slide-in，5s auto-dismiss
- 批次 grid 新增列：新列 `opacity 0→1` fade in

### Keyboard & Accessibility

- QuickEntry：Tab 順序遵循視覺順序；Enter 提交
- BatchEditor：
  - Tab 在 cell 間移動（左→右→下一列）
  - Enter 在同 column 下移
  - Ctrl+V 觸發 CSV paste 解析
- 所有 interactive elements ≥ 44px hit area
- `aria-live="polite"` for toast and validation feedback
- `role="grid"` with `aria-rowcount` for batch editor table

---

## API 端點規劃

### 新增端點

| Method | Path | 說明 |
|--------|------|------|
| `POST` | `/api/portfolios/:id/entries` | 新增單筆 |
| `POST` | `/api/portfolios/:id/entries/batch` | 批次新增（array of entries） |

### Request/Response 型別

```typescript
// packages/contracts/src/index.ts 新增

export interface CreateEntryRequest {
  occurredOn: string;          // ISO date
  entryType: LedgerEntryType;
  securityId?: string;
  quantity?: number;
  unitPrice?: number;
  grossCashAmount: number;
  feeAmount: number;
}

export interface CreateEntryResult {
  entry: LedgerEntry;
}

export interface BatchCreateRequest {
  entries: CreateEntryRequest[];
}

export interface BatchCreateResult {
  created: LedgerEntry[];
  errors: Array<{ index: number; message: string }>;
}
```

---

## 實作順序建議

```
Phase 1: 基礎建設
  1. 新增 API 端點 (POST /entries, POST /entries/batch)
  2. 新增 contracts 型別 (CreateEntryRequest, BatchCreateRequest, etc.)
  3. 建立 EntryPanel 替換 ImportPanel

Phase 2: 單筆輸入
  4. QuickEntryForm 元件（含動態欄位邏輯）
  5. EntryTypeSegment + CurrencyInput + InlineValidation 元件
  6. Drawer 容器（workbench 內使用）
  7. Toast 通知元件

Phase 3: 批次編輯
  8. BatchEditor grid 元件
  9. CSV paste 解析邏輯
  10. Full-screen modal 容器
  11. Per-row validation + partial submit

Phase 4: 收尾
  12. 移除 ImportPanel + importDemo 相關程式碼
  13. useLedgerBook 調整（移除 demo import，新增 createEntry/batchCreate）
  14. Responsive 測試 + keyboard 測試
```

---

## Dembrandt Gate 檢核

### Stage 3 Gate ✓ — Layout coherent across breakpoints
- 兩條輸入路徑嵌入現有 workbench layout，無新頁面
- Responsive 策略延續 layout reference 的四段斷點
- 不引入新 navigation；保持 shallow structure

### Stage 4 Gate ✓ — All interactive states handled
- 每個欄位有 empty/filled/error/disabled state
- Submit 有 idle/loading/success/error state
- BatchEditor 每列有 valid/error/empty state
- 連續輸入 flow 無 dead end

### Stage 5 Gate ✓ — Flow legible; perceived performance acceptable
- 漸進式引導：空帳本 → 首次輸入 → 自動進入 workbench
- Loading 全覆蓋：單筆 spinner、批次 progress bar
- Error recovery 無 dead end：保留資料 + 可重試
