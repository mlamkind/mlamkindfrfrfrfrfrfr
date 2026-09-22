import React, { useEffect, useState } from "react";
import { EmotionType, ServoPose } from "../types";

interface HeroRobotArtProps {
  expression?: EmotionType;
  pose?: ServoPose;
  isTalking?: boolean;
  interactive?: boolean;
  onArmChange?: (pose: ServoPose) => void;
}

export const HeroRobotArt: React.FC<HeroRobotArtProps> = ({
  expression = "happy",
  pose = { leftArm: 15, rightArm: 45 },
  isTalking = false,
  interactive = false,
  onArmChange,
}) => {
  const [blink, setBlink] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);

  // Periodic Blink
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 160);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Talking mouth wobble
  useEffect(() => {
    if (!isTalking) {
      setMouthOpen(false);
      return;
    }
    const interval = setInterval(() => {
      setMouthOpen((prev) => !prev);
    }, 180);
    return () => clearInterval(interval);
  }, [isTalking]);

  // Render eye graphics based on expression
  const renderEyes = () => {
    if (blink || expression === "sleeping") {
      return (
        <>
          <line x1="106" y1="65" x2="118" y2="65" stroke="#5eead4" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="142" y1="65" x2="154" y2="65" stroke="#5eead4" strokeWidth="2.5" strokeLinecap="round" />
        </>
      );
    }

    switch (expression) {
      case "roasting":
      case "sassy":
        return (
          <>
            <circle cx="112" cy="65" r="5" fill="#5eead4" opacity="0.9" />
            <path d="M106 63 Q112 60 118 63" stroke="#0b0d12" strokeWidth="2.5" fill="none" />
            <circle cx="148" cy="65" r="5" fill="#5eead4" opacity="0.9" />
            <path d="M142 61 Q148 58 154 61" stroke="#0b0d12" strokeWidth="2.5" fill="none" />
          </>
        );
      case "surprised":
        return (
          <>
            <circle cx="112" cy="64" r="7" fill="#5eead4" className="eye-glow" />
            <circle cx="148" cy="64" r="7" fill="#5eead4" className="eye-glow" />
          </>
        );
      case "thinking":
        return (
          <>
            <circle cx="112" cy="62" r="5" fill="#5eead4" />
            <circle cx="148" cy="67" r="5" fill="#5eead4" />
          </>
        );
      case "alert":
        return (
          <>
            <circle cx="112" cy="65" r="6" fill="#f2a65a" />
            <circle cx="148" cy="65" r="6" fill="#f2a65a" />
          </>
        );
      case "ninja":
        return (
          <>
            {/* Slanted fierce ninja brows */}
            <line x1="100" y1="55" x2="120" y2="59" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="160" y1="55" x2="140" y2="59" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
            {/* Piercing determined ninja eyes */}
            <circle cx="112" cy="63" r="5" fill="#38bdf8" className="eye-glow" />
            <circle cx="112" cy="63" r="2" fill="#020617" />
            <circle cx="148" cy="63" r="5" fill="#38bdf8" className="eye-glow" />
            <circle cx="148" cy="63" r="2" fill="#020617" />
            {/* Gaze glints */}
            <circle cx="110.5" cy="61.5" r="1.2" fill="#ffffff" />
            <circle cx="146.5" cy="61.5" r="1.2" fill="#ffffff" />
          </>
        );
      case "happy":
      default:
        return (
          <>
            <circle cx="112" cy="65" r="5.5" fill="#5eead4" className="eye-glow" />
            <circle cx="148" cy="65" r="5.5" fill="#5eead4" className="eye-glow" />
          </>
        );
    }
  };

  // Render mouth graphics based on expression
  const renderMouth = () => {
    if (isTalking && mouthOpen) {
      return <ellipse cx="130" cy="80" rx="9" ry="5" fill="#5eead4" opacity="0.85" />;
    }

    switch (expression) {
      case "happy":
        return <path d="M112 78 Q130 87 148 78" stroke="#5eead4" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.85" />;
      case "roasting":
      case "sassy":
        return <path d="M114 82 Q130 80 146 75" stroke="#5eead4" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.85" />;
      case "thinking":
        return <line x1="120" y1="80" x2="140" y2="80" stroke="#5eead4" strokeWidth="2" strokeLinecap="round" opacity="0.75" />;
      case "surprised":
        return <circle cx="130" cy="80" r="4.5" fill="none" stroke="#5eead4" strokeWidth="2" opacity="0.85" />;
      case "sleeping":
        return <path d="M122 80 Q130 82 138 80" stroke="#5eead4" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.6" />;
      case "ninja":
        return (
          <g>
            {/* Shinobi face mask covering lower mouth and chin */}
            <path
              d="M96 72 L130 67 L164 72 L164 92 L96 92 Z"
              fill="#080c14"
              stroke="#38bdf8"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Mask seam & breathing pleats */}
            <path d="M106 78 Q130 82 154 78" stroke="rgba(56, 189, 248, 0.4)" strokeWidth="1" fill="none" />
            <line x1="130" y1="68" x2="130" y2="82" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1" />
          </g>
        );
      default:
        return <line x1="118" y1="80" x2="142" y2="80" stroke="#5eead4" strokeWidth="2" strokeLinecap="round" opacity="0.8" />;
    }
  };

  const leftRotation = pose.leftArm;
  const rightRotation = -pose.rightArm;

  return (
    <div className="relative flex flex-col items-center">
      <svg
        viewBox="0 0 260 340"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-[320px] md:max-w-[360px] h-auto drop-shadow-2xl select-none"
        id="zonyx-robot-model"
      >
        <defs>
          <radialGradient id="ipsGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#5eead4" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0b0d12" stopOpacity="1" />
          </radialGradient>
          <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Left Servo Arm */}
        <g
          transform={`rotate(${leftRotation} 54 156)`}
          className="transition-transform duration-300 ease-out"
        >
          <rect x="20" y="150" width="34" height="12" rx="6" fill="#191e27" stroke="#3a4150" strokeWidth="1.5" />
          <circle cx="22" cy="156" r="4" fill="#5eead4" opacity="0.8" />
          <circle cx="54" cy="156" r="9" fill="#191e27" stroke="#3a4150" strokeWidth="1.5" />
          <circle cx="54" cy="156" r="3" fill="#5eead4" />
        </g>

        {/* Right Servo Arm */}
        <g
          transform={`rotate(${rightRotation} 206 156)`}
          className="transition-transform duration-300 ease-out"
        >
          <rect x="206" y="150" width="34" height="12" rx="6" fill="#191e27" stroke="#3a4150" strokeWidth="1.5" />
          <circle cx="238" cy="156" r="4" fill="#5eead4" opacity="0.8" />
          <circle cx="206" cy="156" r="9" fill="#191e27" stroke="#3a4150" strokeWidth="1.5" />
          <circle cx="206" cy="156" r="3" fill="#5eead4" />
        </g>

        {/* Main Body Chassis */}
        <rect x="55" y="105" width="150" height="200" rx="24" fill="#191e27" stroke="#3a4150" strokeWidth="1.5" />

        {/* Feet bases */}
        <rect x="66" y="288" width="36" height="16" rx="5" fill="#141820" stroke="#3a4150" strokeWidth="1.5" />
        <rect x="158" y="288" width="36" height="16" rx="5" fill="#141820" stroke="#3a4150" strokeWidth="1.5" />

        {/* Speaker Grill Holes */}
        <circle cx="120" cy="230" r="2.4" fill="#3a4150" />
        <circle cx="132" cy="230" r="2.4" fill="#3a4150" />
        <circle cx="144" cy="230" r="2.4" fill="#3a4150" />
        <circle cx="120" cy="242" r="2.4" fill="#3a4150" />
        <circle cx="132" cy="242" r="2.4" fill="#3a4150" />
        <circle cx="144" cy="242" r="2.4" fill="#3a4150" />
        <circle cx="126" cy="254" r="2.4" fill="#3a4150" />
        <circle cx="138" cy="254" r="2.4" fill="#3a4150" />

        {/* Microphone Port */}
        <circle cx="132" cy="200" r="3" fill="#0b0d12" stroke="#5eead4" strokeWidth="0.75" />
        <text x="132" y="215" fill="#8b93a7" fontSize="6.5" fontFamily="monospace" textAnchor="middle">
          MIC
        </text>

        {/* Battery LED Bar */}
        <rect x="80" y="272" width="100" height="5" rx="2.5" fill="#10131a" stroke="#2a3140" strokeWidth="1" />
        <rect x="82" y="273.5" width="80" height="2" rx="1" fill="#5eead4" opacity="0.85" />

        {/* Head Neck Joint */}
        <rect x="112" y="98" width="36" height="14" fill="#141820" stroke="#3a4150" strokeWidth="1.5" />

        {/* Head Enclosure */}
        <rect x="72" y="20" width="116" height="86" rx="18" fill="#191e27" stroke="#3a4150" strokeWidth="1.5" />

        {/* 1.8" IPS Color Display Face Screen */}
        <rect x="86" y="36" width="88" height="58" rx="8" fill="url(#ipsGlow)" stroke="#334155" strokeWidth="1.5" />

        {/* Display Status Header */}
        <rect x="86" y="36" width="88" height="12" rx="4" fill="#0f172a" opacity="0.8" />
        <circle cx="94" cy="42" r="2" fill="#34d399" />
        <text x="100" y="45" fill="#cbd5e1" fontSize="6" fontFamily="monospace" fontWeight="bold">
          IPS
        </text>
        <text x="130" y="45" fill="#5eead4" fontSize="6" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
          ESP32
        </text>
        <rect x="154" y="39" width="14" height="6" rx="1.5" fill="none" stroke="#64748b" strokeWidth="0.8" />
        <rect x="155" y="40" width="10" height="4" rx="1" fill="#10b981" />

        {/* Ninja Shinobi Headband & Metallic Emblem Plate */}
        {expression === "ninja" && (
          <g>
            <rect x="86" y="36" width="88" height="15" rx="2" fill="#0c1322" stroke="#1e293b" strokeWidth="1" />
            <rect x="116" y="38" width="28" height="11" rx="2" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="0.8" />
            <text x="130" y="46.5" fill="#090d16" fontSize="7.5" fontFamily="system-ui, sans-serif" fontWeight="bold" textAnchor="middle">
              忍
            </text>
          </g>
        )}

        {/* Cheerful Blushing Pink Cheeks */}
        {(expression === "happy" || expression === "wink" || expression === "sassy") && (
          <>
            <circle cx="100" cy="74" r="6" fill="#f472b6" opacity="0.55" />
            <circle cx="160" cy="74" r="6" fill="#f472b6" opacity="0.55" />
          </>
        )}

        {/* Face Elements */}
        {renderEyes()}
        {renderMouth()}

        {/* Subtle LCD Scanlines */}
        <line x1="88" y1="52" x2="172" y2="52" stroke="#38bdf8" strokeWidth="0.2" opacity="0.15" />
        <line x1="88" y1="64" x2="172" y2="64" stroke="#38bdf8" strokeWidth="0.2" opacity="0.15" />
        <line x1="88" y1="76" x2="172" y2="76" stroke="#38bdf8" strokeWidth="0.2" opacity="0.15" />
        <line x1="88" y1="88" x2="172" y2="88" stroke="#38bdf8" strokeWidth="0.2" opacity="0.15" />

        {/* Status indicator LED */}
        <circle cx="166" cy="28" r="2.5" fill={isTalking ? "#f59e0b" : "#38bdf8"} className="eye-glow" />
      </svg>

      {/* Arm Position Sliders when interactive */}
      {interactive && onArmChange && (
        <div className="mt-3 flex items-center gap-4 text-xs font-mono text-[#8b93a7] bg-[#191e27]/80 px-3 py-1.5 rounded-md border border-[#2a3140]">
          <div className="flex items-center gap-1.5">
            <span>L-Arm:</span>
            <input
              type="range"
              min="-45"
              max="90"
              value={pose.leftArm}
              onChange={(e) => onArmChange({ ...pose, leftArm: parseInt(e.target.value, 10) })}
              className="w-16 accent-[#5eead4] cursor-pointer"
            />
            <span className="text-[#5eead4] w-6">{pose.leftArm}°</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>R-Arm:</span>
            <input
              type="range"
              min="-45"
              max="90"
              value={pose.rightArm}
              onChange={(e) => onArmChange({ ...pose, rightArm: parseInt(e.target.value, 10) })}
              className="w-16 accent-[#5eead4] cursor-pointer"
            />
            <span className="text-[#5eead4] w-6">{pose.rightArm}°</span>
          </div>
        </div>
      )}
    </div>
  );
};
