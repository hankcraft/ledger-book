import { createRouter, createWebHistory } from "vue-router";
import { useAppStore } from "../composables/useAppStore";
import OnboardingPage from "../pages/OnboardingPage.vue";
import HomePage from "../pages/HomePage.vue";
import AgentPage from "../pages/AgentPage.vue";
import PortraitPage from "../pages/PortraitPage.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/onboarding", name: "onboarding", component: OnboardingPage },
    { path: "/", name: "home", component: HomePage, meta: { requiresOnboarding: true } },
    { path: "/agent", name: "agent", component: AgentPage, meta: { requiresOnboarding: true } },
    {
      path: "/portrait",
      name: "portrait",
      component: PortraitPage,
      meta: { requiresOnboarding: true },
    },
  ],
});

router.beforeEach(async (to) => {
  const { hydrate, state } = useAppStore();
  await hydrate();

  if (to.meta.requiresOnboarding && !state.onboardingComplete) {
    return { name: "onboarding" };
  }
  if (to.name === "onboarding" && state.onboardingComplete) {
    return { name: "home" };
  }
});

export default router;
