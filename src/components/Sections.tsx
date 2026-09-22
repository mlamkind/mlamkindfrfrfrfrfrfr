import React, { useState, useRef, useEffect } from "react";
import confetti from "canvas-confetti";
import { soundFX } from "../utils/soundFX";
import { RobotPersonalityMode, EmotionType, ServoPose, RgbThemeId } from "../types";
import { RGB_THEMES } from "../utils/rgbThemes";
import { Robot3DViewer } from "./Robot3DViewer";
import {
  MessageSquare,
  SlidersVertical,
  Cpu,
  Zap,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Send,
  RotateCw,
  Sparkles,
  Copy,
  Check,
  CheckCheck,
  Download,
  FileCode,
  Globe,
  Battery,
  Gauge,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Compass,
  Calculator,
  ArrowRight,
  Box,
  Edit3,
} from "lucide-react";

interface SectionsProps {
  modes: RobotPersonalityMode[];
  activeModeId: string;
  onSelectMode: (id: string) => void;
  onOpenControl: () => void;
  robotName?: string;
  onOpenRename?: () => void;
  rgbTheme?: RgbThemeId;
  onChangeRgbTheme?: (theme: RgbThemeId) => void;
}

export const Sections: React.FC<SectionsProps> = ({
  modes,
  activeModeId,
  onSelectMode,
  onOpenControl,
  robotName = "Zonyx+",
  onOpenRename,
  rgbTheme = "cyan",
  onChangeRgbTheme,
}) => {
  // Hero interactive state
  const [heroPose, setHeroPose] = useState<ServoPose>({ leftArm: 15, rightArm: 45 });
  const [heroEmotion, setHeroEmotion] = useState<EmotionType>("happy");
  const [chatInput, setChatInput] = useState("");
  const [chatResponse, setChatResponse] = useState<string | null>(
    () => `Hello! I'm ${robotName}, your miniature desktop companion. What would you like to build today?`
  );
  const [chatLoading, setChatLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [chatLatency, setChatLatency] = useState<number | null>(185);
  const [copiedText, setCopiedText] = useState(false);
  const [promptCategory, setPromptCategory] = useState<string>("project");
  const [activeCircuitTab, setActiveCircuitTab] = useState<string>("esp32");

  const recognitionRef = useRef<any>(null);

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Calculator State
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [servoType, setServoType] = useState<"plastic" | "metal">("plastic");
  const [batteryType, setBatteryType] = useState<"standard" | "high_capacity">("standard");
  const [printingType, setPrintingType] = useState<"home" | "commercial">("home");
  const [includeMic, setIncludeMic] = useState(true);

  // Form factor toggle
  const [comparisonItem, setComparisonItem] = useState<"p1" | "phone" | "wallet">("p1");

  // Synchronize Konami Code Ninja event with Hero Robot
  useEffect(() => {
    const handleKonamiNinja = (e: Event) => {
      const customEvent = e as CustomEvent<{ emotion?: EmotionType; pose?: ServoPose }>;
      const nextEmotion = customEvent.detail?.emotion || "ninja";
      const nextPose = customEvent.detail?.pose || { leftArm: 75, rightArm: -25 };
      setHeroEmotion(nextEmotion);
      setHeroPose(nextPose);
    };

    window.addEventListener("p1-konami-ninja", handleKonamiNinja);
    return () => window.removeEventListener("p1-konami-ninja", handleKonamiNinja);
  }, []);

  const activeMode = modes.find((m) => m.id === activeModeId) || modes[0];

  // Speech Recognition for Hero Input
  const toggleSpeechRecognition = () => {
    soundFX.playClick();
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please type your question.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        soundFX.playBoop();
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setChatInput(transcript);
        setIsListening(false);
        handleHeroChat(undefined, transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Hero Quick Chat handler
  const handleHeroChat = async (e?: React.FormEvent, overrideMsg?: string) => {
    if (e) e.preventDefault();
    const query = overrideMsg || chatInput;
    if (!query.trim() || chatLoading) return;

    soundFX.playClick();
    soundFX.playBeep(720, 0.04);
    setChatLoading(true);
    setChatResponse(null);
    setHeroEmotion("thinking");

    try {
      const res = await fetch("/api/zonyx/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          modeId: activeModeId,
          robotName,
        }),
      });

      let data: any = null;
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim()) {
          try {
            data = JSON.parse(text);
          } catch {
            data = { reply: text };
          }
        }
      }

      if (!data || !data.reply) {
        data = {
          reply: `Hello! I'm ${robotName}, ready to help you build or explore.`,
          emotion: "happy",
          servoPose: { leftArm: 20, rightArm: 45 },
          latencyMs: 40,
        };
      }

      setChatResponse(data.reply);

      const em = data.emotion || data.expression;
      if (em) {
        setHeroEmotion(em);
        soundFX.playRobotChirp(em);
      }

      const po = data.servoPose || data.pose;
      if (po) {
        setHeroPose(po);
        soundFX.playServoMove();
      }

      if (typeof data.latencyMs === "number") {
        setChatLatency(data.latencyMs);
      }

      // Read aloud if enabled
      if ("speechSynthesis" in window && speechEnabled && soundFX.enabled) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(data.reply);
        utterance.lang = "en-US";
        utterance.pitch = activeMode?.voicePitch || 1.1;
        utterance.rate = activeMode?.voiceSpeed || 1.05;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      setChatResponse(`Hello! I'm ${robotName}, ready to help you build or explore.`);
      setHeroEmotion("happy");
      soundFX.playRobotChirp("happy");
    } finally {
      setChatLoading(false);
      if (!overrideMsg) setChatInput("");
    }
  };

  const copyResponse = () => {
    if (!chatResponse) return;
    soundFX.playBoop();
    navigator.clipboard.writeText(chatResponse);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleModeSwitch = (m: RobotPersonalityMode) => {
    soundFX.playClick();
    soundFX.playRobotChirp(m.defaultExpression);
    onSelectMode(m.id);
    setHeroEmotion(m.defaultExpression);
    setHeroPose(m.defaultPose);
    try {
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.75 },
        colors: ["#5eead4", "#f2a65a", "#c084fc"],
      });
    } catch {
      // Confetti fallback
    }
  };

  // Calculator price computation
  const calculateTotalCost = () => {
    let total = 0;
    // Core Components:
    total += 320; // ESP32-WROOM Board
    total += 310; // 1.8" IPS Color Display (ST7735/ST7789 SPI)
    total += 290; // MAX98357A I2S DAC Amp + 3W Speaker
    if (includeMic) total += 190; // INMP441 I2S Mic

    // Variable choices:
    total += servoType === "plastic" ? 240 : 480; // SG90 vs MG90S
    total += batteryType === "standard" ? 330 : 540; // 2500mAh vs 3500mAh + TP4056
    total += printingType === "home" ? 0 : 40; // Recycled Cardboard (Free ₹0) vs Kraft Mountboard (₹40)

    if (currency === "USD") {
      return (total / 83.5).toFixed(1);
    }
    return total.toLocaleString();
  };

  const faqItems = [
    {
      q: "How can I interact with the 3D model?",
      a: 'You can click and drag anywhere on the 3D robot stage to orbit 360 degrees, scroll with your mouse wheel or trackpad to zoom in on components, and click the camera preset buttons (Front, 11.8mm Profile, Back, Iso). You can also click "Explode 3D Parts" to examine the internal ESP32 chip, battery, and 1.8" IPS screen separation!',
    },
    {
      q: "Is it always listening in my pocket?",
      a: "No — Zonyx+ only activates audio recording when you press its physical tactile button or when triggered via the local control panel, ensuring absolute privacy and preserving battery life.",
    },
    {
      q: "How long does the 18650 battery last?",
      a: "With a standard 2500mAh 18650 Li-ion cell, Zonyx+ runs continuously for 3.5 to 4 hours of active conversation with servo motion, or several days in ultra-low power ESP32 deep sleep. It recharges via standard USB-C in 90 minutes.",
    },
    {
      q: "Can I change its personality or write my own?",
      a: "Yes! Open the Control Panel to switch between Smart, Fun, Roasting, and Companion modes, or design your own custom personality with a 1000-character prompt, custom voice pitches, and initial servo poses.",
    },
    {
      q: "Do I need a 3D printer to build Zonyx+?",
      a: "No 3D printer required! Zonyx+ is designed around precision cut-and-fold cardboard patterns. All you need is spare cardboard (cereal box, shipping box, or kraft card), a craft knife or scissors, and glue. The 1:1 scale printable templates fold into a rigid, featherlight pocket chassis in under 30 minutes.",
    },
    {
      q: "What if a cardboard arm or joint tears?",
      a: "Cardboard makes repairs effortless and practically free! Simply trace the printable 1:1 net template onto any spare scrap card, cut it out with scissors, and slot it back onto the SG90 servo horn in 2 minutes.",
    },
    {
      q: "How does the hardware communicate with the AI?",
      a: "The ESP32 communicates over your local home WiFi network to our secure backend proxy running Google Gemini, streaming natural responses, facial LCD emotions in vivid color, and servo angles with minimal latency.",
    },
    {
      q: "How do I pair and sync my physical robot with this website when I finish building it?",
      a: "Once your robot hardware is assembled and flashed with Zonyx_Plus_ESP32_Firmware.ino, simply click 'Pair Robot' in the navigation bar or Control Panel. You can pair instantly via USB-C Web Serial (1-click direct browser pairing) or over WiFi WebSocket. Once paired, any slider adjustments, AI chats, emotions, or diagnostics in this web dashboard automatically stream in real-time to your physical robot's SG90 servos and 1.8\" IPS screen face!",
    },
  ];

  return (
    <div className="max-w-[1080px] mx-auto px-4 sm:px-6 space-y-24 py-8">
      {/* 01. Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-12 pt-2 pb-8">
        <div className="lg:col-span-6 space-y-6">
          {/* Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#141820] border border-[#2a3140] rounded-full text-xs font-mono text-[#f2a65a]">
              <span className="w-2 h-2 rounded-full bg-[#f2a65a] animate-pulse" />
              <span>READY TO BUILD • {robotName.toUpperCase()} ONLINE</span>
            </div>
            {onOpenRename && (
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  onOpenRename();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#141820] hover:bg-[#1f2633] border border-[#2a3140] hover:border-[#5eead4] rounded-full text-xs font-mono text-[#8b93a7] hover:text-[#5eead4] transition-all cursor-pointer active:scale-95"
                title={`Rename robot (currently "${robotName}")`}
              >
                <Edit3 className="w-3 h-3 text-[#5eead4]" />
                <span>Rename Robot</span>
              </button>
            )}
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#eef1f6] leading-[1.08]">
            Meet Zonyx+: The $20 Open-Source AI Pocket Robot
          </h1>

          <p className="text-base sm:text-lg text-[#8b93a7] leading-relaxed">
            ESP32-powered desk companion with 1.8" color IPS display, dual robotic arms, expressive emotions, WiFi web control, and Gemini AI voice intelligence.
          </p>

          {/* Quick Specs Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-[#2a3140]/80 font-mono">
            <div className="bg-[#141820]/60 p-2.5 rounded border border-[#2a3140]/60">
              <div className="text-lg sm:text-xl font-bold text-[#5eead4]">
                {currency === "INR" ? "₹1,650" : "$20"}
              </div>
              <div className="text-[10px] text-[#8b93a7] uppercase tracking-wider mt-0.5">HARDWARE BOM</div>
            </div>
            <div className="bg-[#141820]/60 p-2.5 rounded border border-[#2a3140]/60">
              <div className="text-lg sm:text-xl font-bold text-[#f2a65a]">11.8mm</div>
              <div className="text-[10px] text-[#8b93a7] uppercase tracking-wider mt-0.5">ULTRA-SLIM DESK PROFILE</div>
            </div>
            <div className="bg-[#141820]/60 p-2.5 rounded border border-[#2a3140]/60">
              <div className="text-lg sm:text-xl font-bold text-[#c084fc]">4-in-1</div>
              <div className="text-[10px] text-[#8b93a7] uppercase tracking-wider mt-0.5">PROMPT PERSONALITIES</div>
            </div>
            <div className="bg-[#141820]/60 p-2.5 rounded border border-[#2a3140]/60">
              <div className="text-lg sm:text-xl font-bold text-emerald-400">Dual-Servo</div>
              <div className="text-[10px] text-[#8b93a7] uppercase tracking-wider mt-0.5">EXPRESSIVE ARMS</div>
            </div>
          </div>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                soundFX.playClick();
                onOpenControl();
              }}
              className="px-6 py-3.5 bg-gradient-to-r from-[#5eead4] to-[#2dd4bf] hover:from-[#5eead4]/90 hover:to-[#2dd4bf]/90 text-[#10131a] font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2.5 rounded-lg shadow-lg shadow-[#5eead4]/20 active:scale-95 group"
            >
              <SlidersVertical className="w-4 h-4 transition-transform group-hover:rotate-45" />
              <span>Launch Control Panel</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-1 transition-transform" />
            </button>

            <a
              href="#model3d"
              onClick={() => soundFX.playClick()}
              className="px-5 py-3.5 bg-[#141820] hover:bg-[#1f2633] border border-[#2a3140] hover:border-[#5eead4] text-[#eef1f6] font-mono text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <Box className="w-4 h-4 text-[#5eead4]" />
              <span>3D CAD Model</span>
            </a>
          </div>

          {/* Download Artifacts Bar */}
          <div className="space-y-2 pt-1">
            <div className="text-[11px] font-mono text-[#8b93a7] uppercase tracking-wider">
              DOWNLOAD COMPLETE PROJECT FILES &amp; FIRMWARE
            </div>

            {/* Standalone HTML File Download */}
            <div className="flex items-center justify-between p-3.5 bg-[#141820] hover:bg-[#191e27] border border-[#2a3140] hover:border-[#ec4899]/60 rounded-xl transition-all shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#ec4899]/15 border border-[#ec4899]/30 flex items-center justify-center text-[#ec4899]">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#eef1f6] font-mono">Single-File HTML Showcase &amp; Controller</div>
                  <div className="text-xs text-[#8b93a7] font-mono">HTML • Instant browser drag-and-drop launcher</div>
                </div>
              </div>
              <a
                href="/api/download/html"
                download="Pocket_robot_showcase_latest.html"
                onClick={() => soundFX.playBoop()}
                className="px-4 py-2 bg-[#1f2633] hover:bg-[#2a3447] text-[#eef1f6] hover:text-[#5eead4] font-mono text-xs font-bold rounded-lg border border-[#2a3140] hover:border-[#5eead4] transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Download HTML
              </a>
            </div>

            {/* Arduino INO Firmware Download */}
            <div className="flex items-center justify-between p-3.5 bg-[#141820] hover:bg-[#191e27] border border-[#2a3140] hover:border-[#38bdf8]/60 rounded-xl transition-all shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#38bdf8]/15 border border-[#38bdf8]/30 flex items-center justify-center text-[#38bdf8]">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#eef1f6] font-mono">Arduino ESP32 Web Controller Firmware</div>
                  <div className="text-xs text-[#8b93a7] font-mono">INO Source • WiFi AP + SPI ST7789 display driver</div>
                </div>
              </div>
              <a
                href="/api/download/ino"
                download="Pocket_robot_control_web_v4.ino"
                onClick={() => soundFX.playBoop()}
                className="px-4 py-2 bg-[#1f2633] hover:bg-[#2a3447] text-[#eef1f6] hover:text-[#38bdf8] font-mono text-xs font-bold rounded-lg border border-[#2a3140] hover:border-[#38bdf8] transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Download INO
              </a>
            </div>

            {/* Complete GitHub Project ZIP */}
            <div className="flex items-center justify-between p-3.5 bg-[#141820] hover:bg-[#191e27] border border-[#5eead4]/40 hover:border-[#5eead4] rounded-xl transition-all shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#5eead4]/15 border border-[#5eead4]/30 flex items-center justify-center text-[#5eead4]">
                  <Download className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#eef1f6] font-mono">Complete Project Source Repository</div>
                  <div className="text-xs text-[#8b93a7] font-mono">ZIP • Cardboard Net Templates, Schematics, Firmware &amp; Docs</div>
                </div>
              </div>
              <a
                href="/api/download/source-zip"
                download="zonyx-plus-pocket-robot-latest.zip"
                onClick={() => soundFX.playBoop()}
                className="px-4 py-2 bg-[#5eead4] hover:bg-[#5eead4]/90 text-[#10131a] font-mono text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm shadow-[#5eead4]/20 active:scale-95"
              >
                Download ZIP
              </a>
            </div>

            {/* Offline App ZIP Download */}
            <div className="flex items-center justify-between p-3.5 bg-[#141820] hover:bg-[#191e27] border border-emerald-500/40 hover:border-emerald-400 rounded-xl transition-all shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#eef1f6] font-mono">Offline Run App (Double-Click Ready)</div>
                  <div className="text-xs text-[#8b93a7] font-mono">ZIP • Unzip &amp; double-click index.html (Works 100% offline)</div>
                </div>
              </div>
              <a
                href="/api/download/offline-app"
                download="zonyx-plus-robot-run-offline.zip"
                onClick={() => soundFX.playBoop()}
                className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-[#10131a] font-mono text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm shadow-emerald-400/20 active:scale-95"
              >
                Download Offline App
              </a>
            </div>
          </div>

          {/* Interactive AI Chat & Ask Widget */}
          <div className="pt-2">
            <div className="p-4 bg-[#141820] border border-[#2a3140] rounded-xl shadow-xl space-y-3.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#8b93a7] flex items-center gap-1.5 font-bold">
                  <MessageSquare className="w-4 h-4 text-[#5eead4]" />
                  <span className="text-[#eef1f6]">Ask {robotName} Anything:</span>
                  {chatLatency !== null && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0d1017] border border-[#2a3140] text-emerald-400">
                      ⚡ {chatLatency}ms
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playBoop();
                      setSpeechEnabled(!speechEnabled);
                    }}
                    className={`p-1.5 rounded text-[11px] font-mono border transition-all cursor-pointer flex items-center gap-1 ${
                      speechEnabled
                        ? "bg-[#5eead4]/15 border-[#5eead4] text-[#5eead4]"
                        : "bg-[#191e27] border-[#2a3140] text-[#8b93a7]"
                    }`}
                    title={speechEnabled ? "Voice Readout: On" : "Voice Readout: Muted"}
                  >
                    {speechEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{speechEnabled ? "Voice On" : "Voice Muted"}</span>
                  </button>
                  <span className="text-[11px] text-[#5eead4] font-medium bg-[#0d1017] px-2 py-1 rounded border border-[#2a3140]">
                    Mood: <span className="font-bold underline">{activeMode.name}</span>
                  </span>
                </div>
              </div>

              <form onSubmit={handleHeroChat} className="flex gap-2">
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`px-3 py-2 rounded-lg border font-mono text-xs transition-all cursor-pointer flex items-center justify-center ${
                    isListening
                      ? "bg-red-500 border-red-400 text-white animate-pulse shadow-lg shadow-red-500/30"
                      : "bg-[#191e27] hover:bg-[#252e3e] border-[#2a3140] hover:border-[#5eead4] text-[#8b93a7] hover:text-[#5eead4]"
                  }`}
                  title={isListening ? "Listening... Speak now" : `Ask ${robotName} a question...`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    isListening
                      ? "Listening... Speak now"
                      : `Ask ${robotName} about hardware, pinouts, code...`
                  }
                  className="flex-1 bg-[#0d1017] border border-[#2a3140] focus:border-[#5eead4] rounded-lg px-3.5 py-2 text-xs font-mono text-[#eef1f6] focus:outline-none placeholder-[#8b93a7]/60"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="px-4 py-2 bg-[#5eead4] hover:bg-[#5eead4]/90 disabled:opacity-40 text-[#10131a] font-mono text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-md shadow-[#5eead4]/10"
                >
                  {chatLoading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Ask AI</span>
                </button>
              </form>

              {/* Quick Prompt Categorized Pills */}
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-[#2a3140]/60 pb-2">
                  <span className="text-[10px] font-mono text-[#8b93a7] uppercase tracking-wider">
                    Quick Prompts:
                  </span>
                  <div className="flex gap-1 text-[10px] font-mono">
                    {[
                      { id: "project", label: "🎓 Project" },
                      { id: "gestures", label: "⚡ Gestures" },
                      { id: "security", label: "🛡️ Safety" },
                      { id: "fun", label: "🔥 Roast" },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          soundFX.playBoop();
                          setPromptCategory(c.id);
                        }}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                          promptCategory === c.id
                            ? "bg-[#5eead4] text-[#10131a] font-bold"
                            : "text-[#8b93a7] hover:text-[#eef1f6] bg-[#191e27]"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                  {(promptCategory === "project"
                    ? [
                        { label: "BOM Cost Breakdown", q: "What is the complete bill of materials breakdown for the Zonyx+ cardboard robot?" },
                        { label: "Wiring Schematic", q: "Show me the pinout wiring connections between ESP32 and ST7789 display." },
                        { label: "Assembly Steps", q: "What are the step-by-step instructions to cut, score, fold, and assemble the cardboard chassis?" },
                      ]
                    : promptCategory === "gestures"
                    ? [
                        { label: "Wave Arms", q: "Wave your arms hello and introduce yourself!" },
                        { label: "High Five", q: "Give me a double high-five!" },
                        { label: "Victory Dance", q: "Celebrate with a victory dance!" },
                      ]
                    : promptCategory === "security"
                    ? [
                        { label: "Battery Life", q: "How long does the 18650 Li-ion battery last on a single charge?" },
                        { label: "TP4056 Safety", q: "Does the TP4056 charging circuit have over-discharge protection?" },
                      ]
                    : [
                        { label: "Roast My Code", q: "Give me a playful, sassy roast about my messy programming desk." },
                        { label: "Tell a Joke", q: "Tell me a funny hardware engineering joke." },
                      ]
                  ).map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleHeroChat(undefined, item.q)}
                      className="px-2.5 py-1 bg-[#191e27] hover:bg-[#252e3e] active:scale-95 text-[#5eead4] border border-[#2a3140] hover:border-[#5eead4] rounded-md transition-all cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bot Response Bubble */}
              {chatResponse && (
                <div className="p-3.5 bg-[#0d1017] border-l-2 border-[#5eead4] rounded-r-lg text-xs font-mono text-[#eef1f6] leading-relaxed space-y-2 shadow-inner">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Sparkles className={`w-3.5 h-3.5 text-[#5eead4] shrink-0 mt-0.5 ${isSpeaking ? "animate-bounce" : ""}`} />
                      <div>
                        <span className="text-[#5eead4] font-bold">{robotName} // </span>
                        <span>{chatResponse}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#2a3140]/60 text-[10px] text-[#8b93a7]">
                    <div className="flex items-center gap-2">
                      <span>
                        Emotion: <strong className="text-[#5eead4] capitalize">{heroEmotion}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Arm Servos: <strong className="text-[#f2a65a]">{heroPose.leftArm}° / {heroPose.rightArm}°</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={copyResponse}
                        className="hover:text-[#5eead4] transition-colors cursor-pointer flex items-center gap-1 active:scale-90"
                        title="Copy answer text"
                      >
                        {copiedText ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedText ? "Copied" : "Copy"}</span>
                      </button>

                      {"speechSynthesis" in window && (
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playBoop();
                            window.speechSynthesis.cancel();
                            const utterance = new SpeechSynthesisUtterance(chatResponse);
                            utterance.pitch = activeMode?.voicePitch || 1.1;
                            utterance.rate = activeMode?.voiceSpeed || 1.05;
                            utterance.onstart = () => setIsSpeaking(true);
                            utterance.onend = () => setIsSpeaking(false);
                            window.speechSynthesis.speak(utterance);
                          }}
                          className="hover:text-[#5eead4] transition-colors cursor-pointer flex items-center gap-1 active:scale-90"
                          title="Replay spoken voice"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Hear Voice</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3D Robot CAD Viewer Hero Presentation */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <div className="w-full relative">
            <Robot3DViewer
              pose={heroPose}
              expression={heroEmotion}
              onArmChange={setHeroPose}
              onExpressionChange={setHeroEmotion}
              isTalking={isSpeaking}
              robotName={robotName}
              className="w-full shadow-2xl"
              allowPresets={true}
              rgbTheme={rgbTheme}
              onChangeRgbTheme={onChangeRgbTheme}
            />
            <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-[#8b93a7] px-2">
              <span className="flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-[#5eead4]" />
                <span>360° Drag to Rotate • Pinch/Scroll to Zoom</span>
              </span>
              <button
                onClick={() => {
                  soundFX.playClick();
                  setHeroEmotion(heroEmotion === "happy" ? "thinking" : heroEmotion === "thinking" ? "roasting" : "happy");
                }}
                className="text-[#5eead4] hover:underline cursor-pointer"
              >
                Face Expression: {heroEmotion}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 02. Interactive 3D CAD Inspection Section */}
      <section id="model3d" className="pt-16 border-t border-[#2a3140]">
        <div className="font-mono text-xs text-[#f2a65a] mb-2 uppercase tracking-wider">
          // 02 — 3D CAD &amp; ANATOMY
        </div>
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#eef1f6]">
              Interactive 3D Hardware Inspection
            </h2>
            <p className="text-sm text-[#8b93a7] mt-1 max-w-xl">
              Engineered straight from CAD schematics. Inspect the internal 18650 battery cell, ESP32
              micro-controller, and dual SG90 micro-servo actuation joints.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/download/cardboard-template"
              download="zonyx-plus-cardboard-templates-1to1.svg"
              onClick={() => {
                soundFX.playSuccess();
                confetti({ particleCount: 30, spread: 60 });
              }}
              className="px-4 py-2 bg-[#141820] hover:bg-[#1f2633] border border-[#2a3140] hover:border-[#5eead4] text-[#5eead4] font-mono text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Cardboard 1:1 Net (SVG)</span>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-[#141820] border border-[#2a3140] rounded-xl hover:border-[#5eead4] transition-colors group">
            <div className="w-9 h-9 rounded-lg bg-[#5eead4]/10 border border-[#5eead4]/30 flex items-center justify-center text-[#5eead4] mb-3 group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-[#eef1f6]">1.8" IPS Color Display</h3>
            <p className="text-xs text-[#8b93a7] mt-1 leading-relaxed">
              Vibrant 1.8-inch 65K full-color IPS display with hardware SPI DMA. Shows animated anime eyes, blushing cheeks,
              WiFi &amp; battery status bar, and real-time gaze tracking.
            </p>
          </div>

          <div className="p-4 bg-[#141820] border border-[#2a3140] rounded-xl hover:border-[#f2a65a] transition-colors group">
            <div className="w-9 h-9 rounded-lg bg-[#f2a65a]/10 border border-[#f2a65a]/30 flex items-center justify-center text-[#f2a65a] mb-3 group-hover:scale-105 transition-transform">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-[#eef1f6]">ESP32-WROOM-32</h3>
            <p className="text-xs text-[#8b93a7] mt-1 leading-relaxed">
              Dual-core 240MHz Xtensa LX6 CPU with integrated 802.11 b/g/n WiFi and Bluetooth for ultra-responsive
              low-latency AI streaming.
            </p>
          </div>

          <div className="p-4 bg-[#141820] border border-[#2a3140] rounded-xl hover:border-[#c084fc] transition-colors group">
            <div className="w-9 h-9 rounded-lg bg-[#c084fc]/10 border border-[#c084fc]/30 flex items-center justify-center text-[#c084fc] mb-3 group-hover:scale-105 transition-transform">
              <SlidersVertical className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-[#eef1f6]">Dual SG90 Servos</h3>
            <p className="text-xs text-[#8b93a7] mt-1 leading-relaxed">
              PWM pulse control on GPIO 18 &amp; 19 delivering 1.8 kg-cm torque. Moves arms to wave, point, high-five, and
              express mood.
            </p>
          </div>

          <div className="p-4 bg-[#141820] border border-[#2a3140] rounded-xl hover:border-emerald-400 transition-colors group">
            <div className="w-9 h-9 rounded-lg bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
              <Battery className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-[#eef1f6]">18650 Li-ion Cell</h3>
            <p className="text-xs text-[#8b93a7] mt-1 leading-relaxed">
              2500mAh+ rechargeable battery with TP4056 USB-C protection module, giving 3.5+ hours of continuous
              conversational robotics.
            </p>
          </div>
        </div>
      </section>

      {/* 03. Personality Engine Section */}
      <section id="modes" className="pt-16 border-t border-[#2a3140]">
        <div className="font-mono text-xs text-[#f2a65a] mb-2 uppercase tracking-wider">
          // 03 — PERSONALITY ENGINE
        </div>
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#eef1f6]">One Chassis, Infinite Personalities</h2>
          <p className="text-sm text-[#8b93a7] mt-1 max-w-xl">
            Switch how Zonyx+ speaks, reacts, and poses its arms in real-time. Anyone on your local WiFi can test or write
            custom modes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modes.map((mode) => {
            const isActive = mode.id === activeModeId;
            return (
              <div
                key={mode.id}
                onClick={() => handleModeSwitch(mode)}
                className={`p-5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                  isActive
                    ? "bg-[#141820] border-[#5eead4] shadow-lg shadow-[#5eead4]/10"
                    : "bg-[#141820]/60 border-[#2a3140] hover:border-[#5eead4]/50 hover:bg-[#141820]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="w-3 h-3 rounded-full shadow-sm"
                      style={{ backgroundColor: mode.badgeColor }}
                    />
                    {isActive && (
                      <span className="px-2 py-0.5 bg-[#5eead4]/15 border border-[#5eead4] text-[#5eead4] rounded text-[10px] font-mono font-bold">
                        ACTIVE BRAIN
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-base text-[#eef1f6]">{mode.name}</h3>
                  <p className="text-xs text-[#5eead4] font-mono mt-0.5">{mode.tagline}</p>
                  <p className="text-xs text-[#8b93a7] mt-2 leading-relaxed">{mode.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#2a3140] flex items-center justify-between text-[11px] font-mono text-[#8b93a7]">
                  <span>Pitch: {mode.voicePitch}x</span>
                  <span className="text-[#5eead4] group-hover:underline flex items-center gap-1">
                    <Volume2 className="w-3 h-3" />
                    <span>Test Audio</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 p-4 bg-[#141820] border border-[#2a3140] rounded-xl">
          <div className="text-xs font-mono text-[#8b93a7]">Want a dedicated persona for coding, therapy, or trivia?</div>
          <button
            onClick={() => {
              soundFX.playClick();
              onOpenControl();
            }}
            className="px-4 py-2 bg-[#5eead4]/10 hover:bg-[#5eead4]/20 border border-[#5eead4] text-[#5eead4] font-mono text-xs font-bold rounded-lg transition-all cursor-pointer active:scale-95"
          >
            + Create Custom Mode (1,000 Ch Limit)
          </button>
        </div>
      </section>

      {/* 04. Form Factor Section */}
      <section id="gallery" className="pt-16 border-t border-[#2a3140]">
        <div className="font-mono text-xs text-[#f2a65a] mb-2 uppercase tracking-wider">
          // 04 — FORM FACTOR
        </div>
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#eef1f6]">Engineered for Real Pockets (11.8mm)</h2>
          <p className="text-sm text-[#8b93a7] mt-1 max-w-xl">
            Compare Zonyx+'s ultra-compact profile against standard everyday items.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#141820] border border-[#2a3140] p-6 sm:p-8 rounded-xl">
          <div className="lg:col-span-6 space-y-4">
            <div className="flex gap-2 font-mono text-xs">
              <button
                onClick={() => {
                  soundFX.playClick();
                  setComparisonItem("p1");
                }}
                className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  comparisonItem === "p1"
                    ? "bg-[#5eead4] text-[#10131a] font-bold border-[#5eead4]"
                    : "bg-[#191e27] text-[#8b93a7] border-[#2a3140]"
                }`}
              >
                Zonyx+ Robot (11.8mm)
              </button>
              <button
                onClick={() => {
                  soundFX.playClick();
                  setComparisonItem("phone");
                }}
                className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  comparisonItem === "phone"
                    ? "bg-[#f2a65a] text-[#10131a] font-bold border-[#f2a65a]"
                    : "bg-[#191e27] text-[#8b93a7] border-[#2a3140]"
                }`}
              >
                Smartphone (8.2mm)
              </button>
              <button
                onClick={() => {
                  soundFX.playClick();
                  setComparisonItem("wallet");
                }}
                className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  comparisonItem === "wallet"
                    ? "bg-[#c084fc] text-[#10131a] font-bold border-[#c084fc]"
                    : "bg-[#191e27] text-[#8b93a7] border-[#2a3140]"
                }`}
              >
                Leather Wallet (22mm)
              </button>
            </div>

            <div className="space-y-2 text-sm text-[#8b93a7] leading-relaxed">
              {comparisonItem === "p1" && (
                <p>
                  Zonyx+ measures <strong className="text-[#eef1f6]">48mm wide × 68mm tall × 11.8mm deep</strong>. It slips vertically into an Oxford shirt pocket or standard jeans coin pocket with zero bulge.
                </p>
              )}
              {comparisonItem === "phone" && (
                <p>
                  A smartphone is slightly thinner (8mm), but twice as tall (150mm+) and 3× heavier (190g vs 68g). Zonyx+ feels practically weightless.
                </p>
              )}
              {comparisonItem === "wallet" && (
                <p>
                  A traditional bi-fold wallet bulges up to 22mm. Zonyx+ is nearly half the thickness of a loaded wallet!
                </p>
              )}
            </div>

            <div className="pt-2 flex items-center gap-4 text-xs font-mono text-[#5eead4]">
              <span>Weight: 52g (Ultra-Light)</span>
              <span>•</span>
              <span>Thickness: 11.8mm</span>
              <span>•</span>
              <span>Material: Corrugated Kraft Cardboard</span>
            </div>
          </div>

          <div className="lg:col-span-6 flex items-center justify-center p-6 bg-[#0d1017] rounded-xl border border-[#2a3140]/60 min-h-[220px]">
            <div className="relative w-64 h-48 border-2 border-dashed border-[#2a3140] rounded-b-3xl flex items-center justify-center bg-[#10131a]/80">
              <span className="absolute top-2 text-[10px] font-mono text-[#8b93a7] uppercase tracking-widest">
                Shirt Pocket Contour
              </span>

              {comparisonItem === "p1" && (
                <div className="w-24 h-32 bg-[#1c212b] border-2 border-[#5eead4] rounded-xl flex flex-col items-center justify-between p-2 shadow-xl shadow-[#5eead4]/10">
                  <div className="w-16 h-10 bg-[#06080c] border border-[#5eead4] rounded flex items-center justify-center text-[10px] font-mono text-[#5eead4]">
                    ^ _ ^
                  </div>
                  <div className="text-[9px] font-mono text-[#5eead4] font-bold">Zonyx+ // 11.8mm</div>
                </div>
              )}

              {comparisonItem === "phone" && (
                <div className="w-28 h-44 bg-[#1e293b] border-2 border-[#f2a65a] rounded-xl flex items-center justify-center text-xs font-mono text-[#f2a65a] shadow-xl">
                  Phone (150mm)
                </div>
              )}

              {comparisonItem === "wallet" && (
                <div className="w-36 h-28 bg-[#332211] border-2 border-[#c084fc] rounded-lg flex items-center justify-center text-xs font-mono text-[#c084fc] shadow-xl">
                  Wallet (22mm bulge)
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 04.5 Interactive Schematics & Pinout Inspector */}
      <section id="circuits" className="pt-16 border-t border-[#2a3140]">
        <div className="font-mono text-xs text-[#5eead4] mb-2 uppercase tracking-wider">
          // 04.5 — SCHEMATICS &amp; PINOUTS
        </div>
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#eef1f6]">
              Interactive Hardware Circuit &amp; Pinout Inspector
            </h2>
            <p className="text-sm text-[#8b93a7] mt-1 max-w-xl">
              Inspect the exact GPIO pin mapping, bus protocols, and operating voltages linking the ESP32 to Zonyx+'s servos, sensors, and display.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-[#8b93a7]">
            <span className="w-2 h-2 rounded-full bg-[#5eead4] animate-ping" />
            <span>Click any module below to inspect</span>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-6">
          {[
            { id: "esp32", label: "ESP32 Brain", icon: Cpu, color: "#5eead4" },
            { id: "servos", label: "Dual Servos", icon: SlidersVertical, color: "#f2a65a" },
            { id: "lcd", label: "1.8\" IPS Display", icon: Box, color: "#c084fc" },
            { id: "mic", label: "I2S Mic", icon: Mic, color: "#38bdf8" },
            { id: "amp", label: "DAC Speaker", icon: Volume2, color: "#a78bfa" },
            { id: "power", label: "Power & Li-ion", icon: Battery, color: "#4ade80" },
          ].map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeCircuitTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  soundFX.playBoop();
                  setActiveCircuitTab(tab.id);
                }}
                className={`p-3 rounded-xl border font-mono text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center active:scale-95 ${
                  isTabActive
                    ? "bg-[#141820] border-[#5eead4] shadow-lg shadow-[#5eead4]/10 text-[#eef1f6]"
                    : "bg-[#10131a] hover:bg-[#141820] border-[#2a3140] text-[#8b93a7] hover:text-[#eef1f6]"
                }`}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${tab.color}20`, color: tab.color }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-semibold text-[11px] truncate w-full">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Circuit Detail Box */}
        <div className="bg-[#141820] border border-[#2a3140] rounded-xl p-6 sm:p-8 space-y-6">
          {activeCircuitTab === "esp32" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2a3140] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-bold text-[#eef1f6]">ESP32-WROOM-32 / S3</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#5eead4]/15 border border-[#5eead4]/40 text-[#5eead4]">
                      Central Processor
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[#8b93a7] mt-1">
                    Dual Xtensa 32-bit LX6 cores @ 240MHz • 8MB SPI Flash • 2.4GHz 802.11 b/g/n WiFi + BLE 4.2
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playLaser();
                  }}
                  className="px-3.5 py-1.5 bg-[#0d1017] hover:bg-[#1a202c] border border-[#5eead4]/60 text-[#5eead4] font-mono text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 self-start active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Test Core Clock Chirp</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-7 space-y-3 font-mono text-xs">
                  <div className="text-[#8b93a7] text-sm leading-relaxed">
                    Running custom asynchronous FreeRTOS firmware. <strong className="text-[#eef1f6]">Core 0</strong> is dedicated to managing encrypted HTTP/WebSocket transport with the Gemini AI cloud endpoint, while <strong className="text-[#eef1f6]">Core 1</strong> executes real-time 50Hz PWM servo motor timing and 400kHz I2C SSD1306 frame-buffer updates.
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-[#0d1017] rounded-lg border border-[#2a3140]">
                      <div className="text-[10px] text-[#8b93a7] uppercase">Operating Voltage</div>
                      <div className="text-sm font-bold text-[#eef1f6] mt-0.5">3.3V DC (AMS1117 LDO)</div>
                    </div>
                    <div className="p-3 bg-[#0d1017] rounded-lg border border-[#2a3140]">
                      <div className="text-[10px] text-[#8b93a7] uppercase">WiFi TX Current</div>
                      <div className="text-sm font-bold text-[#5eead4] mt-0.5">180mA – 240mA peak</div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-5 bg-[#0d1017] p-4 rounded-xl border border-[#2a3140] font-mono text-xs space-y-2">
                  <div className="text-[11px] font-bold text-[#5eead4] uppercase tracking-wider mb-2">
                    Active GPIO Connections
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">GPIO 18</span>
                    <span className="text-[#f2a65a]">Left Servo PWM (50Hz)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">GPIO 19</span>
                    <span className="text-[#f2a65a]">Right Servo PWM (50Hz)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">GPIO 23</span>
                    <span className="text-[#c084fc]">LCD SPI MOSI (Data)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">GPIO 18</span>
                    <span className="text-[#c084fc]">LCD SPI SCLK (Clock)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">GPIO 5 &amp; 16</span>
                    <span className="text-[#c084fc]">LCD CS &amp; DC (Chip/Data Select)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">GPIO 32, 33, 25</span>
                    <span className="text-[#38bdf8]">I2S Audio Input</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#8b93a7]">GPIO 26, 27</span>
                    <span className="text-[#a78bfa]">I2S Audio Output</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCircuitTab === "servos" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2a3140] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-bold text-[#eef1f6]">Dual SG90 / MG90S Micro Servos (9g)</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#f2a65a]/15 border border-[#f2a65a]/40 text-[#f2a65a]">
                      Motion Actuation
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[#8b93a7] mt-1">
                    180° rotation range • 1.8 kg·cm stall torque • 0.1s/60° operating speed
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playServoMove();
                    setHeroPose({
                      leftArm: Math.floor(Math.random() * 90) - 20,
                      rightArm: Math.floor(Math.random() * 90) - 20,
                    });
                  }}
                  className="px-3.5 py-1.5 bg-[#0d1017] hover:bg-[#1a202c] border border-[#f2a65a]/60 text-[#f2a65a] font-mono text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 self-start active:scale-95"
                >
                  <SlidersVertical className="w-3.5 h-3.5" />
                  <span>Test Servo Pulse (Random Angle)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-7 space-y-3 font-mono text-xs">
                  <div className="text-[#8b93a7] text-sm leading-relaxed">
                    Arm gestures utilize hardware timer PWM channels configured at <strong className="text-[#eef1f6]">50 Hz (20ms period)</strong>. A pulse width of 0.5ms represents -45° (rest), 1.5ms represents 45° (neutral horizontal), and 2.4ms represents 120° (overhead wave or high-five).
                  </div>
                  <div className="p-3 bg-[#0d1017] rounded-lg border border-[#f2a65a]/30 text-xs text-[#8b93a7] space-y-1">
                    <strong className="text-[#f2a65a]">Hardware Wiring Tip:</strong>
                    <p>
                      Never power servo VCC pins directly from the ESP32's onboard 3.3V LDO. High stall currents (up to 400mA each) will induce voltage dips that trigger brownout resets on the ESP32. Power them from the boosted 5V rail with a 470µF electrolytic decoupling capacitor.
                    </p>
                  </div>
                </div>

                <div className="md:col-span-5 bg-[#0d1017] p-4 rounded-xl border border-[#2a3140] font-mono text-xs space-y-2">
                  <div className="text-[11px] font-bold text-[#f2a65a] uppercase tracking-wider mb-2">
                    Servo Lead Pinout
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">Orange Lead (PWM)</span>
                    <span className="text-[#eef1f6]">GPIO 18 (Left) / 19 (Right)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">Red Lead (Power)</span>
                    <span className="text-red-400">5V DC Power Rail</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">Brown Lead (GND)</span>
                    <span className="text-[#8b93a7]">Common Ground Bus</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#8b93a7]">Resolution</span>
                    <span className="text-[#5eead4]">16-bit LEDC timer</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(activeCircuitTab === "lcd" || activeCircuitTab === "ips") && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2a3140] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-bold text-[#eef1f6]">1.8" IPS Full-Color Display</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#c084fc]/15 border border-[#c084fc]/40 text-[#c084fc]">
                      IPS Facial Screen
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[#8b93a7] mt-1">
                    1.8-inch screen • 65,536 Colors (RGB565) • High-Speed SPI Bus with DMA • 178° IPS Wide Viewing Angle
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playRobotChirp("wink");
                    setHeroEmotion("wink");
                  }}
                  className="px-3.5 py-1.5 bg-[#0d1017] hover:bg-[#1a202c] border border-[#c084fc]/60 text-[#c084fc] font-mono text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 self-start active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Test Wink Expression</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-7 space-y-3 font-mono text-xs">
                  <div className="text-[#8b93a7] text-sm leading-relaxed">
                    Connected over hardware SPI at 40MHz with DMA (Direct Memory Access). The ESP32 renders full-color anime eyes with glossy reflection highlights, cute blushing pink cheeks, an animated status bar with battery and WiFi icons, and real-time gaze tracking following your cursor without CPU stutter.
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-[#0d1017] rounded-lg border border-[#2a3140]">
                      <div className="text-[10px] text-[#8b93a7] uppercase">Color Depth</div>
                      <div className="text-sm font-bold text-pink-400 mt-0.5">65K RGB565 Colors</div>
                    </div>
                    <div className="p-3 bg-[#0d1017] rounded-lg border border-[#2a3140]">
                      <div className="text-[10px] text-[#8b93a7] uppercase">Viewing Angle</div>
                      <div className="text-sm font-bold text-[#c084fc] mt-0.5">178° Full IPS Angle</div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-5 bg-[#0d1017] p-4 rounded-xl border border-[#2a3140] font-mono text-xs space-y-2">
                  <div className="text-[11px] font-bold text-[#c084fc] uppercase tracking-wider mb-2">
                    SPI Header Pinout (1.8" IPS Display)
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">VCC</span>
                    <span className="text-red-400">3.3V Regulated</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">GND</span>
                    <span className="text-[#8b93a7]">System Ground</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">SCL (SPI Clock)</span>
                    <span className="text-[#c084fc]">ESP32 GPIO 18 (40MHz)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">SDA (MOSI Data)</span>
                    <span className="text-[#c084fc]">ESP32 GPIO 23</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">RES (Reset)</span>
                    <span className="text-[#c084fc]">ESP32 GPIO 4</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#8b93a7]">DC (Data/Command)</span>
                    <span className="text-[#c084fc]">ESP32 GPIO 16</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCircuitTab === "mic" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2a3140] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-bold text-[#eef1f6]">INMP441 I2S Digital MEMS Microphone</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#38bdf8]/15 border border-[#38bdf8]/40 text-[#38bdf8]">
                      Acoustic Input
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[#8b93a7] mt-1">
                    24-bit I2S digital audio • 61 dBA SNR • Bottom-ported acoustic MEMS
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className="px-3.5 py-1.5 bg-[#0d1017] hover:bg-[#1a202c] border border-[#38bdf8]/60 text-[#38bdf8] font-mono text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 self-start active:scale-95"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Test Mic Input Recognition</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-7 space-y-3 font-mono text-xs">
                  <div className="text-[#8b93a7] text-sm leading-relaxed">
                    Unlike noisy electret analog microphones requiring op-amp preamps, the INMP441 outputs pure 24-bit digital PCM audio samples directly to the ESP32's DMA (Direct Memory Access) channels. This enables crystal-clear voice transcription even in noisy presentation rooms.
                  </div>
                  <div className="p-3 bg-[#0d1017] rounded-lg border border-[#38bdf8]/30 text-xs text-[#8b93a7] space-y-1">
                    <strong className="text-[#38bdf8]">Acoustic Tuning:</strong>
                    <p>
                      Mounted at the top collar of the cardboard chassis facing upwards. A 1.8mm acoustic punch-hole through the kraft card shell ensures flat 60Hz – 15kHz frequency response without muffling.
                    </p>
                  </div>
                </div>

                <div className="md:col-span-5 bg-[#0d1017] p-4 rounded-xl border border-[#2a3140] font-mono text-xs space-y-2">
                  <div className="text-[11px] font-bold text-[#38bdf8] uppercase tracking-wider mb-2">
                    I2S Input Pinout
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">WS (Word Select)</span>
                    <span className="text-[#38bdf8]">GPIO 32</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">SCK (Clock)</span>
                    <span className="text-[#38bdf8]">GPIO 33</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">SD (Data Out)</span>
                    <span className="text-[#38bdf8]">GPIO 25 (DMA In)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#8b93a7]">L/R (Channel Select)</span>
                    <span className="text-[#8b93a7]">GND (Left Channel)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCircuitTab === "amp" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2a3140] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-bold text-[#eef1f6]">MAX98357A I2S 3.2W Class-D Audio Amplifier</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#a78bfa]/15 border border-[#a78bfa]/40 text-[#a78bfa]">
                      Voice &amp; Audio Out
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[#8b93a7] mt-1">
                    3.2W into 4Ω @ 5V • Class-D 92% efficiency • Integrated DAC decoder
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playDance();
                  }}
                  className="px-3.5 py-1.5 bg-[#0d1017] hover:bg-[#1a202c] border border-[#a78bfa]/60 text-[#a78bfa] font-mono text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 self-start active:scale-95"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Test 8-Bit Robot Melody</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-7 space-y-3 font-mono text-xs">
                  <div className="text-[#8b93a7] text-sm leading-relaxed">
                    Converts digital PCM audio streams into acoustic speaker pressure with 92% power efficiency. Paired with a custom <strong className="text-[#eef1f6]">28mm 4Ω 3-Watt miniature speaker</strong> nested in an internal resonance chamber in Zonyx+'s lower torso.
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-[#0d1017] rounded-lg border border-[#2a3140]">
                      <div className="text-[10px] text-[#8b93a7] uppercase">Efficiency</div>
                      <div className="text-sm font-bold text-emerald-400 mt-0.5">92% Class-D (No heat)</div>
                    </div>
                    <div className="p-3 bg-[#0d1017] rounded-lg border border-[#2a3140]">
                      <div className="text-[10px] text-[#8b93a7] uppercase">Sample Rates</div>
                      <div className="text-sm font-bold text-[#a78bfa] mt-0.5">8kHz – 96kHz PCM</div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-5 bg-[#0d1017] p-4 rounded-xl border border-[#2a3140] font-mono text-xs space-y-2">
                  <div className="text-[11px] font-bold text-[#a78bfa] uppercase tracking-wider mb-2">
                    I2S Amp Pinout
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">BCLK (Bit Clock)</span>
                    <span className="text-[#a78bfa]">GPIO 26</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">LRC (Left/Right Clock)</span>
                    <span className="text-[#a78bfa]">GPIO 27</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">DIN (Data In)</span>
                    <span className="text-[#a78bfa]">GPIO 22</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#8b93a7]">Speaker Terminal</span>
                    <span className="text-[#5eead4]">SPK+ / SPK- (4Ω 3W)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCircuitTab === "power" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2a3140] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-bold text-[#eef1f6]">TP4056 USB-C Charging + 18650 Li-ion 3.7V</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-400/15 border border-emerald-400/40 text-emerald-400">
                      Power Subsystem
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[#8b93a7] mt-1">
                    2500mAh 3.7V nominal • DW01A BMS Protection • USB-C 1A CC/CV charge cycle
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playPowerDown();
                  }}
                  className="px-3.5 py-1.5 bg-[#0d1017] hover:bg-[#1a202c] border border-emerald-400/60 text-emerald-400 font-mono text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 self-start active:scale-95"
                >
                  <Battery className="w-3.5 h-3.5" />
                  <span>Simulate Sleep / Power Down</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-7 space-y-3 font-mono text-xs">
                  <div className="text-[#8b93a7] text-sm leading-relaxed">
                    Designed for 3.5+ hours of untethered operation. The single 18650 cell delivers 3.7V nominal, passing through an integrated <strong className="text-[#eef1f6]">DW01A protection IC</strong> to prevent over-discharge below 2.8V. A miniature MT3608 boost module generates a stable 5V rail for the servo motors, while an AMS1117-3.3 regulator powers the sensitive ESP32 MCU and sensors.
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-[#0d1017] rounded-lg border border-[#2a3140]">
                      <div className="text-[10px] text-[#8b93a7] uppercase">Battery Runtime</div>
                      <div className="text-sm font-bold text-emerald-400 mt-0.5">3.5 – 4.2 Hours Active</div>
                    </div>
                    <div className="p-3 bg-[#0d1017] rounded-lg border border-[#2a3140]">
                      <div className="text-[10px] text-[#8b93a7] uppercase">Recharge Duration</div>
                      <div className="text-sm font-bold text-[#5eead4] mt-0.5">~2.5h via USB-C (1A)</div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-5 bg-[#0d1017] p-4 rounded-xl border border-[#2a3140] font-mono text-xs space-y-2">
                  <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2">
                    Power Architecture Summary
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">Battery Chemistry</span>
                    <span className="text-[#eef1f6]">18650 Li-ion 3.7V</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">MCU Regulation</span>
                    <span className="text-[#5eead4]">3.3V Low-Dropout Rail</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3140]/60">
                    <span className="text-[#8b93a7]">Servo Power Bus</span>
                    <span className="text-[#f2a65a]">5.0V Boost Stage (1.5A)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#8b93a7]">Safety Cutoff</span>
                    <span className="text-rose-400">2.8V Low-Voltage Cutoff</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 05. DIY Cost Estimator Section */}
      <section id="calculator" className="pt-16 border-t border-[#2a3140]">
        <div className="font-mono text-xs text-[#f2a65a] mb-2 uppercase tracking-wider">
          // 05 — DIY ESTIMATOR
        </div>
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#eef1f6]">Interactive BOM &amp; Build Cost Calculator</h2>
            <p className="text-sm text-[#8b93a7] mt-1 max-w-xl">
              Customize your component selection to compute an exact DIY budget. Every part is available off-the-shelf on Robu, Amazon, or AliExpress.
            </p>
          </div>
          <div className="flex gap-2 font-mono text-xs">
            <button
              onClick={() => {
                soundFX.playClick();
                setCurrency("INR");
              }}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                currency === "INR"
                  ? "bg-[#5eead4] text-[#10131a] font-bold border-[#5eead4]"
                  : "bg-[#141820] text-[#8b93a7] border-[#2a3140]"
              }`}
            >
              INR (₹)
            </button>
            <button
              onClick={() => {
                soundFX.playClick();
                setCurrency("USD");
              }}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                currency === "USD"
                  ? "bg-[#5eead4] text-[#10131a] font-bold border-[#5eead4]"
                  : "bg-[#141820] text-[#8b93a7] border-[#2a3140]"
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4 font-mono text-xs">
            <div className="p-4 bg-[#141820] border border-[#2a3140] rounded-xl flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-[#eef1f6]">Servo Motors (2x)</div>
                <div className="text-[11px] text-[#8b93a7] mt-0.5">Shoulder arm actuation</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    soundFX.playClick();
                    setServoType("plastic");
                  }}
                  className={`px-3 py-1.5 rounded border transition-all cursor-pointer ${
                    servoType === "plastic"
                      ? "bg-[#5eead4] text-[#10131a] font-bold border-[#5eead4]"
                      : "bg-[#191e27] text-[#8b93a7] border-[#2a3140]"
                  }`}
                >
                  SG90 Nylon ({currency === "INR" ? "₹240" : "$2.8"})
                </button>
                <button
                  onClick={() => {
                    soundFX.playClick();
                    setServoType("metal");
                  }}
                  className={`px-3 py-1.5 rounded border transition-all cursor-pointer ${
                    servoType === "metal"
                      ? "bg-[#f2a65a] text-[#10131a] font-bold border-[#f2a65a]"
                      : "bg-[#191e27] text-[#8b93a7] border-[#2a3140]"
                  }`}
                >
                  MG90S Metal ({currency === "INR" ? "₹480" : "$5.8"})
                </button>
              </div>
            </div>

            <div className="p-4 bg-[#141820] border border-[#2a3140] rounded-xl flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-[#eef1f6]">18650 Battery Cell</div>
                <div className="text-[11px] text-[#8b93a7] mt-0.5">Li-ion cell + TP4056 USB-C board</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    soundFX.playClick();
                    setBatteryType("standard");
                  }}
                  className={`px-3 py-1.5 rounded border transition-all cursor-pointer ${
                    batteryType === "standard"
                      ? "bg-[#5eead4] text-[#10131a] font-bold border-[#5eead4]"
                      : "bg-[#191e27] text-[#8b93a7] border-[#2a3140]"
                  }`}
                >
                  2500mAh ({currency === "INR" ? "₹330" : "$3.9"})
                </button>
                <button
                  onClick={() => {
                    soundFX.playClick();
                    setBatteryType("high_capacity");
                  }}
                  className={`px-3 py-1.5 rounded border transition-all cursor-pointer ${
                    batteryType === "high_capacity"
                      ? "bg-[#c084fc] text-[#10131a] font-bold border-[#c084fc]"
                      : "bg-[#191e27] text-[#8b93a7] border-[#2a3140]"
                  }`}
                >
                  3500mAh ({currency === "INR" ? "₹540" : "$6.5"})
                </button>
              </div>
            </div>

            <div className="p-4 bg-[#141820] border border-[#2a3140] rounded-xl flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-[#eef1f6]">Cardboard Craft Chassis (Net Templates)</div>
                <div className="text-[11px] text-[#8b93a7] mt-0.5">Cut, score &amp; fold: head, torso, arm horns &amp; battery cradle</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    soundFX.playClick();
                    setPrintingType("home");
                  }}
                  className={`px-3 py-1.5 rounded border transition-all cursor-pointer ${
                    printingType === "home"
                      ? "bg-[#5eead4] text-[#10131a] font-bold border-[#5eead4]"
                      : "bg-[#191e27] text-[#8b93a7] border-[#2a3140]"
                  }`}
                >
                  Recycled Card ({currency === "INR" ? "Free ₹0" : "Free $0"})
                </button>
                <button
                  onClick={() => {
                    soundFX.playClick();
                    setPrintingType("commercial");
                  }}
                  className={`px-3 py-1.5 rounded border transition-all cursor-pointer ${
                    printingType === "commercial"
                      ? "bg-amber-400 text-[#10131a] font-bold border-amber-400"
                      : "bg-[#191e27] text-[#8b93a7] border-[#2a3140]"
                  }`}
                >
                  Kraft Mountboard 2mm ({currency === "INR" ? "₹40" : "$0.5"})
                </button>
              </div>
            </div>

            <div className="p-4 bg-[#141820] border border-[#2a3140] rounded-xl flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-[#eef1f6]">INMP441 I2S Digital Microphone</div>
                <div className="text-[11px] text-[#8b93a7] mt-0.5">Voice recording &amp; wake word detection</div>
              </div>
              <button
                onClick={() => {
                  soundFX.playClick();
                  setIncludeMic(!includeMic);
                }}
                className={`px-3 py-1.5 rounded border transition-all cursor-pointer ${
                  includeMic
                    ? "bg-[#5eead4] text-[#10131a] font-bold border-[#5eead4]"
                    : "bg-[#191e27] text-[#8b93a7] border-[#2a3140]"
                }`}
              >
                {includeMic ? `Included (${currency === "INR" ? "₹190" : "$2.3"})` : "Skip Mic"}
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#141820] border border-[#5eead4]/60 p-6 rounded-xl flex flex-col justify-between shadow-xl shadow-[#5eead4]/5">
            <div>
              <div className="text-xs font-mono text-[#5eead4] flex items-center gap-1.5">
                <Calculator className="w-4 h-4" />
                <span>TOTAL DIY ESTIMATE</span>
              </div>
              <div className="mt-4 text-4xl sm:text-5xl font-extrabold font-mono text-[#eef1f6]">
                {currency === "INR" ? `₹${calculateTotalCost()}` : `$${calculateTotalCost()}`}
              </div>
              <div className="text-xs text-[#8b93a7] font-mono mt-1">Complete self-contained pocket robot system</div>

              <div className="mt-6 pt-4 border-t border-[#2a3140] space-y-2 text-xs font-mono text-[#8b93a7]">
                <div className="flex justify-between">
                  <span>Cardboard Chassis:</span>
                  <span className="text-[#5eead4]">
                    {printingType === "home"
                      ? (currency === "INR" ? "Free (₹0)" : "Free ($0)")
                      : (currency === "INR" ? "₹40" : "$0.5")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ESP32-WROOM Controller:</span>
                  <span className="text-[#eef1f6]">{currency === "INR" ? "₹320" : "$3.8"}</span>
                </div>
                <div className="flex justify-between">
                  <span>1.8" IPS Color Display:</span>
                  <span className="text-[#eef1f6]">{currency === "INR" ? "₹310" : "$3.7"}</span>
                </div>
                <div className="flex justify-between">
                  <span>MAX98357A DAC + Speaker:</span>
                  <span className="text-[#eef1f6]">{currency === "INR" ? "₹290" : "$3.5"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Assembly Time:</span>
                  <span className="text-[#5eead4] font-bold">~45 minutes</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#2a3140]">
              <button
                onClick={() => {
                  soundFX.playClick();
                  onOpenControl();
                }}
                className="w-full py-3 bg-[#5eead4] hover:bg-[#5eead4]/90 text-[#10131a] font-mono text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow-md"
              >
                <SlidersVertical className="w-4 h-4" />
                <span>Open Firmware &amp; Circuit Schematics</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 06. FAQ Accordion */}
      <section id="faq" className="pt-16 border-t border-[#2a3140]">
        <div className="font-mono text-xs text-[#f2a65a] mb-2 uppercase tracking-wider">
          // 06 — FREQUENTLY ASKED
        </div>
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#eef1f6]">Questions &amp; Hardware Details</h2>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="border border-[#2a3140] rounded-xl bg-[#141820]/60 overflow-hidden">
                <button
                  onClick={() => {
                    soundFX.playClick();
                    setOpenFaq(isOpen ? null : idx);
                  }}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between text-sm sm:text-base font-semibold text-[#eef1f6] hover:text-[#5eead4] transition-colors cursor-pointer"
                >
                  <span>{item.q}</span>
                  <span className="font-mono text-[#5eead4] text-lg ml-4">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-[#8b93a7] leading-relaxed border-t border-[#2a3140]/60 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 07. Call-to-Action Banner */}
      <section className="pt-6">
        <div className="relative overflow-hidden bg-gradient-to-b from-[#141820] to-[#0d1017] border border-[#5eead4]/40 p-8 sm:p-14 rounded-2xl text-center space-y-5 shadow-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#5eead4]/10 border border-[#5eead4]/40 rounded-full text-xs font-mono text-[#5eead4]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>FULL-STACK ROBOT ENVIRONMENT</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#eef1f6] tracking-tight">
            Ready to control Zonyx+ in real-time?
          </h2>
          <p className="text-sm sm:text-base text-[#8b93a7] max-w-xl mx-auto leading-relaxed">
            Open the live control terminal to chat with Gemini, calibrate servo angles, monitor ESP32 battery telemetry,
            or compile ready-to-flash Arduino C++ firmware.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => {
                soundFX.playClick();
                onOpenControl();
              }}
              className="px-7 py-3.5 bg-[#5eead4] hover:bg-[#5eead4]/90 text-[#10131a] font-mono text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-[#5eead4]/20 active:scale-95"
            >
              <SlidersVertical className="w-4 h-4" />
              <span>Launch Control Panel Now</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-8 pb-12 border-t border-[#2a3140] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs text-[#8b93a7] font-mono">
        <div>
          <div className="text-sm font-bold text-[#eef1f6]">Zonyx+ Pocket Companion Robot</div>
          <div className="text-[#8b93a7] text-xs">Made by Jovan K Rajiv, Rayan Ilah, and Rayan Najeeb</div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[#5eead4] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#5eead4] animate-pulse" />
            <span>System: Active</span>
          </span>
          <span>•</span>
          <a href="#model3d" onClick={() => soundFX.playClick()} className="hover:text-[#5eead4] transition-colors">
            3D CAD
          </a>
          <span>•</span>
          <a href="#calculator" onClick={() => soundFX.playClick()} className="hover:text-[#5eead4] transition-colors">
            BOM Calculator
          </a>
          <span>•</span>
          <button onClick={() => { soundFX.playClick(); onOpenControl(); }} className="text-[#5eead4] hover:underline cursor-pointer">
            Admin Terminal
          </button>
        </div>
      </footer>
    </div>
  );
};
