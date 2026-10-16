import { defineGame } from "@/core/game";
import en from "./messages/en.json";
import ru from "./messages/ru.json";

export const gemsGame = defineGame({
  id: "gems",
  icon: "gem",
  routes: ["/"],
  api: ["gems", "gems/start", "gems/perks"],
  messages: { en, ru },
});
