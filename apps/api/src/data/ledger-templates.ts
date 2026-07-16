/**
 * Pre-built ledger templates for onboarding.
 *
 * Each template defines a complete set of V1 context records
 * (holdings, principles, memories, inferences, behaviors)
 * that get bulk-inserted when a user selects a template.
 */

export interface TemplateHolding {
  name: string;
  /** TWSE stock code (e.g. "2330" for 台積電) */
  symbol: string;
  weight: number;
  cost: number;
  plPercent: number;
  purchaseDate: string;
}

export interface TemplatePrinciple {
  statement: string;
  confirmedAt: string;
  source: string;
  paused: boolean;
}

export interface TemplateMemory {
  quote: string;
  date: string;
  source: string;
}

export interface TemplateInference {
  statement: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidence: string;
}

export interface TemplateBehavior {
  label: string;
  value: string;
  detail?: string;
}

export interface LedgerTemplate {
  id: string;
  name: string;
  holdings: TemplateHolding[];
  principles: TemplatePrinciple[];
  memories: TemplateMemory[];
  inferences: TemplateInference[];
  behaviors: TemplateBehavior[];
}

export const ledgerTemplates: LedgerTemplate[] = [
  {
    id: "conservative",
    name: "穩健存股型",
    holdings: [
      {
        name: "中華電",
        symbol: "2412",
        weight: 30,
        cost: 122,
        plPercent: 5,
        purchaseDate: "2025-02-15",
      },
      {
        name: "台泥",
        symbol: "1101",
        weight: 20,
        cost: 36,
        plPercent: -2,
        purchaseDate: "2025-05-03",
      },
      {
        name: "兆豐金",
        symbol: "2886",
        weight: 25,
        cost: 42,
        plPercent: 8,
        purchaseDate: "2025-01-20",
      },
      {
        name: "統一",
        symbol: "1216",
        weight: 15,
        cost: 72,
        plPercent: 3,
        purchaseDate: "2025-07-10",
      },
      {
        name: "中鋼",
        symbol: "2002",
        weight: 10,
        cost: 25,
        plPercent: -1,
        purchaseDate: "2025-09-05",
      },
    ],
    principles: [
      {
        statement: "殖利率低於 4% 不考慮買進",
        confirmedAt: "2025-11-15",
        source: "選股標準",
        paused: false,
      },
      {
        statement: "每月定期定額，不管漲跌",
        confirmedAt: "2025-11-01",
        source: "買入策略",
        paused: false,
      },
      {
        statement: "不借錢買股票",
        confirmedAt: "2025-10-20",
        source: "風險控制",
        paused: false,
      },
    ],
    memories: [
      { quote: "領到股息就覺得安心，比價差重要", date: "2025-12-01", source: "配息入帳" },
      {
        quote: "台泥跌了 10% 我也沒有很慌，因為本來就打算放很久",
        date: "2025-11-20",
        source: "台泥下跌",
      },
      {
        quote: "同事推薦 AI 股，但我覺得波動太大不適合我",
        date: "2025-11-10",
        source: "選股討論",
      },
    ],
    inferences: [
      {
        statement: "你的投資風格偏保守長期持有，配息是主要動力",
        confidence: "HIGH",
        evidence: "持股平均持有超過 6 個月，全部為高殖利率標的",
      },
      {
        statement: "你可能過度集中在金融和傳產，缺少成長動能",
        confidence: "MEDIUM",
        evidence: "5 檔持股中 4 檔為傳產/金融，近一年報酬低於大盤",
      },
    ],
    behaviors: [
      { label: "平均持有天數", value: "210 天" },
      { label: "日均開啟次數", value: "0.8 次", detail: "除息日 ×2.5" },
      { label: "定期定額執行率", value: "92%" },
    ],
  },
  {
    id: "tech-growth",
    name: "科技成長型",
    holdings: [
      {
        name: "台積電",
        symbol: "2330",
        weight: 45,
        cost: 980,
        plPercent: 15,
        purchaseDate: "2025-03-12",
      },
      {
        name: "聯發科",
        symbol: "2454",
        weight: 25,
        cost: 1280,
        plPercent: -8,
        purchaseDate: "2025-05-20",
      },
      {
        name: "廣達",
        symbol: "2382",
        weight: 20,
        cost: 285,
        plPercent: 22,
        purchaseDate: "2025-02-08",
      },
      {
        name: "緯創",
        symbol: "3231",
        weight: 10,
        cost: 118,
        plPercent: -3,
        purchaseDate: "2025-06-01",
      },
    ],
    principles: [
      {
        statement: "只買有 AI 題材或技術護城河的公司",
        confirmedAt: "2025-12-01",
        source: "選股策略",
        paused: false,
      },
      {
        statement: "單一個股上限 40%，超過要減碼",
        confirmedAt: "2025-11-15",
        source: "集中度管理",
        paused: false,
      },
      {
        statement: "法說會前不加碼，等利多確認再動",
        confirmedAt: "2025-11-28",
        source: "操作紀律",
        paused: false,
      },
    ],
    memories: [
      {
        quote: "台積電佔太多了但就是不想賣，總覺得還會漲",
        date: "2025-12-10",
        source: "部位檢視",
      },
      {
        quote: "聯發科買在高點有點後悔，但 AI 手機長期看好",
        date: "2025-12-05",
        source: "聯發科回檔",
      },
      {
        quote: "廣達漲了好多，每天都在想要不要獲利了結",
        date: "2025-12-08",
        source: "獲利焦慮",
      },
      {
        quote: "看到其他人賺更多就會覺得自己選錯股",
        date: "2025-11-25",
        source: "比較心態",
      },
    ],
    inferences: [
      {
        statement: "你傾向在利多消息後追高，平均買進時機偏晚",
        confidence: "HIGH",
        evidence: "4 次買進中 3 次發生在個股月漲幅超過 15% 之後",
      },
      {
        statement: "雖然設了 40% 上限，但情緒上無法執行減碼",
        confidence: "MEDIUM",
        evidence: "台積電佔比超過上限已 3 週，尚未執行調整",
      },
    ],
    behaviors: [
      { label: "平均持有天數", value: "45 天" },
      { label: "日均開啟次數", value: "4.1 次", detail: "財報季 ×2.3" },
      { label: "追高買進比例", value: "75%", detail: "買在月漲幅 >10% 後" },
    ],
  },
  {
    id: "swing-trader",
    name: "波段操作型",
    holdings: [
      {
        name: "長榮",
        symbol: "2603",
        weight: 25,
        cost: 195,
        plPercent: -6,
        purchaseDate: "2025-11-25",
      },
      {
        name: "陽明",
        symbol: "2609",
        weight: 20,
        cost: 68,
        plPercent: 4,
        purchaseDate: "2025-12-01",
      },
      {
        name: "華航",
        symbol: "2610",
        weight: 15,
        cost: 22,
        plPercent: 10,
        purchaseDate: "2025-11-18",
      },
      {
        name: "聯電",
        symbol: "2303",
        weight: 20,
        cost: 52,
        plPercent: -2,
        purchaseDate: "2025-12-03",
      },
      {
        name: "國巨",
        symbol: "2327",
        weight: 20,
        cost: 520,
        plPercent: 7,
        purchaseDate: "2025-11-30",
      },
    ],
    principles: [
      {
        statement: "停損設在 -8%，到了就砍不猶豫",
        confirmedAt: "2025-12-05",
        source: "停損紀律",
        paused: false,
      },
      {
        statement: "一次最多持有 5 檔，不要太分散也不要太集中",
        confirmedAt: "2025-11-20",
        source: "部位管理",
        paused: false,
      },
      {
        statement: "跟著法人買超方向操作",
        confirmedAt: "2025-11-28",
        source: "進出場依據",
        paused: true,
      },
    ],
    memories: [
      {
        quote: "長榮已經到停損線了但捨不得賣，覺得會反彈",
        date: "2025-12-12",
        source: "長榮虧損",
      },
      {
        quote: "上次華航賣太早少賺了 15%，這次想多抱一下",
        date: "2025-12-08",
        source: "華航獲利",
      },
      {
        quote: "PTT 有人說航運要再噴一波，但我不太確定",
        date: "2025-12-10",
        source: "消息面",
      },
      { quote: "最近做太多筆了，手續費加起來也不少", date: "2025-12-06", source: "交易成本" },
      {
        quote: "國巨是看技術面買的，破季線就要出",
        date: "2025-12-03",
        source: "買進理由",
      },
    ],
    inferences: [
      {
        statement: "你嘴上說停損 -8%，但實際平均在 -12% 才出場",
        confidence: "HIGH",
        evidence: "近 10 次停損中 7 次超過設定幅度，平均多撐 4 天",
      },
      {
        statement: "獲利部位傾向太早了結，虧損部位反而死抱",
        confidence: "HIGH",
        evidence: "獲利平均持有 8 天，虧損平均持有 22 天",
      },
    ],
    behaviors: [
      { label: "平均持有天數", value: "12 天" },
      { label: "月交易次數", value: "18 次", detail: "含當沖 5 次" },
      { label: "停損執行率", value: "43%", detail: "超過停損線仍持有的比率 57%" },
    ],
  },
];

export function findTemplate(id: string): LedgerTemplate | undefined {
  return ledgerTemplates.find((t) => t.id === id);
}
