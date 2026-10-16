import { defineGame } from "@/core/game";
import en from "./messages/en.json";
import ru from "./messages/ru.json";

export const crashGame = defineGame({
  id: "crash",
  icon: "chart-spline",
  routes: ["/"],
  api: ["crash", "crash/bet", "crash/cancel", "crash/cashout", "crash/stream"],
  messages: { en, ru },
});
