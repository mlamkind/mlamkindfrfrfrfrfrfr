import React, { useState, useEffect } from "react";
import { soundFX } from "../utils/soundFX";
import { triggerEasterEgg } from "../utils/easterEggs";
import { HardwareTelemetry, RobotPersonalityMode, RgbThemeId } from "../types";
import { RGB_THEMES, THEME_LIST } from "../utils/rgbThemes";
import {
  SlidersVertical,
  Volume2,
  VolumeX,
  Wifi,
  Download,
  Box,
  Cpu,
  Edit3,
  Compass,
  Sparkles,
  Gamepad2,
  Palette,
  Usb,
  Radio,
} from "lucide-react";
import { hardwareSync } from "../utils/hardwareSync";
import { HardwareSyncState } from "../types";
import { RadarStatusIndicator } from "./RadarStatusIndicator";

interface NavbarProps {
  telemetry: HardwareTelemetry | null;
  activeMode: RobotPersonalityMode;
  onOpenControl: () => void;
  isUnlocked: boolean;
  robotName?: string;
  onOpenRename?: () => void;
  onOpenAssistant?: () => void;
  onOpenEasterEggs?: () => void;
  onOpenPairRobot?: () => void;
  rgbTheme?: RgbThemeId;
  onChangeRgbTheme?: (theme: RgbThemeId) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  telemetry,
  activeMode,
  onOpenControl,
  isUnlocked,
  robotName = "Zonyx+",
  onOpenRename,
  onOpenAssistant,
  onOpenEasterEggs,
  onOpenPairRobot,
  rgbTheme = "cyan",
  onChangeRgbTheme,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(soundFX.enabled);
  const [logoClicks, setLogoClicks] = useState(0);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [syncState, setSyncState] = useState<HardwareSyncState>(hardwareSync.getState());

  useEffect(() => {
    const unsub = hardwareSync.subscribeState(setSyncState);
    return () => {
      unsub();
    };
  }, []);

  const currentTheme = RGB_THEMES[rgbTheme] || RGB_THEMES.cyan;

  const toggleSound = () => {
    const newState = soundFX.toggleSound();
    setSoundEnabled(newState);
  };

  const handleOpenControl = () => {
    soundFX.playClick();
    onOpenControl();
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const next = logoClicks + 1;
    setLogoClicks(next);
    if (next >= 5) {
      setLogoClicks(0);
      triggerEasterEgg("barrel-roll");
    } else {
      soundFX.playBoop();
    }
  };

  return (
    <nav
      className="sticky top-0 z-50 bg-[#0d1017]/90 backdrop-blur-xl border-b transition-colors duration-500 shadow-xl"
      style={{
        borderColor: `${currentTheme.primary}33`,
        boxShadow: `0 4px 24px -6px ${currentTheme.glow}`,
      }}
    >
      <div className="flex justify-between items-center px-3 sm:px-6 py-2.5 max-w-[1100px] mx-auto">
        {/* Brand Logo & Robot Status */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <a
              href="#"
              onClick={handleLogoClick}
              title="Click 5 times for a secret Google easter egg!"
              className="font-mono text-sm sm:text-base md:text-lg font-bold tracking-tight text-[#eef1f6] flex items-center gap-1.5 sm:gap-2 hover:opacity-90 transition-opacity group select-none"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: currentTheme.primary }}
                />
                <span
                  className="relative inline-flex rounded-full h-2.5 w-2.5"
                  style={{ backgroundColor: currentTheme.primary }}
                />
              </span>
              <span
                className="group-hover:tracking-wider transition-all font-extrabold"
                style={{ color: currentTheme.primary }}
              >
                {robotName}
              </span>
              <span className="text-[10px] font-mono text-[#8b93a7] font-normal px-1.5 py-0.5 rounded bg-[#141820] border border-[#2a3140] hidden sm:inline">
                Zonyx+
              </span>
            </a>

            {onOpenRename && (
              <button
                onClick={() => {
                  soundFX.playClick();
                  onOpenRename();
                }}
                title={`Rename robot (currently "${robotName}")`}
                className="p-1 sm:px-2 sm:py-1 rounded text-[#8b93a7] hover:text-[#eef1f6] hover:bg-[#191e27] border border-transparent hover:border-[#2a3140] transition-all cursor-pointer text-[11px] font-mono flex items-center gap-1 active:scale-95"
              >
                <Edit3 className="w-3 h-3 text-[#5eead4]" />
                <span className="hidden md:inline">Rename</span>
              </button>
            )}
          </div>

          {onOpenPairRobot ? (
            <button
              onClick={() => {
                soundFX.playClick();
                onOpenPairRobot();
              }}
              title="Pair Physical Robot via USB-C Web Serial or WiFi WebSocket"
              className={`hidden lg:inline-flex items-center gap-2 px-2.5 py-1 text-[11px] font-mono border rounded-md transition-all cursor-pointer active:scale-95 ${
                syncState.status === "connected"
                  ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/25 shadow-[0_0_12px_rgba(94,234,212,0.2)]"
                  : "bg-[#141820] border-[#2a3140] hover:border-[#5eead4] text-[#8b93a7] hover:text-[#5eead4]"
              }`}
            >
              {syncState.status === "connected" ? (
                <>
                  <RadarStatusIndicator
                    isActive={true}
                    size="sm"
                    connectionType={syncState.connectionType}
                  />
                  <span className="text-emerald-300 font-bold tracking-tight">
                    ESP32 SYNC ACTIVE ({syncState.connectionType === "webserial" ? "115200 BAUD" : "WIFI"})
                  </span>
                  <span className="text-[10px] text-emerald-400/80 bg-emerald-950/60 px-1 rounded border border-emerald-500/30">
                    TX:{syncState.packetsSent}
                  </span>
                </>
              ) : (
                <>
                  <RadarStatusIndicator
                    isActive={false}
                    size="xs"
                  />
                  <span>Hardware Link:</span>
                  <span className="text-[#f2a65a] font-semibold flex items-center gap-1">
                    <Usb className="w-3 h-3 inline" />
                    Pair ESP32
                  </span>
                </>
              )}
            </button>
          ) : (
            <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono bg-[#141820] border border-[#2a3140] text-[#8b93a7] rounded-md">
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span>ESP32 WiFi</span>
              <span className="text-emerald-400 font-semibold">
                {telemetry?.online !== false ? "Online" : "Standby"}
              </span>
            </span>
          )}
        </div>

        {/* Desktop Navigation Anchors */}
        <div className="hidden md:flex items-center gap-3 lg:gap-5 text-[13px] font-medium font-mono">
          <a
            href="#model3d"
            onClick={() => soundFX.playClick()}
            className="hover:opacity-80 transition-opacity flex items-center gap-1 font-semibold"
            style={{ color: currentTheme.primary }}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Model</span>
          </a>
          <a href="#modes" onClick={() => soundFX.playClick()} className="text-[#8b93a7] hover:text-[#eef1f6] transition-colors">
            Personalities
          </a>
          <a href="#circuits" onClick={() => soundFX.playClick()} className="text-[#8b93a7] hover:text-[#5eead4] transition-colors">
            Wiring & Circuits
          </a>
          <a href="#calculator" onClick={() => soundFX.playClick()} className="text-[#8b93a7] hover:text-[#eef1f6] transition-colors">
            Cost & BOM
          </a>
          <a href="#faq" onClick={() => soundFX.playClick()} className="text-[#8b93a7] hover:text-[#eef1f6] transition-colors">
            FAQ & Assembly
          </a>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* RGB Theme Color Chooser */}
          <div className="relative">
            <button
              onClick={() => {
                soundFX.playBoop();
                setShowColorPicker(!showColorPicker);
              }}
              title={`Change Robot RGB Mood Lighting (Active: ${currentTheme.name})`}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-md bg-[#191e27] hover:bg-[#252e3e] border border-[#2a3140] hover:border-[#5eead4] transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono active:scale-95"
              style={{ borderColor: showColorPicker ? currentTheme.primary : undefined }}
            >
              <span
                className="w-3 h-3 rounded-full shadow-sm animate-pulse"
                style={{ backgroundColor: currentTheme.primary, boxShadow: `0 0 6px ${currentTheme.primary}` }}
              />
              <span className="hidden xl:inline text-[#eef1f6] text-[11px]">RGB</span>
            </button>

            {showColorPicker && (
              <div className="absolute right-0 mt-2 p-2 bg-[#141820] border border-[#2a3140] rounded-xl shadow-2xl z-50 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                {THEME_LIST.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      soundFX.playCoin();
                      onChangeRgbTheme?.(t.id);
                      setShowColorPicker(false);
                    }}
                    title={t.name}
                    className={`w-6 h-6 rounded-full transition-all flex items-center justify-center cursor-pointer ${
                      rgbTheme === t.id ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#141820]" : "opacity-75 hover:opacity-100 hover:scale-105"
                    }`}
                    style={{ backgroundColor: t.primary }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sound Mute / Unmute */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? "Mute Robot Sound FX" : "Enable Robot Sound FX"}
            className="p-1.5 sm:p-2 text-[#8b93a7] hover:text-[#5eead4] hover:bg-[#191e27] border border-transparent hover:border-[#2a3140] rounded-md transition-all cursor-pointer active:scale-90"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#5eead4]" /> : <VolumeX className="w-4 h-4 text-[#8b93a7]" />}
          </button>

          {/* 1-Click ZIP Download button */}
          <a
            href="/api/download/source-zip"
            download="p-1-pocket-robot-source.zip"
            onClick={() => soundFX.playBoop()}
            title="1-Click Download Full GitHub-Ready Project ZIP"
            className="hidden sm:flex items-center gap-1 text-xs font-mono px-2.5 py-1.5 rounded-md bg-[#191e27] hover:bg-[#252e3e] border border-[#2a3140] hover:border-[#5eead4] text-[#5eead4] transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden lg:inline font-bold">Source ZIP</span>
          </a>

          {/* Google Easter Eggs & Sound FX Lab Button */}
          {onOpenEasterEggs && (
            <button
              onClick={() => {
                soundFX.playCoin();
                onOpenEasterEggs();
              }}
              title="Google Easter Eggs & Sound FX Lab"
              className="flex items-center gap-1.5 text-xs font-mono p-1.5 sm:px-2.5 sm:py-1.5 rounded-md bg-[#191e27] hover:bg-[#252e3e] border border-[#2a3140] hover:border-[#fbbf24] text-[#fbbf24] transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Gamepad2 className="w-4 h-4 text-[#fbbf24]" />
              <span className="hidden md:inline font-bold text-[11px]">Sound Lab</span>
            </button>
          )}

          {/* AI Guide & Prompt Studio Button */}
          {onOpenAssistant && (
            <button
              onClick={() => {
                soundFX.playClick();
                onOpenAssistant();
              }}
              title="Site Navigator & AI Prompt Studio"
              className="flex items-center gap-1.5 text-xs font-mono p-1.5 sm:px-2.5 sm:py-1.5 rounded-md bg-[#191e27] hover:bg-[#252e3e] border border-[#2a3140] hover:border-[#c084fc] text-[#c084fc] transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-[#c084fc] animate-pulse" />
              <span className="hidden lg:inline font-bold text-[11px]">AI Studio Guide</span>
            </button>
          )}

          {/* Pair Physical Robot Button */}
          {onOpenPairRobot && (
            <button
              onClick={() => {
                soundFX.playClick();
                onOpenPairRobot();
              }}
              title="Pair Physical Robot via USB-C or WiFi"
              className={`flex items-center gap-1.5 text-xs font-mono p-1.5 sm:px-2.5 sm:py-1.5 rounded-md border transition-all cursor-pointer shadow-sm active:scale-95 ${
                syncState.status === "connected"
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25"
                  : "bg-[#191e27] hover:bg-[#252e3e] border-[#2a3140] hover:border-[#5eead4] text-[#5eead4]"
              }`}
            >
              {syncState.status === "connected" ? (
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              ) : (
                <Usb className="w-3.5 h-3.5 text-[#5eead4]" />
              )}
              <span className="hidden sm:inline font-bold text-[11px]">
                {syncState.status === "connected" ? "Paired" : "Pair Robot"}
              </span>
            </button>
          )}

          {/* Launch Control Panel */}
          <button
            id="nav-control-panel-btn"
            onClick={handleOpenControl}
            className="relative flex items-center gap-1.5 font-mono text-xs px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-[#5eead4] to-[#2dd4bf] hover:from-[#5eead4]/90 hover:to-[#2dd4bf]/90 text-[#10131a] font-bold rounded-md transition-all cursor-pointer shadow-md shadow-[#5eead4]/20 active:scale-95 group overflow-hidden shrink-0"
          >
            <SlidersVertical className="w-3.5 h-3.5 transition-transform group-hover:rotate-90 relative z-10" />
            <span className="relative z-10 hidden xs:inline">Launch Controls</span>
            <span className="relative z-10 xs:hidden">Control</span>
            {isUnlocked && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#10131a] relative z-10" title="Admin Unlocked" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Quick-Jump Horizontal Scroll Anchor Strip */}
      <div className="md:hidden flex items-center gap-2 px-3 py-1.5 border-t border-[#2a3140]/60 bg-[#0d1017]/90 overflow-x-auto scrollbar-none text-[11px] font-mono">
        {onOpenPairRobot && (
          <button
            onClick={() => {
              soundFX.playClick();
              onOpenPairRobot();
            }}
            className="px-2.5 py-1 rounded-full bg-[#191e27] border border-[#5eead4]/50 text-[#5eead4] shrink-0 active:scale-95 flex items-center gap-1 font-bold"
          >
            <Usb className="w-3 h-3 text-[#5eead4]" />
            <span>{syncState.status === "connected" ? "Paired" : "Pair Robot"}</span>
          </button>
        )}
        <a
          href="#model3d"
          onClick={() => soundFX.playClick()}
          className="px-2.5 py-1 rounded-full bg-[#191e27] border border-[#2a3140] text-[#5eead4] shrink-0 active:scale-95 flex items-center gap-1"
        >
          <Box className="w-3 h-3" />
          <span>3D CAD</span>
        </a>
        <a
          href="#modes"
          onClick={() => soundFX.playClick()}
          className="px-2.5 py-1 rounded-full bg-[#191e27] border border-[#2a3140] text-[#f2a65a] shrink-0 active:scale-95"
        >
          Personalities
        </a>
        <a
          href="#circuits"
          onClick={() => soundFX.playClick()}
          className="px-2.5 py-1 rounded-full bg-[#191e27] border border-[#2a3140] text-[#38bdf8] shrink-0 active:scale-95"
        >
          Wiring
        </a>
        <a
          href="#calculator"
          onClick={() => soundFX.playClick()}
          className="px-2.5 py-1 rounded-full bg-[#191e27] border border-[#2a3140] text-emerald-400 shrink-0 active:scale-95"
        >
          Cost
        </a>
        <a
          href="#faq"
          onClick={() => soundFX.playClick()}
          className="px-2.5 py-1 rounded-full bg-[#191e27] border border-[#2a3140] text-[#8b93a7] shrink-0 active:scale-95"
        >
          FAQ
        </a>
      </div>
    </nav>
  );
};
