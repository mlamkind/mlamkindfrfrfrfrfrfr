import { soundFX } from "./soundFX";
import confetti from "canvas-confetti";

export type EasterEggType =
  | "barrel-roll"
  | "konami"
  | "party"
  | "matrix"
  | "zero-gravity"
  | "coin"
  | "laser"
  | "tada"
  | "purr";

export const triggerEasterEgg = (
  egg: EasterEggType,
  onNotification?: (msg: string) => void
) => {
  const rootEl = document.getElementById("root") || document.body;

  switch (egg) {
    case "barrel-roll": {
      soundFX.playBarrelRoll();
      rootEl.classList.remove("barrel-roll-active");
      void rootEl.offsetWidth; // reflow
      rootEl.classList.add("barrel-roll-active");
      if (onNotification) onNotification("🌀 Google Easter Egg: Do a Barrel Roll!");
      setTimeout(() => {
        rootEl.classList.remove("barrel-roll-active");
      }, 1800);
      break;
    }

    case "konami": {
      soundFX.playNinjaSlash();
      soundFX.play8BitFanfare();
      try {
        confetti({
          particleCount: 100,
          spread: 120,
          origin: { y: 0.6 },
          colors: ["#38bdf8", "#0284c7", "#5eead4", "#f2a65a", "#ffffff"],
        });
      } catch {}
      // Dispatch ninja transformation event to all robot face renderers
      window.dispatchEvent(
        new CustomEvent("zonyx-konami-ninja", {
          detail: {
            emotion: "ninja",
            pose: { leftArm: 75, rightArm: -25 },
          },
        })
      );
      if (onNotification)
        onNotification("🥷 KONAMI CODE ACTIVATED: Zonyx+ Shinobi Ninja Face & Stance Unlocked!");
      break;
    }

    case "party": {
      soundFX.playPartyDisco();
      try {
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { y: 0.5 },
          colors: ["#ec4899", "#5eead4", "#f2a65a", "#c084fc"],
        });
      } catch {}
      rootEl.classList.add("party-disco-active");
      if (onNotification) onNotification("🪩 Google Easter Egg: Disco Party Mode!");
      setTimeout(() => {
        rootEl.classList.remove("party-disco-active");
      }, 5500);
      break;
    }

    case "matrix": {
      soundFX.playGlitch();
      if (onNotification) onNotification("💻 Wake up, Neo... Zonyx+ Matrix Cyber Glitch!");
      break;
    }

    case "zero-gravity": {
      soundFX.playZeroGravity();
      rootEl.classList.add("zero-gravity-active");
      if (onNotification) onNotification("🌌 Google Easter Egg: Zero Gravity (Floating ESP32)!");
      setTimeout(() => {
        rootEl.classList.remove("zero-gravity-active");
      }, 6500);
      break;
    }

    case "coin": {
      soundFX.playCoin();
      try {
        confetti({
          particleCount: 25,
          spread: 50,
          origin: { y: 0.7 },
          colors: ["#fbbf24", "#f59e0b", "#d97706"],
        });
      } catch {}
      if (onNotification) onNotification("🪙 Insert Coin: 1-UP Power Boost! (+100 XP)");
      break;
    }

    case "laser": {
      soundFX.playLaser();
      if (onNotification) onNotification("🚀 Pew Pew! Arcade Laser Blaster Fired!");
      break;
    }

    case "tada": {
      soundFX.playTaDa();
      try {
        confetti({
          particleCount: 45,
          spread: 70,
          origin: { y: 0.65 },
        });
      } catch {}
      if (onNotification) onNotification("🎺 Ta-Da! Triumphant Fanfare!");
      break;
    }

    case "purr": {
      soundFX.playPurr();
      if (onNotification) onNotification("🐱 Soft robotic purr: Zonyx+ feels loved!");
      break;
    }
  }
};
