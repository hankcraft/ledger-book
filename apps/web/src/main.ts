import { createApp } from "vue";

import App from "./App.vue";
import router from "./router";
import { ApiServiceKey, createApiService, setApiService } from "./services";
import "./styles.css";

const app = createApp(App);
const apiService = createApiService();

setApiService(apiService);
app.use(router);
app.provide(ApiServiceKey, apiService);
app.mount("#app");
