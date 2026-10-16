import { defineGame } from "@/core/game";
import en from "./messages/en.json";
import ru from "./messages/ru.json";

export const fishingGame = defineGame({
  id: "fishing",
  icon: "fish",
  routes: ["/"],
  api: ["fishing", "fishing/cast", "fishing/hook", "fishing/catch", "fishing/perks"],
  messages: { en, ru },
});
