# 專案規格書 (Project Specification)：股票帳本 Ledger Book

## 1. 專案概述 (Project Overview)

* **專案名稱**：股票帳本 Ledger Book
* **核心目標**：解決中長期投資人的「決策焦慮」。透過自動化量化真實績效，並結合 AI 提供客觀的質化籌碼與情緒分析，讓產品成為冷靜的「決策守護者」 。


* 
**目標受眾 (TA)**：採取核心-衛星策略、以美股或台股 ETF 為主、零星個股為輔，且無暇詳細研究財報的中長期投資人 。


* **痛點與解方**：
* 
**痛點**：使用者因隱私疑慮、輸入門檻過高，且缺乏即時回饋，不願手動輸入真實持股 。


* 
**解方**：捨棄繁瑣輸入，提供一鍵匯入的「Fake Demo」體驗以降低門檻 ；匯入後立即提供殘酷但真實的 XIRR/TWR 量化對比，並輔以 AI 質化降噪分析作為陪伴 。


---

## 2. 核心功能設計 (Core Features)

### 2.1 零摩擦庫存匯入 (Low-Friction Ingestion)

* 
**Fake Demo 體驗**：針對 Hackathon 展示，實作一鍵匯入固定 CSV 對帳單的流程，前端顯示「AI 辨識中」動畫，三秒內即可看到價值，完美迴避 OCR 的高風險與繁瑣操作 。


* 
**不可變帳本 (Immutable Ledger)**：底層資料庫設計將使用者的交易紀錄視為「只增不減 (Append-only)」的 Log，確保能隨時回推歷史任意時間點的資產快照 。



### 2.2 量化績效分析 (Quantitative Analysis)

* 
**動態趨勢圖表**：系統依據匯入的 Ledger，透過前端渲染（如 ECharts）畫出使用者資產對時間的曲線圖 。


* **雙重指標呈現**：
* 
**XIRR (延伸內部報酬率)**：展示使用者資金進出時間點所產生的真實資產成長率 。


* 
**TWR (時間加權報酬率)**：排除資金進出時機的干擾，客觀評估使用者的選股能力，並直接與大盤（如 0050 或 VOO）進行對比 。





### 2.3 AI 質化分析與決策守護 (Qualitative Analysis & Anti-FOMO Agent)

* 
**時間點回溯分析 (Time-Travel Analysis)**：使用者在圖表上點擊特定日期與特定虧損/暴漲個股時，系統會調閱該時間點的歷史客觀數據 。


* 
**客觀降噪報告**：由 AWS Bedrock AI Agent 統整 CMoney 獨家的「法人與大戶籌碼」以及「股市爆料同學會」社群輿情，產出如「籌碼未散，社群恐慌達頂峰」的摘要 。


* 
**視覺化法遵暗示**：**嚴格禁止 AI 提供買賣建議** 。將 AI 萃取的多空情緒轉化為 UI 顏色（紅色偏多/綠色偏空），以視覺暗示取代文字指引 。



---

## 3. 系統架構與技術選型 (System Architecture)

為了滿足金融資料的嚴謹性與 Hackathon 兩天內可 Live Demo 的開發速度，本專案將採用現代化雲原生架構 ：

| 元件層級 | 技術選型 | 負責任務與職責 |
| --- | --- | --- |
| **前端 (Frontend)** | Vue (SPA) | 確保複雜圖表（ECharts/Chart.js）與儀表板的初次載入效能，呈現流暢的視覺回饋 。

 |
| **後端核心 (Backend API)** | Elysia.js (TypeScript), Bun runtime | 提供嚴謹的型別系統，防止鬆散資料破壞金融計算，並將 API 與商業邏輯模組化解耦 。

 |
| **資料庫 (Database)** | PostgreSQL + Prisma ORM | 儲存 Immutable 的交易帳本與使用者狀態 。

 |
| **AI 推理 (AI Provider)** | AWS Bedrock (Nova Pro), AgentCore, OpenSearch Serverless  | Agent Runtime 查詢 OpenSearch 結構化數據，由 Nova Pro 生成客觀質化分析 。

 |

---

## 4. 核心演算法規範 (Core Algorithms)

後端計算引擎需整合經過實戰測試的 Node.js 套件，以避免 Hackathon 期間自行刻演算法導致無法收斂的問題 ：

### 4.1 XIRR 演算法 (依賴套件：`node-irr`)

利用 Newton-Raphson 數值尋根方法，找出使所有現金流之淨現值 (NPV) 為零的折現率 $r$ 。


$$\sum_{i=0}^{N}\frac{C_i}{(1+r)^{\frac{d_i-d_0}{365}}}=0$$

*(其中 $C_i$ 為現金流，$d_i$ 為交易日期)* 。

### 4.2 TWR 演算法 (依賴套件：`@railpath/finance-toolkit`)

每次發生現金流（$CF_i$）時截斷為一個子期間，需計算該期間的持有期報酬率（HPR），再將所有子期間相乘得出累積 TWR 。

1. 計算單期 HPR：

$$HPR_i=\frac{EMV_i-(BMV_i+CF_i)}{BMV_i+CF_i}$$



*(其中 $EMV_i$ 為期末市值，$BMV_i$ 為期初市值)* 。


2. 連結子期間：


$$TWR=\prod_{i=1}^{n}(1+HPR_i)-1$$


。



---

## 5. 資料與法遵規範 (Data & Compliance)

* 
**內部資料融合**：需整合 CMoney 提供的近一年個股價量、基本面、籌碼動向，以及「股市爆料同學會」的使用者討論內容 。


* 
**外部報價預載**：為確保 TWR 能取得精準的 $BMV$ 與 $EMV$，將捨棄動態打外部 API（FMP / Alpha Vantage），改為針對 Demo 的 3-5 檔股票預載歷史靜態資料至資料庫中，防範 API 限制導致 Demo 翻車 。


* 
**嚴守法規紅線**：AI Prompt 鎖死為「客觀事實統整器」，絕不產出「建議買進/賣出/持有」等字眼，避免觸犯台股投顧法規 。
