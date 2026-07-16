/**
 * Pre-built ledger templates for onboarding.
 *
 * Users can pick one of these to skip the manual input flow
 * and jump directly into the app with realistic seed data.
 */

import type { UserContext } from "../services/types";
import type { Holding, Principle, Memory, Inference, Behavior } from "../types";

export interface LedgerTemplate {
  id: string;
  name: string;
  description: string;
  /** Short tagline shown on the card */
  tagline: string;
  /** Emoji or icon identifier */
  icon: string;
  /** The full UserContext this template produces */
  context: UserContext;
}

// ─── Template 1: 穩健存股型 ──────────────────────────────────

const conservativeHoldings: Holding[] = [
  { id: "t1-h1", name: "中華電", weight: 30, cost: 122, plPercent: 5, purchaseDate: "2025-02-15" },
  { id: "t1-h2", name: "台泥", weight: 20, cost: 36, plPercent: -2, purchaseDate: "2025-05-03" },
  { id: "t1-h3", name: "兆豐金", weight: 25, cost: 42, plPercent: 8, purchaseDate: "2025-01-20" },
  { id: "t1-h4", name: "統一", weight: 15, cost: 72, plPercent: 3, purchaseDate: "2025-07-10" },
  { id: "t1-h5", name: "中鋼", weight: 10, cost: 25, plPercent: -1, purchaseDate: "2025-09-05" },
];

const conservativePrinciples: Principle[] = [
  {
    id: "t1-p1",
    statement: "殖利率低於 4% 不考慮買進",
    confirmedAt: "2025-11-15",
    source: "選股標準",
    paused: false,
  },
  {
    id: "t1-p2",
    statement: "每月定期定額，不管漲跌",
    confirmedAt: "2025-11-01",
    source: "買入策略",
    paused: false,
  },
  {
    id: "t1-p3",
    statement: "不借錢買股票",
    confirmedAt: "2025-10-20",
    source: "風險控制",
    paused: false,
  },
];

const conservativeMemories: Memory[] = [
  {
    id: "t1-m1",
    quote: "領到股息就覺得安心，比價差重要",
    date: "2025-12-01",
    source: "配息入帳",
    archived: false,
  },
  {
    id: "t1-m2",
    quote: "台泥跌了 10% 我也沒有很慌，因為本來就打算放很久",
    date: "2025-11-20",
    source: "台泥下跌",
    archived: false,
  },
  {
    id: "t1-m3",
    quote: "同事推薦 AI 股，但我覺得波動太大不適合我",
    date: "2025-11-10",
    source: "選股討論",
    archived: false,
  },
];

const conservativeInferences: Inference[] = [
  {
    id: "t1-i1",
    statement: "你的投資風格偏保守長期持有，配息是主要動力",
    confidence: "高",
    evidence: "持股平均持有超過 6 個月，全部為高殖利率標的",
    status: "pending",
  },
  {
    id: "t1-i2",
    statement: "你可能過度集中在金融和傳產，缺少成長動能",
    confidence: "中",
    evidence: "5 檔持股中 4 檔為傳產/金融，近一年報酬低於大盤",
    status: "pending",
  },
];

const conservativeBehaviors: Behavior[] = [
  { id: "t1-b1", label: "平均持有天數", value: "210 天", excluded: false },
  { id: "t1-b2", label: "日均開啟次數", value: "0.8 次", detail: "除息日 ×2.5", excluded: false },
  { id: "t1-b3", label: "定期定額執行率", value: "92%", excluded: false },
];

// ─── Template 2: 科技成長型 ──────────────────────────────────

const techGrowthHoldings: Holding[] = [
  { id: "t2-h1", name: "台積電", weight: 45, cost: 980, plPercent: 15, purchaseDate: "2025-03-12" },
  {
    id: "t2-h2",
    name: "聯發科",
    weight: 25,
    cost: 1280,
    plPercent: -8,
    purchaseDate: "2025-05-20",
  },
  { id: "t2-h3", name: "廣達", weight: 20, cost: 285, plPercent: 22, purchaseDate: "2025-02-08" },
  { id: "t2-h4", name: "緯創", weight: 10, cost: 118, plPercent: -3, purchaseDate: "2025-06-01" },
];

const techGrowthPrinciples: Principle[] = [
  {
    id: "t2-p1",
    statement: "只買有 AI 題材或技術護城河的公司",
    confirmedAt: "2025-12-01",
    source: "選股策略",
    paused: false,
  },
  {
    id: "t2-p2",
    statement: "單一個股上限 40%，超過要減碼",
    confirmedAt: "2025-11-15",
    source: "集中度管理",
    paused: false,
  },
  {
    id: "t2-p3",
    statement: "法說會前不加碼，等利多確認再動",
    confirmedAt: "2025-11-28",
    source: "操作紀律",
    paused: false,
  },
];

const techGrowthMemories: Memory[] = [
  {
    id: "t2-m1",
    quote: "台積電佔太多了但就是不想賣，總覺得還會漲",
    date: "2025-12-10",
    source: "部位檢視",
    archived: false,
  },
  {
    id: "t2-m2",
    quote: "聯發科買在高點有點後悔，但 AI 手機長期看好",
    date: "2025-12-05",
    source: "聯發科回檔",
    archived: false,
  },
  {
    id: "t2-m3",
    quote: "廣達漲了好多，每天都在想要不要獲利了結",
    date: "2025-12-08",
    source: "獲利焦慮",
    archived: false,
  },
  {
    id: "t2-m4",
    quote: "看到其他人賺更多就會覺得自己選錯股",
    date: "2025-11-25",
    source: "比較心態",
    archived: false,
  },
];

const techGrowthInferences: Inference[] = [
  {
    id: "t2-i1",
    statement: "你傾向在利多消息後追高，平均買進時機偏晚",
    confidence: "高",
    evidence: "4 次買進中 3 次發生在個股月漲幅超過 15% 之後",
    status: "pending",
  },
  {
    id: "t2-i2",
    statement: "雖然設了 40% 上限，但情緒上無法執行減碼",
    confidence: "中",
    evidence: "台積電佔比超過上限已 3 週，尚未執行調整",
    status: "pending",
  },
];

const techGrowthBehaviors: Behavior[] = [
  { id: "t2-b1", label: "平均持有天數", value: "45 天", excluded: false },
  { id: "t2-b2", label: "日均開啟次數", value: "4.1 次", detail: "財報季 ×2.3", excluded: false },
  {
    id: "t2-b3",
    label: "追高買進比例",
    value: "75%",
    detail: "買在月漲幅 >10% 後",
    excluded: false,
  },
];

// ─── Template 3: 波段操作型 ──────────────────────────────────

const swingTraderHoldings: Holding[] = [
  { id: "t3-h1", name: "長榮", weight: 25, cost: 195, plPercent: -6, purchaseDate: "2025-11-25" },
  { id: "t3-h2", name: "陽明", weight: 20, cost: 68, plPercent: 4, purchaseDate: "2025-12-01" },
  { id: "t3-h3", name: "華航", weight: 15, cost: 22, plPercent: 10, purchaseDate: "2025-11-18" },
  { id: "t3-h4", name: "聯電", weight: 20, cost: 52, plPercent: -2, purchaseDate: "2025-12-03" },
  { id: "t3-h5", name: "國巨", weight: 20, cost: 520, plPercent: 7, purchaseDate: "2025-11-30" },
];

const swingTraderPrinciples: Principle[] = [
  {
    id: "t3-p1",
    statement: "停損設在 -8%，到了就砍不猶豫",
    confirmedAt: "2025-12-05",
    source: "停損紀律",
    paused: false,
  },
  {
    id: "t3-p2",
    statement: "一次最多持有 5 檔，不要太分散也不要太集中",
    confirmedAt: "2025-11-20",
    source: "部位管理",
    paused: false,
  },
  {
    id: "t3-p3",
    statement: "跟著法人買超方向操作",
    confirmedAt: "2025-11-28",
    source: "進出場依據",
    paused: true,
  },
];

const swingTraderMemories: Memory[] = [
  {
    id: "t3-m1",
    quote: "長榮已經到停損線了但捨不得賣，覺得會反彈",
    date: "2025-12-12",
    source: "長榮虧損",
    archived: false,
  },
  {
    id: "t3-m2",
    quote: "上次華航賣太早少賺了 15%，這次想多抱一下",
    date: "2025-12-08",
    source: "華航獲利",
    archived: false,
  },
  {
    id: "t3-m3",
    quote: "PTT 有人說航運要再噴一波，但我不太確定",
    date: "2025-12-10",
    source: "消息面",
    archived: false,
  },
  {
    id: "t3-m4",
    quote: "最近做太多筆了，手續費加起來也不少",
    date: "2025-12-06",
    source: "交易成本",
    archived: false,
  },
  {
    id: "t3-m5",
    quote: "國巨是看技術面買的，破季線就要出",
    date: "2025-12-03",
    source: "買進理由",
    archived: false,
  },
];

const swingTraderInferences: Inference[] = [
  {
    id: "t3-i1",
    statement: "你嘴上說停損 -8%，但實際平均在 -12% 才出場",
    confidence: "高",
    evidence: "近 10 次停損中 7 次超過設定幅度，平均多撐 4 天",
    status: "pending",
  },
  {
    id: "t3-i2",
    statement: "獲利部位傾向太早了結，虧損部位反而死抱",
    confidence: "高",
    evidence: "獲利平均持有 8 天，虧損平均持有 22 天",
    status: "pending",
  },
];

const swingTraderBehaviors: Behavior[] = [
  { id: "t3-b1", label: "平均持有天數", value: "12 天", excluded: false },
  { id: "t3-b2", label: "月交易次數", value: "18 次", detail: "含當沖 5 次", excluded: false },
  {
    id: "t3-b3",
    label: "停損執行率",
    value: "43%",
    detail: "超過停損線仍持有的比率 57%",
    excluded: false,
  },
];

// ─── Export ──────────────────────────────────────────────────

export const ledgerTemplates: LedgerTemplate[] = [
  {
    id: "conservative",
    name: "穩健存股型",
    description: "高殖利率、分散傳產金融，每月定期定額。適合想要穩定配息、不追求價差的投資風格。",
    tagline: "存股領息，穩穩累積",
    icon: "🏦",
    context: {
      holdings: conservativeHoldings,
      principles: conservativePrinciples,
      memories: conservativeMemories,
      inferences: conservativeInferences,
      behaviors: conservativeBehaviors,
    },
  },
  {
    id: "tech-growth",
    name: "科技成長型",
    description: "集中 AI 半導體供應鏈，追求資本利得。持股集中但波動大，適合看好科技趨勢的人。",
    tagline: "押注趨勢，追求成長",
    icon: "🚀",
    context: {
      holdings: techGrowthHoldings,
      principles: techGrowthPrinciples,
      memories: techGrowthMemories,
      inferences: techGrowthInferences,
      behaviors: techGrowthBehaviors,
    },
  },
  {
    id: "swing-trader",
    name: "波段操作型",
    description: "短線進出、跟著題材走。交易頻率高，需要嚴格紀律但常常做不到。",
    tagline: "看準波段，快進快出",
    icon: "⚡",
    context: {
      holdings: swingTraderHoldings,
      principles: swingTraderPrinciples,
      memories: swingTraderMemories,
      inferences: swingTraderInferences,
      behaviors: swingTraderBehaviors,
    },
  },
];
