import { defineGame } from "@/core/game";
import en from "./messages/en.json";
import ru from "./messages/ru.json";

export const clickerGame = defineGame({
  id: "clicker",
  icon: "hand",
  routes: ["/"],
  api: ["progress", "challenge"],
  messages: { en, ru },
});
