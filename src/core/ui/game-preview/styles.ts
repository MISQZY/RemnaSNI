import { H } from "./canvas";

/*
 * What each `.gp-*` part of a scene does while its card is hovered (on a device that can hover) or focused. Parts turn
 * and scale about their own box, the cards of Sacrifice about the point their hand is held at. Only the `.gp-*` parts
 * get an origin: on an element with a `transform` attribute it would move that transform too, so those are wrapped.
 */
const PLAY: Record<string, string> = {
  boot: "animation: gp-boot 0.45s steps(1, end)",
  scan: "animation: gp-scan 0.7s ease-out",
  ripple: "animation: gp-ripple 1.2s ease-out infinite",
  tap: "animation: gp-tap 1.2s ease-out infinite",
  rise: "animation: gp-rise 1.2s ease-out infinite",
  idle: "opacity: 0",
  live: "opacity: 1",
  crawl: "animation: gp-crawl 2.6s steps(13, end) infinite",
  eat: "animation: gp-eat 2.6s ease-out infinite",
  bob: "animation: gp-bob 0.8s ease-in-out infinite alternate",
  wave: "animation: gp-wave 2.4s linear infinite",
  swim: "animation: gp-swim 1.8s ease-in-out infinite alternate",
  climb: "animation: gp-climb 2.6s infinite",
  peak: "animation: gp-peak 2.6s ease-out infinite",
  "fan-l": "animation: gp-fan-l 1.4s ease-in-out infinite alternate",
  "fan-r": "animation: gp-fan-r 1.4s ease-in-out infinite alternate",
  pick: "animation: gp-pick 1.4s ease-in-out infinite alternate",
  flash: "animation: gp-flash 1.5s ease-in-out infinite",
  twinkle: "animation: gp-twinkle 1.5s ease-in-out infinite",
  march: "animation: gp-march 0.6s linear infinite",
};

const played = (on: string) =>
  Object.entries(PLAY)
    .map(([part, rule]) => `${on} .gp-${part}{${rule}}`)
    .join("");

/** The scenes' styles, one hoisted <style> for the page (game-preview.tsx). */
export const CSS = `
.gp-boot [class*="gp-"]{transform-box:fill-box;transform-origin:center}
.gp-live{opacity:0}
.gp-boot .gp-fan-l,.gp-boot .gp-fan-r,.gp-boot .gp-pick{transform-box:view-box;transform-origin:160px 200px}
@media (prefers-reduced-motion:no-preference){
  @media (hover:hover){${played(".group:hover")}}
  ${played(".group:focus-visible")}
}
@keyframes gp-boot{0%{opacity:.35}18%{opacity:1}30%{opacity:.55}45%{opacity:1}}
@keyframes gp-scan{from{transform:translateY(0);opacity:.4}to{transform:translateY(${H + 4}px);opacity:0}}
@keyframes gp-ripple{from{transform:scale(.35);opacity:1}to{transform:scale(1.25);opacity:0}}
@keyframes gp-tap{0%,100%{transform:scale(1)}8%{transform:scale(.96)}20%{transform:scale(1.01)}}
@keyframes gp-rise{from{transform:translateY(8px);opacity:0}25%{opacity:1}to{transform:translateY(-14px);opacity:0}}
@keyframes gp-crawl{from{stroke-dashoffset:var(--at)}to{stroke-dashoffset:calc(var(--at) - 260px)}}
@keyframes gp-eat{0%{transform:scale(.4);opacity:0}8%,92%{transform:scale(1);opacity:1}98%,to{transform:scale(1.8);opacity:0}}
@keyframes gp-bob{to{transform:translateY(3px)}}
@keyframes gp-wave{to{transform:translateX(-40px)}}
@keyframes gp-swim{from{transform:translateX(-10px)}to{transform:translateX(14px)}}
@keyframes gp-climb{0%{clip-path:inset(-10px 100% -10px -10px);animation-timing-function:cubic-bezier(.55,0,.9,.5)}72%,86%{clip-path:inset(-10px);opacity:1}to{clip-path:inset(-10px);opacity:0}}
@keyframes gp-peak{0%,70%{transform:scale(.4);opacity:0}76%{transform:scale(1.3);opacity:1}90%,to{transform:scale(2.2);opacity:0}}
@keyframes gp-fan-l{to{transform:rotate(-6deg)}}
@keyframes gp-fan-r{to{transform:rotate(6deg)}}
@keyframes gp-pick{to{transform:translateY(-8px)}}
@keyframes gp-flash{0%,100%{opacity:1;transform:scale(1)}40%{opacity:.35;transform:scale(1.25)}55%{opacity:1;transform:scale(.9)}}
@keyframes gp-twinkle{0%,100%{stroke-opacity:1}50%{stroke-opacity:.3}}
@keyframes gp-march{to{stroke-dashoffset:-8}}
`;
