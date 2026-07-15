import type {
  Holding,
  Principle,
  Memory,
  Inference,
  Behavior,
  Scenario,
  ConversationStep,
} from "../types";

export const seedHoldings: Holding[] = [
  { id: "h1", name: "台積電", weight: 40, cost: 980, plPercent: 12, purchaseDate: "2026-04-01" },
  { id: "h2", name: "聯發科", weight: 28, cost: 1280, plPercent: -5, purchaseDate: "2026-05-15" },
  { id: "h3", name: "長榮", weight: 20, cost: 168, plPercent: 8, purchaseDate: "2026-03-20" },
  { id: "h4", name: "聯電", weight: 12, cost: 52, plPercent: 3, purchaseDate: "2026-06-10" },
];

export const seedPrinciples: Principle[] = [
  {
    id: "p1",
    statement: "單一個股不超過 30%",
    confirmedAt: "2026-07-10",
    source: "集中度超標",
    paused: false,
  },
  {
    id: "p2",
    statement: "科技股集中是我刻意的",
    confirmedAt: "2026-07-08",
    source: "產業配置",
    paused: false,
  },
  {
    id: "p3",
    statement: "以長期持有為主",
    confirmedAt: "2026-07-05",
    source: "投資風格",
    paused: false,
  },
];

export const seedMemories: Memory[] = [
  {
    id: "m1",
    quote: "其實最難受的是不知道發生什麼，不一定是真的想賣",
    date: "2026-07-05",
    source: "台積電下跌",
    archived: false,
  },
  {
    id: "m2",
    quote: "覺得跌很多，大家都說會反彈",
    date: "2026-06-28",
    source: "買進聯發科",
    archived: false,
  },
  {
    id: "m3",
    quote: "我不太看技術分析，主要看公司基本面",
    date: "2026-06-20",
    source: "投資方法",
    archived: false,
  },
  {
    id: "m4",
    quote: "最近工作很忙，沒時間看盤",
    date: "2026-07-12",
    source: "使用頻率下降",
    archived: false,
  },
  {
    id: "m5",
    quote: "電動車我不太懂，不想碰",
    date: "2026-06-15",
    source: "選股範圍",
    archived: false,
  },
];

export const seedInferences: Inference[] = [
  {
    id: "i1",
    statement: "你可能比較容易在市場熱度上升時進場",
    confidence: "中",
    evidence: "近5次買進中4次發生在個股月漲幅>10%時",
    status: "pending",
  },
  {
    id: "i2",
    statement: "實際操作比自述策略更短線——平均持有 18 天 vs 自述長期",
    confidence: "高",
    evidence: "交易紀錄顯示平均持有天數18天",
    status: "pending",
  },
];

export const seedBehaviors: Behavior[] = [
  { id: "b1", label: "平均持有天數", value: "18 天", excluded: false },
  { id: "b2", label: "日均開啟次數", value: "2.3 次", detail: "虧損日 ×3.1", excluded: false },
  { id: "b3", label: "查看虧損股頻率", value: "獲利股的 4.2 倍", excluded: false },
];

export const scenarios: Scenario[] = [
  {
    id: "concentration-risk",
    greeting: "我今天替你看了庫存，有兩件事情值得注意。",
    insight: "你持有 4 檔股票，但實際有 68% 的風險來自同一個 AI 伺服器題材。",
    attentionItems: [
      {
        id: "theme-overlap",
        label: "題材高度重疊",
        detail: "台積電、聯發科、聯電都跟 AI 半導體相關，漲跌方向一致的天數佔 78%。",
        severity: "warning",
      },
      {
        id: "single-sector",
        label: "電子股佔比過高",
        detail: "你的持倉 80% 集中在電子產業，缺乏其他產業的對沖。",
        severity: "danger",
      },
    ],
    actions: ["為什麼我比大盤跌得多？", "這是短期波動還是配置問題？", "我現在很焦慮，幫我整理一下"],
  },
  {
    id: "market-drop",
    greeting: "今天開盤大盤跌了 1.8%，我幫你看了持股的影響。",
    insight: "你的投資組合今天帳面下跌約 3.2 萬，但其中 2.4 萬來自台積電一檔的貢獻。",
    attentionItems: [
      {
        id: "single-stock-impact",
        label: "單一個股影響過大",
        detail: "台積電佔你總部位 40%，今天下跌 4.1%，貢獻了整體虧損的 75%。",
        severity: "danger",
      },
      {
        id: "vs-benchmark",
        label: "相對大盤表現",
        detail: "大盤跌 1.8%，你跌 2.6%。差異主要來自集中持股而非選股品質。",
        severity: "info",
      },
    ],
    actions: ["幫我算如果繼續跌 5% 的影響", "我該不該減碼台積電？", "歷史上類似跌幅通常多久恢復？"],
  },
  {
    id: "strategy-drift",
    greeting: "我注意到你的操作模式和自述策略有些不同。",
    insight: "你說自己是長期持有，但過去一個月查看庫存的頻率是正常的 3 倍，而且集中在虧損持股。",
    attentionItems: [
      {
        id: "check-frequency",
        label: "查看頻率異常",
        detail: "過去 7 天你開啟 app 16 次，其中 12 次是看聯發科（虧損中）。",
        severity: "warning",
      },
      {
        id: "drift",
        label: "策略漂移信號",
        detail: "長期持有者通常不需要每天確認價格。你的焦慮可能來自部位大小而非策略。",
        severity: "info",
      },
    ],
    actions: ["我的持有天數跟策略一致嗎？", "是不是部位太重導致焦慮？", "幫我回顧當初買進的理由"],
  },
  {
    id: "good-news",
    greeting: "恭喜！你的投資組合本月表現不錯。",
    insight: "本月報酬 +4.2%，跑贏大盤 1.8 個百分點，主要受惠於台積電法說會利多。",
    attentionItems: [
      {
        id: "outperform",
        label: "超額報酬來源",
        detail: "台積電單檔貢獻 +3.1%，其餘持股合計貢獻 +1.1%。",
        severity: "info",
      },
      {
        id: "rebalance-hint",
        label: "集中度進一步提高",
        detail: "台積電佔比已從 35% 上升到 40%，超過你設定的 30% 上限。",
        severity: "warning",
      },
    ],
    actions: ["我該獲利了結一部分嗎？", "如果台積電回跌，影響有多大？", "有沒有其他值得加碼的標的"],
  },
];

export const conversationScript: ConversationStep[] = [
  { role: "user", text: "今天跌很多，我有點想全部賣掉。", delay: 800 },
  { role: "agent", text: "我先幫你分清楚：今天真的發生了多大的變化？", delay: 1200 },
  {
    role: "agent",
    card: {
      type: "insight",
      title: "今日持倉變化",
      portfolioChange: "-2.8%",
      marketChange: "-1.5%",
      breakdown: [
        { label: "台積電 (2330)", value: "-3.2%", note: "佔持倉 40%" },
        { label: "聯發科 (2454)", value: "-4.1%", note: "佔持倉 28%" },
        { label: "長榮 (2603)", value: "-0.8%", note: "跌幅正常" },
      ],
    },
    delay: 1500,
  },
  {
    role: "agent",
    card: {
      type: "memory-recall",
      date: "2026-07-05",
      context: "上次你也是在單日跌幅超過 2.5% 時表示想離場",
      quote: "其實最難受的是不知道發生什麼，不一定是真的想賣。",
    },
    delay: 1800,
  },
  {
    role: "agent",
    card: {
      type: "evidence",
      title: "分析依據",
      confidence: 82,
      sources: [
        { name: "今日收盤報價（台灣證交所）", kind: "fact" },
        { name: "你的持倉成本均價", kind: "fact" },
        { name: "與歷史回撤幅度比較", kind: "inference" },
        { name: "個股營收月報（近三月）", kind: "fact" },
        { name: "法人買賣超推估情緒面", kind: "inference" },
      ],
      summary: "本次判讀主要基於價格事實與你的歷史行為模式，情緒面推論標示為「推論」供你辨別。",
    },
    delay: 2000,
  },
  {
    role: "agent",
    card: {
      type: "scenario-comparison",
      scenarios: [
        {
          id: "volatility",
          title: "短期波動",
          likelihood: "高",
          description: "大盤因國際事件單日修正，基本面未變。持續持有的歷史勝率較高。",
          action: "觀察 2-3 天再決定",
        },
        {
          id: "overweight",
          title: "部位過重",
          likelihood: "中",
          description: "科技股佔比 68%，超過一般建議。可考慮部分減碼回到目標配置。",
          action: "減碼至目標比例",
        },
        {
          id: "fundamental",
          title: "基本面改變",
          likelihood: "低",
          description: "近三月營收成長穩定，無重大利空。目前無證據顯示基本面惡化。",
          action: "重新檢視買進理由",
        },
      ],
    },
    delay: 2200,
  },
  {
    role: "agent",
    card: {
      type: "confirmation-question",
      question: "你現在最想先釐清哪一件事？",
      options: ["這次下跌原因", "我的部位是不是太重", "原本買進理由是否改變"],
    },
    delay: 1500,
  },
];

export interface StockResponse {
  stockName: string;
  midInsight: string;
  finalInsight: (holding: string, pnl: string, cost: string, weight: string) => string;
}

const stockResponses: Record<string, StockResponse> = {
  台積電: {
    stockName: "台積電",
    midInsight:
      "台積電目前位於年度相對高檔，近三個月外資持續加碼。以你的持有狀態來看，這個位置容易產生「要不要獲利了結」的焦慮——這很正常。",
    finalInsight: (_h, pnl, cost, weight) => {
      if (pnl === "賺錢")
        return `你在台積電的成本約 ${cost} 元，佔部位 ${weight}%。目前帳面獲利中，但佔比${Number(weight) > 30 ? "偏高" : "適中"}。你的焦慮更像是「配置焦慮」——擔心單一持股影響整體。建議思考：如果台積電跌 20%，你的總資產會縮水多少？`;
      if (pnl === "虧損")
        return `你在台積電的成本約 ${cost} 元，佔部位 ${weight}%，目前處於虧損。這是典型的「價格焦慮」——每天看盤都在想何時回本。以台積電的基本面和法人買超趨勢，時間站在你這邊。問題是：你能等多久？`;
      return `你在台積電的成本約 ${cost} 元，佔部位 ${weight}%，目前接近成本價。這是最容易猶豫的位置——漲了怕沒賺到，跌了怕虧。建議設定明確的停利停損點。`;
    },
  },
  聯發科: {
    stockName: "聯發科",
    midInsight:
      "聯發科近期受惠 AI 手機題材，股價從底部反彈約 25%。法人看法分歧，短線波動較大。現階段的核心問題是：你買的是「題材」還是「基本面」？",
    finalInsight: (_h, pnl, cost, weight) => {
      if (pnl === "賺錢")
        return `你在聯發科的成本約 ${cost} 元，佔部位 ${weight}%。帳面獲利中，但聯發科波動大。AI 題材能撐多久沒人知道，落袋為安不會錯。`;
      if (pnl === "虧損")
        return `你在聯發科的成本約 ${cost} 元，佔部位 ${weight}%，目前虧損。聯發科屬於景氣循環股，虧損時最怕攤平越攤越深。建議觀察下季財報再決定。`;
      return `你在聯發科的成本約 ${cost} 元，佔部位 ${weight}%，接近打平。半導體股波動本來就大，接近成本是個好的觀察點。`;
    },
  },
  長榮: {
    stockName: "長榮",
    midInsight:
      "長榮目前處於航運景氣循環的相對高點，殖利率仍具吸引力但股價已反映大部分利多。關鍵問題是：你是存股領息，還是賺價差？",
    finalInsight: (_h, pnl, cost, weight) => {
      if (pnl === "賺錢")
        return `你在長榮的成本約 ${cost} 元，佔部位 ${weight}%。航運是強景氣循環，建議想清楚：你願意在景氣反轉時坐過雲霄飛車嗎？`;
      if (pnl === "虧損")
        return `你在長榮的成本約 ${cost} 元，佔部位 ${weight}%，目前虧損。航運股套在高點是很多人的經驗。如果不急用錢，領息等待是一種策略。`;
      return `你在長榮的成本約 ${cost} 元，佔部位 ${weight}%，接近成本。航運股在成本附近最適合重新評估你的持有目的。`;
    },
  },
};

const defaultStockResponse: StockResponse = {
  stockName: "",
  midInsight:
    "以你的持有狀態來看，重要的不是漲跌預測，而是釐清你的焦慮來源——是怕虧損？怕錯過？還是不確定該不該動？",
  finalInsight: (_h, pnl, cost, weight) => {
    if (pnl === "賺錢")
      return `你的成本約 ${cost} 元，佔部位 ${weight}%，目前獲利中。設定一個「如果跌到 X 就出」的價格，然後不要再回頭看。`;
    if (pnl === "虧損")
      return `你的成本約 ${cost} 元，佔部位 ${weight}%，目前虧損。問問自己：如果現在沒持有，以這個價格你還會買嗎？`;
    return `你的成本約 ${cost} 元，佔部位 ${weight}%，接近成本。檢視當初買進的理由——如果理由還在就繼續，如果已變就換股。`;
  },
};

export function getStockResponse(name: string): StockResponse {
  return stockResponses[name] ?? { ...defaultStockResponse, stockName: name };
}
