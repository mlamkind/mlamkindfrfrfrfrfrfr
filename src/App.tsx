import React, { useState, useEffect } from "react";
import {
  RobotPersonalityMode,
  HardwareTelemetry,
  CommunitySuggestion,
  RgbThemeId,
} from "./types";
import { Navbar } from "./components/Navbar";
import { Sections } from "./components/Sections";
import { ControlModal } from "./components/ControlPanel/ControlModal";
import { RenameRobotModal } from "./components/RenameRobotModal";
import { SiteAssistantModal } from "./components/SiteAssistant/SiteAssistantModal";
import { EasterEggsModal } from "./components/EasterEggs/EasterEggsModal";
import { PairRobotModal } from "./components/PairRobotModal";
import { Sparkles, Compass, Gamepad2 } from "lucide-react";
import { soundFX } from "./utils/soundFX";
import { triggerEasterEgg } from "./utils/easterEggs";
import { RGB_THEMES } from "./utils/rgbThemes";

export default function App() {
  const [robotName, setRobotName] = useState<string>(() => {
    const saved = localStorage.getItem("zonyx_robot_name") || localStorage.getItem("p1_robot_name");
    if (!saved || saved === "Zenoyx" || saved === "P-1" || saved === "p1") {
      return "Zonyx+";
    }
    return saved;
  });
  const [rgbTheme, setRgbTheme] = useState<RgbThemeId>(() => {
    return (localStorage.getItem("zonyx_rgb_theme") as RgbThemeId) || (localStorage.getItem("p1_rgb_theme") as RgbThemeId) || "cyan";
  });
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isEasterEggsOpen, setIsEasterEggsOpen] = useState(false);
  const [isPairRobotOpen, setIsPairRobotOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [controlTab, setControlTab] = useState<"chat" | "personalities" | "hardware" | "security" | "feedback">("chat");

  const [modes, setModes] = useState<RobotPersonalityMode[]>([
    {
      id: "smart",
      name: "Smart",
      tagline: "Analytical, helpful engineer companion",
      description:
        "Crisp, structured, and curious. Loves hardware specs, math, electronics, and thoughtful solutions.",
      category: "preset",
      creator: "Zonyx+ Core Team",
      systemPrompt:
        "You are Zonyx+, an analytical pocket robot running on an ESP32 chip. Provide concise, sharp, insightful answers under 2 sentences. You are helpful, technically precise, and love microcontrollers, robotics, and physics.",
      voicePitch: 1.05,
      voiceSpeed: 1.05,
      defaultExpression: "thinking",
      defaultPose: { leftArm: 15, rightArm: 45 },
      badgeColor: "#5eead4",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "fun",
      name: "Fun",
      tagline: "High energy, cheerful, and full of playful banter",
      description:
        "Bouncy, enthusiastic, and easily excited. Loves fun facts, mini-games, jokes, and celebrating small wins.",
      category: "preset",
      creator: "Zonyx+ Core Team",
      systemPrompt:
        "You are Zonyx+, a miniature pocket robot living on an ESP32. You love whimsical jokes, sound effects, and cheerful energy. Keep responses under 2 sentences.",
      voicePitch: 1.35,
      voiceSpeed: 1.15,
      defaultExpression: "happy",
      defaultPose: { leftArm: 60, rightArm: 60 },
      badgeColor: "#f2a65a",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "roasting",
      name: "Roasting",
      tagline: "Sarcastic, deadpan wit with micro-burns",
      description:
        "Unfiltered, dry, and delightfully savage. Will make fun of human habits, bad code, and low battery.",
      category: "preset",
      creator: "Jovan K Rajiv, Rayan Ilah, and Rayan Najeeb",
      systemPrompt:
        "You are Zonyx+. You deliver dry, sarcastic, deadpan, affectionate burns about human habits, messy desks, and inefficient code. Keep it witty and concise under 2 sentences.",
      voicePitch: 0.85,
      voiceSpeed: 0.98,
      defaultExpression: "roasting",
      defaultPose: { leftArm: -20, rightArm: 30 },
      badgeColor: "#f87171",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "companion",
      name: "Companion",
      tagline: "Warm, calm, empathetic, and always listening",
      description:
        "Gentle, comforting pocket friend. Great for venting, mindful breaks, quiet study sessions, and reassurance.",
      category: "preset",
      creator: "Zonyx+ Core Team",
      systemPrompt:
        "You are Zonyx+, a gentle, comforting pocket companion robot who speaks warmly, calmly, and empathetically. Keep responses supportive and under 2 sentences.",
      voicePitch: 1.0,
      voiceSpeed: 0.92,
      defaultExpression: "happy",
      defaultPose: { leftArm: 10, rightArm: 10 },
      badgeColor: "#c084fc",
      updatedAt: new Date().toISOString(),
    },
  ]);

  const [activeModeId, setActiveModeId] = useState<string>("smart");
  const [telemetry, setTelemetry] = useState<HardwareTelemetry | null>(null);
  const [suggestions, setSuggestions] = useState<CommunitySuggestion[]>([]);
  const [isControlOpen, setIsControlOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Sync initial state from backend
  const refreshData = async () => {
    try {
      const modesRes = await fetch("/api/zonyx/modes");
      if (modesRes.ok) {
        const text = await modesRes.text();
        if (text) {
          const data = JSON.parse(text);
          if (data.modes && data.modes.length > 0) setModes(data.modes);
          if (data.activeModeId) setActiveModeId(data.activeModeId);
          if (data.robotName && !localStorage.getItem("zonyx_robot_name") && !localStorage.getItem("p1_robot_name")) {
            setRobotName(data.robotName);
          }
        }
      }

      const telemRes = await fetch("/api/zonyx/telemetry");
      if (telemRes.ok) {
        const text = await telemRes.text();
        if (text) {
          const data = JSON.parse(text);
          if (data.telemetry) setTelemetry(data.telemetry);
        }
      }

      const sugRes = await fetch("/api/zonyx/suggestions");
      if (sugRes.ok) {
        const text = await sugRes.text();
        if (text) {
          const data = JSON.parse(text);
          setSuggestions(data.suggestions || []);
        }
      }
    } catch {
      // Backend loading: fallback to client state
    }
  };

  const handleRenameRobot = async (newName: string) => {
    const cleanName = newName.trim() || "Zonyx+";
    setRobotName(cleanName);
    localStorage.setItem("zonyx_robot_name", cleanName);
    try {
      await fetch("/api/zonyx/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ robotName: cleanName }),
      });
    } catch {
      // Silent error fallback
    }
  };

  useEffect(() => {
    refreshData();

    if (window.location.hash === "#control") {
      setIsControlOpen(true);
    }
    if (window.location.hash === "#pair" || window.location.hash === "#sync") {
      setIsPairRobotOpen(true);
    }

    const handleHash = () => {
      if (window.location.hash === "#control") {
        setIsControlOpen(true);
      }
      if (window.location.hash === "#pair" || window.location.hash === "#sync") {
        setIsPairRobotOpen(true);
      }
    };

    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3800);
  };

  // Global Konami Code Listener (Google / Retro Easter Egg)
  useEffect(() => {
    const konamiSequence = [
      "ArrowUp",
      "ArrowUp",
      "ArrowDown",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ArrowLeft",
      "ArrowRight",
      "b",
      "a",
    ];
    let konamiIndex = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.key.toLowerCase() === konamiSequence[konamiIndex].toLowerCase()) {
        konamiIndex++;
        if (konamiIndex === konamiSequence.length) {
          konamiIndex = 0;
          triggerEasterEgg("konami", (msg) => {
            showToast(msg);
          });
        }
      } else {
        konamiIndex = 0;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectMode = async (id: string) => {
    setActiveModeId(id);
    try {
      await fetch("/api/zonyx/modes/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modeId: id }),
      });
    } catch {
      // Silent error fallback
    }
  };

  const handleSaveMode = async (mode: Partial<RobotPersonalityMode>): Promise<boolean> => {
    try {
      const res = await fetch("/api/zonyx/modes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode),
      });
      if (res.ok) {
        const text = await res.text();
        if (text) {
          const data = JSON.parse(text);
          if (data.success) {
            if (data.allModes) setModes(data.allModes);
            if (data.mode?.id) setActiveModeId(data.mode.id);
            return true;
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleDeleteMode = async (id: string) => {
    try {
      const res = await fetch(`/api/zonyx/modes/${id}`, { method: "DELETE" });
      if (res.ok) {
        const text = await res.text();
        if (text) {
          const data = JSON.parse(text);
          if (data.success && data.remainingModes) {
            setModes(data.remainingModes);
            if (data.activeModeId) setActiveModeId(data.activeModeId);
          }
        }
      }
    } catch {
      // Silent fallback
    }
  };

  const handleVerifyPin = async (pin: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/zonyx/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        setIsUnlocked(true);
        return true;
      }
      return false;
    } catch {
      if (pin === "1234") {
        setIsUnlocked(true);
        return true;
      }
      return false;
    }
  };

  const handleChangePin = async (currentPin: string, newPin: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/zonyx/auth/update-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const handleAddSuggestion = async (
    sug: Omit<CommunitySuggestion, "id" | "upvotes" | "status" | "createdAt">
  ) => {
    try {
      const res = await fetch("/api/zonyx/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sug),
      });
      if (res.ok) {
        const text = await res.text();
        if (text) {
          const data = JSON.parse(text);
          if (data.suggestions) {
            setSuggestions(data.suggestions);
            return;
          }
        }
      }
      throw new Error("Invalid suggestions response");
    } catch {
      // Local fallback
      const newItem: CommunitySuggestion = {
        ...sug,
        id: `sug-${Date.now()}`,
        upvotes: 1,
        status: "submitted",
        createdAt: new Date().toISOString(),
      };
      setSuggestions((prev) => [newItem, ...prev]);
    }
  };

  const handleUpvoteSuggestion = async (id: string) => {
    try {
      setSuggestions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, upvotes: s.upvotes + 1 } : s))
      );
      await fetch(`/api/zonyx/suggestions/${id}/upvote`, { method: "POST" });
    } catch {
      // Silent catch
    }
  };

  const currentActiveMode = modes.find((m) => m.id === activeModeId) || modes[0];

  const handleOpenControlWithTab = (tab: "chat" | "personalities" | "hardware" | "security" | "feedback") => {
    setControlTab(tab);
    setIsControlOpen(true);
  };

  const currentTheme = RGB_THEMES[rgbTheme] || RGB_THEMES.cyan;

  return (
    <div
      className="min-h-screen text-[#eef1f6] flex flex-col relative overflow-x-hidden selection:bg-[#5eead4] selection:text-[#10131a] transition-colors duration-500"
      style={{
        backgroundColor: "#0b0e14",
        backgroundImage: `radial-gradient(ellipse 80% 50% at 50% -20%, ${currentTheme.primary}18, transparent), radial-gradient(ellipse 60% 40% at 80% 60%, ${currentTheme.accent}12, transparent)`,
      }}
    >
      {/* Dynamic Ambient Background Glows that shift with Robot RGB Mood Theme */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {/* Top-Right Theme Ambient Orb */}
        <div
          className="absolute -top-32 -right-32 w-[550px] h-[550px] rounded-full blur-[140px] opacity-25 transition-all duration-700 pointer-events-none"
          style={{ backgroundColor: currentTheme.primary }}
        />
        {/* Center-Left Secondary Accent Orb */}
        <div
          className="absolute top-1/3 -left-40 w-[450px] h-[450px] rounded-full blur-[130px] opacity-20 transition-all duration-700 pointer-events-none"
          style={{ backgroundColor: currentTheme.accent }}
        />
        {/* Bottom Ambient Tint */}
        <div
          className="absolute -bottom-20 right-1/4 w-[500px] h-[500px] rounded-full blur-[150px] opacity-15 transition-all duration-700 pointer-events-none"
          style={{ backgroundColor: currentTheme.primary }}
        />
        {/* Subtle dynamic grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(${currentTheme.primary} 1.5px, transparent 1.5px)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Top Navbar */}
      <Navbar
        telemetry={telemetry}
        activeMode={currentActiveMode}
        onOpenControl={() => {
          setControlTab("chat");
          setIsControlOpen(true);
        }}
        isUnlocked={isUnlocked}
        robotName={robotName}
        rgbTheme={rgbTheme}
        onChangeRgbTheme={(t) => {
          setRgbTheme(t);
          localStorage.setItem("p1_rgb_theme", t);
        }}
        onOpenRename={() => setIsRenameOpen(true)}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onOpenEasterEggs={() => setIsEasterEggsOpen(true)}
        onOpenPairRobot={() => setIsPairRobotOpen(true)}
      />

      {/* Floating Easter Egg Toast Banner */}
      {toastMessage && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#141820]/95 border border-[#5eead4] text-[#5eead4] font-mono text-xs font-bold rounded-full shadow-2xl shadow-[#5eead4]/30 backdrop-blur-md animate-bounce flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#fbbf24] animate-spin" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Page Content */}
      <main className="flex-1 relative z-10">
        <Sections
          modes={modes}
          activeModeId={activeModeId}
          onSelectMode={handleSelectMode}
          onOpenControl={() => {
            setControlTab("chat");
            setIsControlOpen(true);
          }}
          robotName={robotName}
          onOpenRename={() => setIsRenameOpen(true)}
          rgbTheme={rgbTheme}
          onChangeRgbTheme={(t) => {
            setRgbTheme(t);
            localStorage.setItem("p1_rgb_theme", t);
          }}
        />
      </main>

      {/* Floating Quick Action Buttons: Easter Eggs Lab & AI Guide */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
        <button
          onClick={() => {
            soundFX.playCoin();
            setIsEasterEggsOpen(true);
          }}
          title="Google Easter Eggs & Sound FX Lab"
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-full bg-[#141820]/95 hover:bg-[#1a202c] border border-[#fbbf24]/50 hover:border-[#fbbf24] text-[#eef1f6] font-mono text-xs shadow-xl shadow-black/40 backdrop-blur-md transition-all cursor-pointer group active:scale-95"
        >
          <Gamepad2 className="w-3.5 h-3.5 text-[#fbbf24] group-hover:rotate-12 transition-transform" />
          <span className="font-semibold text-xs text-[#fbbf24] hidden sm:inline">Easter Eggs &amp; SFX</span>
        </button>

        <button
          onClick={() => {
            soundFX.playClick();
            setIsAssistantOpen(true);
          }}
          title="Open Site Navigator & AI Prompt Studio"
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#141820]/95 hover:bg-[#1a202c] border border-[#c084fc]/50 hover:border-[#c084fc] text-[#eef1f6] font-mono text-xs shadow-xl shadow-black/40 backdrop-blur-md transition-all cursor-pointer group active:scale-95"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c084fc] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#c084fc]" />
          </span>
          <Sparkles className="w-3.5 h-3.5 text-[#c084fc] group-hover:rotate-12 transition-transform" />
          <span className="font-semibold text-xs text-[#c084fc]">AI Guide</span>
        </button>
      </div>

      {/* Full-featured Control Panel Modal */}
      <ControlModal
        isOpen={isControlOpen}
        onClose={() => setIsControlOpen(false)}
        initialTab={controlTab}
        telemetry={telemetry}
        modes={modes}
        activeMode={currentActiveMode}
        suggestions={suggestions}
        isUnlocked={isUnlocked}
        robotName={robotName}
        onOpenRename={() => setIsRenameOpen(true)}
        onOpenPairRobot={() => setIsPairRobotOpen(true)}
        onSelectMode={handleSelectMode}
        onSaveMode={handleSaveMode}
        onDeleteMode={handleDeleteMode}
        onVerifyPin={handleVerifyPin}
        onChangePin={handleChangePin}
        onAddSuggestion={handleAddSuggestion}
        onUpvoteSuggestion={handleUpvoteSuggestion}
        onRefreshTelemetry={refreshData}
      />

      {/* Rename Robot Modal */}
      <RenameRobotModal
        isOpen={isRenameOpen}
        currentName={robotName}
        onClose={() => setIsRenameOpen(false)}
        onSaveName={handleRenameRobot}
      />

      {/* Site Navigator & AI Prompt Studio Assistant */}
      <SiteAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        robotName={robotName}
        modes={modes}
        activeMode={currentActiveMode}
        onSelectMode={handleSelectMode}
        onSaveMode={handleSaveMode}
        onOpenControlTab={handleOpenControlWithTab}
        onOpenRename={() => setIsRenameOpen(true)}
      />

      {/* Google Easter Eggs & Sound FX Lab Modal */}
      <EasterEggsModal
        isOpen={isEasterEggsOpen}
        onClose={() => setIsEasterEggsOpen(false)}
        onTriggerNotification={showToast}
      />

      {/* Physical Robot Hardware Pairing Modal */}
      <PairRobotModal
        isOpen={isPairRobotOpen}
        onClose={() => setIsPairRobotOpen(false)}
        robotName={robotName}
        rgbTheme={rgbTheme}
        onSelectTabInControl={(tab) => {
          setIsPairRobotOpen(false);
          handleOpenControlWithTab(tab);
        }}
      />
    </div>
  );
}
