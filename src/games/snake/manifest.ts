import { defineGame } from "@/core/game";
import en from "./messages/en.json";
import ru from "./messages/ru.json";

export const snakeGame = defineGame({
  id: "snake",
  icon: "worm",
  routes: ["/"],
  api: ["snake", "snake/perks"],
  messages: { en, ru },
});
