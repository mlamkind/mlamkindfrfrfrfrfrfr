import React, { useState } from "react";
import { soundFX } from "../../utils/soundFX";
import { triggerEasterEgg, EasterEggType } from "../../utils/easterEggs";
import {
  X,
  Sparkles,
  Gamepad2,
  Volume2,
  VolumeX,
  Compass,
  Zap,
  Terminal,
  RotateCw,
  PartyPopper,
  Coins,
  Radio,
  Music,
  Smile,
  Shield,
  Cat,
} from "lucide-react";

interface EasterEggsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerNotification?: (msg: string) => void;
}

export const EasterEggsModal: React.FC<EasterEggsModalProps> = ({
  isOpen,
  onClose,
  onTriggerNotification,
}) => {
  const [activeTab, setActiveTab] = useState<"eggs" | "soundboard" | "secrets">("eggs");
  const [recentTriggered, setRecentTriggered] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEgg = (type: EasterEggType, name: string) => {
    setRecentTriggered(name);
    triggerEasterEgg(type, (msg) => {
      if (onTriggerNotification) onTriggerNotification(msg);
    });
    setTimeout(() => setRecentTriggered(null), 2500);
  };

  const soundboardItems = [
    {
      name: "Arcade Coin",
      desc: "Iconic 2-tone retro coin ping (B5 -> E6)",
      category: "Arcade",
      icon: Coins,
      action: () => soundFX.playCoin(),
      color: "text-[#fbbf24] border-[#fbbf24]/40 bg-[#fbbf24]/10",
    },
    {
      name: "Laser Blaster",
      desc: "Retro arcade sci-fi pew-pew sweep",
      category: "Arcade",
      icon: Zap,
      action: () => soundFX.playLaser(),
      color: "text-[#f87171] border-[#f87171]/40 bg-[#f87171]/10",
    },
    {
      name: "8-Bit Victory Fanfare",
      desc: "Chiptune NES 7-note arpeggio chord",
      category: "Retro",
      icon: Gamepad2,
      action: () => soundFX.play8BitFanfare(),
      color: "text-[#5eead4] border-[#5eead4]/40 bg-[#5eead4]/10",
    },
    {
      name: "Barrel Roll Whoosh",
      desc: "Resonant dynamic frequency rotation",
      category: "Easter Egg",
      icon: RotateCw,
      action: () => soundFX.playBarrelRoll(),
      color: "text-[#60a5fa] border-[#60a5fa]/40 bg-[#60a5fa]/10",
    },
    {
      name: "Party Disco Riff",
      desc: "Funky upbeat synthesized brass chord run",
      category: "Musical",
      icon: Music,
      action: () => soundFX.playPartyDisco(),
      color: "text-[#ec4899] border-[#ec4899]/40 bg-[#ec4899]/10",
    },
    {
      name: "Ta-Da! Fanfare",
      desc: "Triumphant major brass chord celebration",
      category: "Musical",
      icon: PartyPopper,
      action: () => soundFX.playTaDa(),
      color: "text-[#f2a65a] border-[#f2a65a]/40 bg-[#f2a65a]/10",
    },
    {
      name: "Cyber Glitch",
      desc: "Rapid digital matrix frequency jitter",
      category: "Cyber",
      icon: Radio,
      action: () => soundFX.playGlitch(),
      color: "text-[#34d399] border-[#34d399]/40 bg-[#34d399]/10",
    },
    {
      name: "Robot Purr",
      desc: "Harmonic 24Hz LFO modulated feline rumble",
      category: "Companion",
      icon: Cat,
      action: () => soundFX.playPurr(),
      color: "text-[#c084fc] border-[#c084fc]/40 bg-[#c084fc]/10",
    },
    {
      name: "High Five Clack",
      desc: "Crisp quad-frequency handclap chime",
      category: "Interaction",
      icon: Smile,
      action: () => soundFX.playHighFive(),
      color: "text-[#5eead4] border-[#5eead4]/40 bg-[#5eead4]/10",
    },
    {
      name: "Robot Giggle",
      desc: "Playful tickle chirps and chuckles",
      category: "Interaction",
      icon: Smile,
      action: () => soundFX.playGiggle(),
      color: "text-[#f2a65a] border-[#f2a65a]/40 bg-[#f2a65a]/10",
    },
    {
      name: "Zero Gravity Hum",
      desc: "Ethereal orbital space harmonics",
      category: "Ambient",
      icon: Sparkles,
      action: () => soundFX.playZeroGravity(),
      color: "text-[#818cf8] border-[#818cf8]/40 bg-[#818cf8]/10",
    },
    {
      name: "SG90 Servo Whir",
      desc: "Analog servo PWM rotation motor hum",
      category: "Hardware",
      icon: Shield,
      action: () => soundFX.playServoMove(),
      color: "text-[#8b93a7] border-[#2a3140] bg-[#141820]",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#141820] border border-[#2a3140] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-[#2a3140] bg-[#191e27]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#5eead4]/10 border border-[#5eead4]/30 flex items-center justify-center text-[#5eead4] shrink-0">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-mono font-bold text-xs sm:text-sm text-[#eef1f6] truncate">
                  Google Easter Eggs & Sound FX Lab
                </h3>
                {recentTriggered && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#5eead4]/20 text-[#5eead4] border border-[#5eead4]/40 animate-pulse">
                    Triggered: {recentTriggered}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-[#8b93a7] truncate">
                Classic easter eggs, interactive sound effects, and secret commands
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundFX.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-[#8b93a7] hover:text-[#eef1f6] hover:bg-[#2a3140] transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation (Responsive Horizontal Scroll on Mobile) */}
        <div className="flex items-center border-b border-[#2a3140] px-3 sm:px-5 bg-[#10131a] gap-1 sm:gap-2 pt-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              soundFX.playClick();
              setActiveTab("eggs");
            }}
            className={`px-3 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "eggs"
                ? "border-[#5eead4] text-[#5eead4] font-bold"
                : "border-transparent text-[#8b93a7] hover:text-[#eef1f6]"
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Google Easter Eggs</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              setActiveTab("soundboard");
            }}
            className={`px-3 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "soundboard"
                ? "border-[#f2a65a] text-[#f2a65a] font-bold"
                : "border-transparent text-[#8b93a7] hover:text-[#eef1f6]"
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Sound FX Soundboard</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              setActiveTab("secrets");
            }}
            className={`px-3 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "secrets"
                ? "border-[#c084fc] text-[#c084fc] font-bold"
                : "border-transparent text-[#8b93a7] hover:text-[#eef1f6]"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Secret Terminal Cheats</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {activeTab === "eggs" && (
            <div className="space-y-4">
              <div className="text-xs text-[#8b93a7] leading-relaxed">
                Click any easter egg to launch it live on the page! You can also type these keywords into the Zonyx+ Chat Terminal.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Barrel Roll */}
                <div
                  onClick={() => handleEgg("barrel-roll", "Do a Barrel Roll")}
                  className="p-3.5 bg-[#191e27] border border-[#2a3140] hover:border-[#60a5fa] rounded-lg transition-all cursor-pointer group hover:bg-[#1a2333]"
                >
                  <div className="flex items-center gap-2 text-sm font-mono font-bold text-[#60a5fa] mb-1">
                    <RotateCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
                    <span>Do a Barrel Roll</span>
                  </div>
                  <p className="text-xs text-[#8b93a7] mb-2">
                    Spins the entire page 360 degrees with a whooshing resonant audio sweep.
                  </p>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#60a5fa]/15 text-[#60a5fa] border border-[#60a5fa]/30">
                    Type: "do a barrel roll"
                  </span>
                </div>

                {/* 2. Konami Code */}
                <div
                  onClick={() => handleEgg("konami", "Konami Shinobi Ninja Mode")}
                  className="p-3.5 bg-[#191e27] border border-[#2a3140] hover:border-[#38bdf8] rounded-lg transition-all cursor-pointer group hover:bg-[#162534]"
                >
                  <div className="flex items-center gap-2 text-sm font-mono font-bold text-[#38bdf8] mb-1">
                    <Gamepad2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>Konami Shinobi Ninja Mode</span>
                  </div>
                  <p className="text-xs text-[#8b93a7] mb-2">
                    Transforms the robot's face into a stealth ninja with forehead protector (忍), cloth mask, shuriken pupils, katana slash FX & 8-bit fanfare!
                  </p>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30">
                    Keys: ↑ ↑ ↓ ↓ ← → ← → B A
                  </span>
                </div>

                {/* 3. Disco Party */}
                <div
                  onClick={() => handleEgg("party", "Disco Party Mode")}
                  className="p-3.5 bg-[#191e27] border border-[#2a3140] hover:border-[#ec4899] rounded-lg transition-all cursor-pointer group hover:bg-[#2b1725]"
                >
                  <div className="flex items-center gap-2 text-sm font-mono font-bold text-[#ec4899] mb-1">
                    <Music className="w-4 h-4 group-hover:animate-bounce" />
                    <span>Disco Party Mode</span>
                  </div>
                  <p className="text-xs text-[#8b93a7] mb-2">
                    Rainbow edge glow, upbeat funk synthesizer riff, and celebratory burst.
                  </p>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ec4899]/15 text-[#ec4899] border border-[#ec4899]/30">
                    Type: "party" or "disco"
                  </span>
                </div>

                {/* 4. Zero Gravity */}
                <div
                  onClick={() => handleEgg("zero-gravity", "Zero Gravity")}
                  className="p-3.5 bg-[#191e27] border border-[#2a3140] hover:border-[#818cf8] rounded-lg transition-all cursor-pointer group hover:bg-[#1c1d33]"
                >
                  <div className="flex items-center gap-2 text-sm font-mono font-bold text-[#818cf8] mb-1">
                    <Sparkles className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                    <span>Google Zero Gravity</span>
                  </div>
                  <p className="text-xs text-[#8b93a7] mb-2">
                    Ethereal space harmonic chime with weightless floating oscillation.
                  </p>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#818cf8]/15 text-[#818cf8] border border-[#818cf8]/30">
                    Type: "zero gravity"
                  </span>
                </div>

                {/* 5. Matrix Mode */}
                <div
                  onClick={() => handleEgg("matrix", "Matrix Mode")}
                  className="p-3.5 bg-[#191e27] border border-[#2a3140] hover:border-[#34d399] rounded-lg transition-all cursor-pointer group hover:bg-[#132720]"
                >
                  <div className="flex items-center gap-2 text-sm font-mono font-bold text-[#34d399] mb-1">
                    <Terminal className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>Matrix Cyber Glitch</span>
                  </div>
                  <p className="text-xs text-[#8b93a7] mb-2">
                    High-tech cyber matrix glitch noise and terminal prompt notification.
                  </p>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#34d399]/15 text-[#34d399] border border-[#34d399]/30">
                    Type: "matrix" or "hack"
                  </span>
                </div>

                {/* 6. Coin 1-UP */}
                <div
                  onClick={() => handleEgg("coin", "1-UP Coin")}
                  className="p-3.5 bg-[#191e27] border border-[#2a3140] hover:border-[#fbbf24] rounded-lg transition-all cursor-pointer group hover:bg-[#262215]"
                >
                  <div className="flex items-center gap-2 text-sm font-mono font-bold text-[#fbbf24] mb-1">
                    <Coins className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>Insert Coin (1-UP)</span>
                  </div>
                  <p className="text-xs text-[#8b93a7] mb-2">
                    Authentic arcade double-chime coin pickup with gold particle sparkles.
                  </p>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30">
                    Type: "coin" or "flip a coin"
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "soundboard" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#8b93a7]">
                <span>Tap any sound pad to audition the synthesized Web Audio effect:</span>
                <span className="font-mono text-[#5eead4]">{soundboardItems.length} Sound Effects</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {soundboardItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        item.action();
                        setRecentTriggered(item.name);
                        setTimeout(() => setRecentTriggered(null), 1200);
                      }}
                      className={`p-3 text-left rounded-lg border transition-all cursor-pointer active:scale-95 group flex flex-col justify-between h-28 ${item.color}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-current opacity-80">
                          {item.category}
                        </span>
                      </div>
                      <div>
                        <div className="font-mono font-bold text-xs text-white group-hover:text-current transition-colors line-clamp-1">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-[#8b93a7] line-clamp-1 mt-0.5">
                          {item.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "secrets" && (
            <div className="space-y-4">
              <div className="text-xs text-[#8b93a7]">
                Type any of these phrases into the <strong>Zonyx+ Chat Simulator</strong> terminal or press the keyboard keys anywhere on the page:
              </div>

              <div className="space-y-2">
                {[
                  {
                    trigger: "do a barrel roll",
                    result: "Spins the whole webpage 360° with barrel roll sound effect",
                    tag: "Google Classic",
                  },
                  {
                    trigger: "↑ ↑ ↓ ↓ ← → ← → B A",
                    result: "Global keyboard Konami code activates 8-bit overclock and victory fanfare",
                    tag: "Konami Code",
                  },
                  {
                    trigger: "party or disco",
                    result: "Fires neon disco party edges, confetti and funky synth music",
                    tag: "Party Mode",
                  },
                  {
                    trigger: "zero gravity",
                    result: "Triggers ethereal space audio and floating physics animation",
                    tag: "Zero Gravity",
                  },
                  {
                    trigger: "laser or pew pew",
                    result: "Fires arcade laser sound effect and robot combat stance",
                    tag: "Arcade",
                  },
                  {
                    trigger: "coin or flip a coin",
                    result: "Plays arcade 1-UP chime and gives heads/tails coin flip",
                    tag: "Arcade",
                  },
                  {
                    trigger: "matrix or hack",
                    result: "Plays cyber glitch audio and unlocks hacker terminal quips",
                    tag: "Cyber",
                  },
                  {
                    trigger: "purr",
                    result: "Robot makes gentle companion cat purr and heart expression",
                    tag: "Cute",
                  },
                ].map((secret) => (
                  <div
                    key={secret.trigger}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#191e27] border border-[#2a3140] rounded-lg gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-[#10131a] text-[#5eead4] font-mono font-bold rounded border border-[#2a3140]">
                        {secret.trigger}
                      </code>
                      <span className="text-[#c5cdd9]">{secret.result}</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#c084fc]/15 text-[#c084fc] border border-[#c084fc]/30 w-fit">
                      {secret.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#2a3140] bg-[#191e27] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#8b93a7]">
            <Sparkles className="w-3.5 h-3.5 text-[#5eead4]" />
            <span>Built with Web Audio API synthesizers</span>
          </div>

          <button
            onClick={() => {
              soundFX.playClick();
              onClose();
            }}
            className="px-4 py-1.5 bg-[#2a3140] hover:bg-[#343d50] text-[#eef1f6] text-xs font-mono rounded transition-colors cursor-pointer"
          >
            Close Lab
          </button>
        </div>
      </div>
    </div>
  );
};
