// Entry for Vite + TypeScript. Keep existing JS logic working by importing the legacy script,
// and load the global stylesheet so Vite processes it.
import { createApp } from "vue";
import App from "./App.vue";
import "../css/styles.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

const app = createApp(App);
app.mount("#app");

export {};
