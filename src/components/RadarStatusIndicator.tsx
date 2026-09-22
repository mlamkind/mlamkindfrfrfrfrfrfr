import React from "react";
import { Radio } from "lucide-react";

interface RadarStatusIndicatorProps {
  isActive: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  connectionType?: string;
  showLabel?: boolean;
  className?: string;
  txCount?: number;
  rxCount?: number;
}

export const RadarStatusIndicator: React.FC<RadarStatusIndicatorProps> = ({
  isActive,
  size = "sm",
  connectionType = "none",
  showLabel = false,
  className = "",
  txCount,
  rxCount,
}) => {
  // Dimensions
  const sizeMap = {
    xs: "w-3.5 h-3.5",
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-14 h-14",
  };

  const ringClass = size === "lg" ? "border-[0.5px]" : "border-[0.5px]";

  return (
    <div id="radar-hardware-indicator" className={`inline-flex items-center gap-2 ${className}`}>
      {/* The Radar CRT Display Disc */}
      <div
        className={`relative ${sizeMap[size]} rounded-full overflow-hidden shrink-0 border transition-all duration-500 ${
          isActive
            ? "border-[#5eead4]/70 bg-[#071317] radar-scope-glow shadow-[0_0_12px_rgba(94,234,212,0.35)]"
            : "border-[#2a3848] bg-[#0c1017] opacity-75"
        }`}
        title={
          isActive
            ? `ESP32 Radar Active (${connectionType.toUpperCase()}) — Live Serial Communication`
            : "ESP32 Standby — Connect via USB-C or WiFi"
        }
      >
        {/* Concentric Range Rings */}
        <div
          className={`absolute inset-[15%] rounded-full border border-dashed transition-colors ${
            isActive ? "border-[#5eead4]/35" : "border-[#2a3848]/50"
          } ${ringClass}`}
        />
        <div
          className={`absolute inset-[40%] rounded-full border transition-colors ${
            isActive ? "border-[#5eead4]/50" : "border-[#2a3848]/60"
          } ${ringClass}`}
        />

        {/* Crosshairs */}
        <div
          className={`absolute top-0 bottom-0 left-1/2 -translate-x-[0.5px] w-[1px] transition-colors ${
            isActive ? "bg-[#5eead4]/25" : "bg-[#2a3848]/40"
          }`}
        />
        <div
          className={`absolute left-0 right-0 top-1/2 -translate-y-[0.5px] h-[1px] transition-colors ${
            isActive ? "bg-[#5eead4]/25" : "bg-[#2a3848]/40"
          }`}
        />

        {/* Rotating Radar Sweep Cone */}
        {isActive ? (
          <div
            className="absolute -inset-full rounded-full radar-sweep-fast pointer-events-none"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(94, 234, 212, 0.08) 310deg, rgba(94, 234, 212, 0.45) 356deg, rgba(255, 255, 255, 0.9) 360deg)",
            }}
          />
        ) : (
          /* Idle subtle sweep */
          <div
            className="absolute -inset-full rounded-full radar-sweep-active pointer-events-none opacity-30"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, transparent 310deg, rgba(94, 234, 212, 0.15) 360deg)",
            }}
          />
        )}

        {/* Pulse Echo Rings when actively communicating */}
        {isActive && (
          <div className="absolute inset-0 rounded-full border border-[#5eead4] radar-ring-pulse pointer-events-none" />
        )}

        {/* Target ESP32 Blip */}
        {isActive && (
          <div
            className="absolute top-[32%] right-[28%] w-1.5 h-1.5 rounded-full bg-[#5eead4] radar-blip-active shadow-[0_0_6px_#5eead4]"
            title="Target Node: ESP32-WROOM-32"
          />
        )}

        {/* Center Origin Dot */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
            size === "xs" ? "w-0.5 h-0.5" : "w-1 h-1"
          } ${isActive ? "bg-[#5eead4] shadow-[0_0_4px_#5eead4]" : "bg-[#4a5568]"}`}
        />
      </div>

      {/* Optional Side Label and Telemetry Badge */}
      {showLabel && (
        <div className="flex flex-col text-left font-mono leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] tracking-wider uppercase font-semibold ${
                isActive ? "text-[#5eead4]" : "text-[#718096]"
              }`}
            >
              {isActive ? `ESP32 RADAR [${connectionType.toUpperCase()}]` : "HARDWARE STANDBY"}
            </span>
            {isActive && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>
          {(txCount !== undefined || rxCount !== undefined) && (
            <span className="text-[9px] text-[#8b93a7] mt-0.5">
              TX: {txCount ?? 0} | RX: {rxCount ?? 0}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
