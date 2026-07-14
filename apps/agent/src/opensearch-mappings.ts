/**
 * OpenSearch Index Mappings for CMoney Hackathon Data Package
 *
 * Strategy:
 * - 4 time-series indices (daily data, ~72K rows each): price, institutional, returns, momentum
 * - 1 forum index (daily stats, ~106K rows)
 * - 3 static indices (small, one row per stock): dividend, consecutive_dividend, industry
 * - 1 wide-table summary (snapshot, 300 rows) — kept for quick single-query lookups
 *
 * All indices use 股票代號 as keyword for exact match and 日期 as date for range queries.
 */

export const INDEX_MAPPINGS = {
  // ─── Daily Time-Series ──────────────────────────────────────────────────────

  /** 01_Price_Valuation_2025.csv */
  "stock-price": {
    mappings: {
      properties: {
        日期: { type: "date", format: "basic_date" }, // 20250102
        股票代號: { type: "keyword" },
        股票名稱: { type: "keyword" },
        開盤價: { type: "float" },
        最高價: { type: "float" },
        最低價: { type: "float" },
        收盤價: { type: "float" },
        漲跌: { type: "float" },
        "漲幅(%)": { type: "float" },
        成交量: { type: "long" },
        "成交金額(千)": { type: "long" },
        "股本(百萬)": { type: "float" },
        "總市值(億)": { type: "float" },
        "市值比重(%)": { type: "float" },
        本益比: { type: "float" },
        "本益比(近四季)": { type: "float" },
        股價淨值比: { type: "float" },
        "週轉率(%)": { type: "float" },
        漲跌停: { type: "byte" }, // -1, 0, 1
      },
    },
    settings: { number_of_shards: 1, number_of_replicas: 0 },
  },

  /** 02_Institutional_Trading_2025.csv */
  "stock-institutional": {
    mappings: {
      properties: {
        日期: { type: "date", format: "basic_date" },
        股票代號: { type: "keyword" },
        股票名稱: { type: "keyword" },
        外資買賣超: { type: "long" },
        投信買賣超: { type: "long" },
        自營商買賣超: { type: "long" },
        買賣超合計: { type: "long" },
        "外資持股(張)": { type: "long" },
        "外資持股比率(%)": { type: "float" },
        "投信持股比率(%)": { type: "float" },
        "自營商持股比率(%)": { type: "float" },
        "法人持股比率(%)": { type: "float" },
        "外資持股市值(百萬)": { type: "float" },
        "法人持股市值(百萬)": { type: "float" },
      },
    },
    settings: { number_of_shards: 1, number_of_replicas: 0 },
  },

  /** 03_Return_Rate_2025.csv */
  "stock-returns": {
    mappings: {
      properties: {
        日期: { type: "date", format: "basic_date" },
        股票代號: { type: "keyword" },
        股票名稱: { type: "keyword" },
        還原收盤價: { type: "float" },
        "日報酬率(%)": { type: "float" },
        "週報酬率(%)": { type: "float" },
        "月報酬率(%)": { type: "float" },
        "季報酬率(%)": { type: "float" },
        "半年報酬率(%)": { type: "float" },
        "年報酬率(%)": { type: "float" },
        "與大盤比年報酬率(%)": { type: "float" },
        "殖利率(%)": { type: "float" },
      },
    },
    settings: { number_of_shards: 1, number_of_replicas: 0 },
  },

  /** 04_Distance_from_High_Low_Momentum_2025.csv */
  "stock-momentum": {
    mappings: {
      properties: {
        日期: { type: "date", format: "basic_date" },
        股票代號: { type: "keyword" },
        股票名稱: { type: "keyword" },
        今年以來新高價: { type: "float" },
        今年以來新低價: { type: "float" },
        "今年以來漲跌幅%": { type: "float" },
        "近5日漲跌幅%": { type: "float" },
        "近20日漲跌幅%": { type: "float" },
        "近60日漲跌幅%": { type: "float" },
        "股價乖離月線(%)": { type: "float" },
        "股價乖離季線(%)": { type: "float" },
        "股價乖離年線(%)": { type: "float" },
        股價創歷史新高: { type: "byte" }, // 0 or 1
        股價創N日新高: { type: "integer" },
        股價連N日漲: { type: "integer" },
      },
    },
    settings: { number_of_shards: 1, number_of_replicas: 0 },
  },

  /** 10_Forum_Posts_Replies_Daily_Stats_2025.csv */
  "stock-forum": {
    mappings: {
      properties: {
        日期: { type: "date", format: "basic_date" },
        股票代號: { type: "keyword" },
        股票名稱: { type: "keyword" },
        發文則數: { type: "integer" },
        發文人數: { type: "integer" },
        看多發文: { type: "integer" },
        看空發文: { type: "integer" },
        中性發文: { type: "integer" },
        回文則數: { type: "integer" },
        回文人數: { type: "integer" },
      },
    },
    settings: { number_of_shards: 1, number_of_replicas: 0 },
  },

  // ─── Static / Per-Stock ─────────────────────────────────────────────────────

  /** 05_Dividend_Ex_Dividend_2025.csv */
  "stock-dividend": {
    mappings: {
      properties: {
        年度: { type: "keyword" },
        股票代號: { type: "keyword" },
        股票名稱: { type: "keyword" },
        配發次數: { type: "integer" },
        "現金股利合計(元)": { type: "float" },
        "股票股利合計(元)": { type: "float" },
        "現金股利殖利率(%)": { type: "float" },
        "股利發放率(%)": { type: "float" },
        除息日: { type: "keyword" }, // may be empty
        除權日: { type: "keyword" },
        除息最後回補日: { type: "keyword" },
        股東會日期: { type: "keyword" },
      },
    },
    settings: { number_of_shards: 1, number_of_replicas: 0 },
  },

  /** 06 + 06b merged: Consecutive Dividend */
  "stock-consecutive-dividend": {
    mappings: {
      properties: {
        年度: { type: "keyword" },
        股票代號: { type: "keyword" },
        股票名稱: { type: "keyword" },
        現金股利連N年遞增: { type: "float" },
        連續N年發放現金股利: { type: "float" },
        現金股利排名: { type: "float" },
        現金股利殖利率排名: { type: "float" },
      },
    },
    settings: { number_of_shards: 1, number_of_replicas: 0 },
  },

  /** 07_Industry_Classification_Mapping.csv */
  "stock-industry": {
    mappings: {
      properties: {
        股票代號: { type: "keyword" },
        股票名稱: { type: "keyword" },
        上市上櫃: { type: "keyword" },
        主產業: { type: "keyword" },
        全部產業標籤: { type: "text", analyzer: "standard" }, // may contain multiple tags
      },
    },
    settings: { number_of_shards: 1, number_of_replicas: 0 },
  },

  /** 09_Wide_Table_Summary_One_Row_Per_Stock_2025.csv */
  "stock-summary": {
    mappings: {
      properties: {
        股票代號: { type: "keyword" },
        股票名稱: { type: "keyword" },
        市場: { type: "keyword" },
        產業: { type: "keyword" },
        收盤價: { type: "float" },
        "總市值(億)": { type: "float" },
        "市值比重(%)": { type: "float" },
        "本益比(近四季)": { type: "float" },
        股價淨值比: { type: "float" },
        "週轉率(%)": { type: "float" },
        "季報酬率(%)": { type: "float" },
        "年報酬率(%)": { type: "float" },
        "與大盤比年報酬(%)": { type: "float" },
        "殖利率(%)": { type: "float" },
        近20日法人買賣超: { type: "long" },
        "外資持股率(%)": { type: "float" },
        "法人持股率(%)": { type: "float" },
        連續配息年數: { type: "float" },
        最新年度現金股利: { type: "float" },
        "股利發放率(%)": { type: "float" },
        最近除息日: { type: "keyword" },
        同學會瀏覽次數: { type: "long" },
        同學會瀏覽人數: { type: "long" },
        今年新高: { type: "float" },
        今年新低: { type: "float" },
        "今年以來(%)": { type: "float" },
        "距年線乖離(%)": { type: "float" },
        "買點分位(%)": { type: "float" },
        創歷史新高: { type: "byte" },
      },
    },
    settings: { number_of_shards: 1, number_of_replicas: 0 },
  },
} as const;

/** CSV filename → index name mapping */
export const CSV_TO_INDEX: Record<string, keyof typeof INDEX_MAPPINGS> = {
  "01_Price_Valuation_2025.csv": "stock-price",
  "02_Institutional_Trading_2025.csv": "stock-institutional",
  "03_Return_Rate_2025.csv": "stock-returns",
  "04_Distance_from_High_Low_Momentum_2025.csv": "stock-momentum",
  "05_Dividend_Ex_Dividend_2025.csv": "stock-dividend",
  "06_Consecutive_Dividend_Stocks_2025.csv": "stock-consecutive-dividend",
  "06b_Consecutive_Dividend_ETF_2025.csv": "stock-consecutive-dividend",
  "07_Industry_Classification_Mapping.csv": "stock-industry",
  "09_Wide_Table_Summary_One_Row_Per_Stock_2025.csv": "stock-summary",
  "10_Forum_Posts_Replies_Daily_Stats_2025.csv": "stock-forum",
};
