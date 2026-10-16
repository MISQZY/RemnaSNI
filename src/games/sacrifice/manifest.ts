import { defineGame } from "@/core/game";
import en from "./messages/en.json";
import ru from "./messages/ru.json";

export const sacrificeGame = defineGame({
  id: "sacrifice",
  icon: "skull",
  routes: ["/"],
  /** `sacrifice/stream` carries the player's own hand, so it goes with the session's token. */
  api: [
    "sacrifice",
    "sacrifice/deck",
    "sacrifice/pack",
    "sacrifice/trade",
    "sacrifice/robot/start",
    "sacrifice/robot/move",
    "sacrifice/duel/join",
    "sacrifice/duel/leave",
    "sacrifice/duel/move",
    "sacrifice/stream",
  ],
  messages: { en, ru },
});
