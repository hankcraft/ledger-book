export const COPY = {
  brand: {
    appName: "投資搭檔",
    aiName: "搭檔",
  },
  errors: {
    generic: "沒成功，等一下再試？",
    offline: "目前離線，連上後會自動同步。",
    loadFailed: "暫時載入不了，請稍後再試。",
  },
  toasts: {
    added: "已新增 ✓",
    updated: "已更新",
    deleted: "已移除",
    onboardingComplete: "歡迎！我已經開始整理你的投資狀況。",
    onboardingSkipped: "已跳過設定，使用範例庫存。隨時可以到「我的庫存」修改。",
  },
  loading: {
    default: "讓我看看…",
    analyzing: "整理中…",
    creating: "建立中…",
  },
} as const;
