import { computed, onMounted, shallowRef } from "vue";

import {
  DEMO_PORTFOLIO_ID,
  type Dashboard,
  type DemoImportRequest,
  type DemoImportResult,
  type ReadyDashboard,
  type TimeTravelReport,
  type TimeTravelReportRequest,
} from "@ledger-book/contracts";

import { requestJson } from "../lib/api";

type DashboardPhase = "idle" | "loading" | "refreshing";
type ReportPhase = "error" | "idle" | "loading";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "服務暫時無法回應，請再試一次。";
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export function useLedgerBook() {
  const dashboard = shallowRef<Dashboard | null>(null);
  const dashboardError = shallowRef<string | null>(null);
  const dashboardPhase = shallowRef<DashboardPhase>("loading");
  const importing = shallowRef(false);
  const importError = shallowRef<string | null>(null);
  const availableDates = shallowRef<readonly string[]>([]);
  const selectedDate = shallowRef("");
  const selectedSecurityId = shallowRef("");
  const report = shallowRef<TimeTravelReport | null>(null);
  const reportError = shallowRef<string | null>(null);
  const reportPhase = shallowRef<ReportPhase>("idle");
  let dashboardRequest = 0;
  let reportRequest = 0;

  const readyDashboard = computed<ReadyDashboard | null>(() => {
    const current = dashboard.value;
    return current?.state === "ready" ? current : null;
  });
  const importPhase = computed<"empty" | "loading" | "recognizing">(() => {
    if (importing.value) {
      return "recognizing";
    }

    return dashboardPhase.value === "loading" && dashboard.value === null ? "loading" : "empty";
  });
  const landingError = computed(() => importError.value ?? dashboardError.value);
  const dashboardBusy = computed(() => dashboardPhase.value === "refreshing");

  function applyDashboard(next: Dashboard): void {
    dashboard.value = next;

    if (next.state === "empty") {
      selectedDate.value = "";
      selectedSecurityId.value = "";
      return;
    }

    availableDates.value = [
      ...new Set([...availableDates.value, ...next.timeline.map((point) => point.date)]),
    ].toSorted();
    selectedDate.value = next.asOfDate;
    if (!next.holdings.some((holding) => holding.securityId === selectedSecurityId.value)) {
      selectedSecurityId.value = next.holdings[0]?.securityId ?? "";
    }
  }

  async function loadDashboard(asOfDate?: string): Promise<void> {
    const requestId = ++dashboardRequest;
    dashboardPhase.value = dashboard.value?.state === "ready" ? "refreshing" : "loading";
    dashboardError.value = null;
    const query = asOfDate ? `?asOfDate=${encodeURIComponent(asOfDate)}` : "";

    try {
      const next = await requestJson<Dashboard>(
        `/api/portfolios/${DEMO_PORTFOLIO_ID}/dashboard${query}`,
      );
      if (requestId === dashboardRequest) {
        applyDashboard(next);
      }
    } catch (error) {
      if (requestId === dashboardRequest) {
        dashboardError.value = errorMessage(error);
      }
    } finally {
      if (requestId === dashboardRequest) {
        dashboardPhase.value = "idle";
      }
    }
  }

  async function importDemo(): Promise<void> {
    if (importing.value) {
      return;
    }

    importing.value = true;
    importError.value = null;
    const request: DemoImportRequest = { portfolioId: DEMO_PORTFOLIO_ID };

    try {
      const result = await Promise.race([
        Promise.all([
          wait(700),
          requestJson<DemoImportResult>("/api/demo-imports", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(request),
          }),
        ]).then(([, response]) => response),
        wait(3_000).then(() => {
          throw new Error("匯入逾時，請再試一次。");
        }),
      ]);

      if (result.status !== "completed") {
        throw new Error("示範資料尚未完成匯入，請再試一次。");
      }

      await loadDashboard();
    } catch (error) {
      importError.value = errorMessage(error);
    } finally {
      importing.value = false;
    }
  }

  async function selectDate(asOfDate: string): Promise<void> {
    if (asOfDate === selectedDate.value || asOfDate.length === 0) {
      return;
    }

    selectedDate.value = asOfDate;
    reportRequest += 1;
    report.value = null;
    reportError.value = null;
    reportPhase.value = "idle";
    await loadDashboard(asOfDate);
  }

  async function selectHolding(securityId: string): Promise<void> {
    if (securityId.length === 0) {
      return;
    }

    selectedSecurityId.value = securityId;
    report.value = null;
    reportError.value = null;
    await loadReport();
  }

  async function loadReport(): Promise<void> {
    const currentDashboard = readyDashboard.value;
    const securityId = selectedSecurityId.value;
    const asOfDate = selectedDate.value;
    if (!currentDashboard || securityId.length === 0 || asOfDate.length === 0) {
      return;
    }

    const requestId = ++reportRequest;
    reportPhase.value = "loading";
    reportError.value = null;
    const request: TimeTravelReportRequest = { securityId, asOfDate };

    try {
      const next = await requestJson<TimeTravelReport>(
        `/api/portfolios/${DEMO_PORTFOLIO_ID}/time-travel-reports`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(request),
        },
      );

      if (requestId === reportRequest) {
        report.value = next;
        reportPhase.value = "idle";
      }
    } catch (error) {
      if (requestId === reportRequest) {
        reportError.value = errorMessage(error);
        reportPhase.value = "error";
      }
    }
  }

  onMounted(() => {
    void loadDashboard();
  });

  return {
    availableDates: computed(() => availableDates.value),
    dashboard: computed(() => dashboard.value),
    dashboardBusy,
    dashboardError: computed(() => dashboardError.value),
    importDemo,
    importPhase,
    landingError,
    loadDashboard,
    readyDashboard,
    report: computed(() => report.value),
    reportError: computed(() => reportError.value),
    reportPhase: computed(() => reportPhase.value),
    retryReport: loadReport,
    selectDate,
    selectedDate: computed(() => selectedDate.value),
    selectHolding,
    selectedSecurityId: computed(() => selectedSecurityId.value),
  };
}
