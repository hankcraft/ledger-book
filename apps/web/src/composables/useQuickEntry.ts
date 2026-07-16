import { computed, reactive, ref } from "vue";

import { useAppStore } from "./useAppStore";

export interface QuickEntryFormState {
  entryType: "buy" | "sell";
  date: string;
  securityId: string;
  quantity: string;
  unitPrice: string;
}

const drawerOpen = ref(false);

export function useQuickEntry() {
  const { showToast } = useAppStore();

  const form = reactive<QuickEntryFormState>({
    entryType: "buy",
    date: new Date().toISOString().slice(0, 10),
    securityId: "",
    quantity: "",
    unitPrice: "",
  });

  const submitting = ref(false);
  const error = ref<string | null>(null);

  const grossAmount = computed(() => {
    const qty = Number(form.quantity);
    const price = Number(form.unitPrice);
    if (!qty || !price) return 0;
    const amount = qty * price;
    return form.entryType === "buy" ? -amount : amount;
  });

  const isValid = computed(() => {
    return (
      form.securityId.trim().length > 0 &&
      Number(form.quantity) > 0 &&
      Number(form.unitPrice) > 0 &&
      form.date.length > 0
    );
  });

  function resetForm(): void {
    // Keep entryType and date for consecutive entries
    form.securityId = "";
    form.quantity = "";
    form.unitPrice = "";
    error.value = null;
  }

  async function submitEntry(): Promise<boolean> {
    if (!isValid.value || submitting.value) return false;

    submitting.value = true;
    error.value = null;

    try {
      const qty = Number(form.quantity);
      const price = Number(form.unitPrice);

      const response = await fetch("/api/v1/performance/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: form.securityId.trim(),
          entryType: form.entryType,
          quantity: qty,
          unitPrice: price,
          date: form.date,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error?.message ?? "建立失敗");
      }

      resetForm();
      showToast("已新增 ✓");
      // Signal other components (e.g. PerformancePage) to refresh
      window.dispatchEvent(new CustomEvent("trade-created"));
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "沒成功，等一下再試？";
      return false;
    } finally {
      submitting.value = false;
    }
  }

  function openDrawer(): void {
    drawerOpen.value = true;
  }

  function closeDrawer(): void {
    drawerOpen.value = false;
    error.value = null;
  }

  return {
    drawerOpen,
    form,
    submitting,
    error,
    grossAmount,
    isValid,
    submitEntry,
    openDrawer,
    closeDrawer,
    resetForm,
  };
}
