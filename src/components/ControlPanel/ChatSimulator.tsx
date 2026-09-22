import React, { useState, useRef, useEffect } from "react";
import { soundFX } from "../../utils/soundFX";
import confetti from "canvas-confetti";
import { triggerEasterEgg } from "../../utils/easterEggs";
import { hardwareSync } from "../../utils/hardwareSync";
import { RobotPersonalityMode, ChatMessage, EmotionType, ServoPose } from "../../types";
import {
  Send,
  RotateCw,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  User,
  Bot,
  Clock,
  Sparkles,
  Hand,
  Activity,
  Gamepad2,
} from "lucide-react";
import { HeroRobotArt } from "../HeroRobotArt";

interface ChatSimulatorProps {
  activeMode: RobotPersonalityMode;
  onUpdateEmotion?: (emotion: EmotionType, pose: ServoPose) => void;
  robotName?: string;
}

export const ChatSimulator: React.FC<ChatSimulatorProps> = ({
  activeMode,
  onUpdateEmotion,
  robotName = "Zonyx+",
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      text: `Hello! I'm ${robotName}, ready to help you build or explore. (${activeMode.name} mode)`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      emotion: activeMode.defaultExpression,
      servoPose: activeMode.defaultPose,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>(activeMode.defaultExpression);
  const [currentPose, setCurrentPose] = useState<ServoPose>(activeMode.defaultPose);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [pokeReaction, setPokeReaction] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const handlePokeRobot = () => {
    soundFX.playGiggle();
    setCurrentEmotion("wink");
    setCurrentPose({ leftArm: 70, rightArm: -20 });
    const sayings = [
      "Boop! (That tickles!)",
      "SG90 Servos check: 100%!",
      "Ready for action! ⚡",
      "Beep boop! (^_^)",
      "Hey friend! Need a hand?",
    ];
    const pick = sayings[Math.floor(Math.random() * sayings.length)];
    setPokeReaction(pick);
    setTimeout(() => {
      setCurrentEmotion(activeMode.defaultExpression);
      setCurrentPose(activeMode.defaultPose);
      setPokeReaction(null);
    }, 2200);
  };

  const triggerHighFive = () => {
    soundFX.playHighFive();
    try {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.65 } });
    } catch {}
    setCurrentEmotion("happy");
    setCurrentPose({ leftArm: 20, rightArm: 90 });
    setPokeReaction("High Five! ✋⚡");
    if (onUpdateEmotion) onUpdateEmotion("happy", { leftArm: 20, rightArm: 90 });
    setTimeout(() => {
      setCurrentEmotion(activeMode.defaultExpression);
      setCurrentPose(activeMode.defaultPose);
      setPokeReaction(null);
    }, 2500);
  };

  const triggerDance = () => {
    soundFX.playRobotChirp("happy");
    setCurrentEmotion("wink");
    setPokeReaction("Servo Dance! 💃");
    let step = 0;
    const interval = setInterval(() => {
      step++;
      soundFX.playServoMove();
      if (step % 2 === 0) {
        setCurrentPose({ leftArm: 55, rightArm: -25 });
      } else {
        setCurrentPose({ leftArm: -25, rightArm: 55 });
      }
      if (step >= 4) {
        clearInterval(interval);
        setTimeout(() => {
          setCurrentEmotion(activeMode.defaultExpression);
          setCurrentPose(activeMode.defaultPose);
          setPokeReaction(null);
        }, 800);
      }
    }, 250);
  };

  const triggerSalute = () => {
    soundFX.playRobotChirp("alert");
    setCurrentEmotion("alert");
    setCurrentPose({ leftArm: 0, rightArm: 85 });
    setPokeReaction("Salute! (Zonyx+ Ready) 🫡");
    setTimeout(() => {
      setCurrentEmotion(activeMode.defaultExpression);
      setCurrentPose(activeMode.defaultPose);
      setPokeReaction(null);
    }, 2200);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    setCurrentEmotion(activeMode.defaultExpression);
    setCurrentPose(activeMode.defaultPose);
  }, [activeMode]);

  // Text-To-Speech
  const speakText = (text: string) => {
    if (!speechEnabled || typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = activeMode.voicePitch;
    utterance.rate = activeMode.voiceSpeed;
    utterance.lang = "en-US";

    const voices = window.speechSynthesis.getVoices();
    const friendlyVoice = voices.find(
      (v) => v.name.includes("Google") || v.name.includes("Natural") || v.lang === "en-US"
    );
    if (friendlyVoice) utterance.voice = friendlyVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Speech-To-Text (Web Speech API)
  const toggleListening = () => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please type your message.");
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
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        handleSend(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech recognition error:", err);
      setIsListening(false);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = (overrideText || input).trim();
    if (!textToSend || loading) return;

    soundFX.playClick();
    setInput("");
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setCurrentEmotion("thinking");
    setCurrentPose({ leftArm: -15, rightArm: 35 });

    // Google Easter Egg Interceptor
    const lower = textToSend.toLowerCase();
    let easterEggData: { reply: string; emotion: EmotionType; servoPose: ServoPose } | null = null;

    if (lower.includes("barrel roll")) {
      triggerEasterEgg("barrel-roll");
      easterEggData = {
        reply: "🌀 WHOAAA! Rolling 360 degrees! Gyro sensors reading maximum rotational momentum!",
        emotion: "surprised",
        servoPose: { leftArm: 70, rightArm: -70 },
      };
    } else if (lower.includes("party") || lower.includes("disco")) {
      triggerEasterEgg("party");
      easterEggData = {
        reply: "🪩 Party mode engaged! Let's get these SG90 servos grooving under the disco lights!",
        emotion: "happy",
        servoPose: { leftArm: 60, rightArm: 60 },
      };
    } else if (lower.includes("matrix") || lower.includes("hack")) {
      triggerEasterEgg("matrix");
      easterEggData = {
        reply: "💻 Wake up, Neo... Zonyx+ Matrix mode active on ESP32 terminal registers.",
        emotion: "alert",
        servoPose: { leftArm: 25, rightArm: 25 },
      };
    } else if (lower.includes("gravity")) {
      triggerEasterEgg("zero-gravity");
      easterEggData = {
        reply: "🌌 Google Zero Gravity sequence engaged! Enjoy the weightless cyber drift...",
        emotion: "wink",
        servoPose: { leftArm: 40, rightArm: -20 },
      };
    } else if (lower.includes("laser") || lower.includes("pew")) {
      triggerEasterEgg("laser");
      easterEggData = {
        reply: "🚀 Pew-pew-pew! Arcade photon blaster fired with pinpoint accuracy!",
        emotion: "alert",
        servoPose: { leftArm: 0, rightArm: 85 },
      };
    } else if (lower.includes("coin")) {
      triggerEasterEgg("coin");
      const side = Math.random() > 0.5 ? "HEADS" : "TAILS";
      easterEggData = {
        reply: `🪙 *Ping!* Flipped a coin for you: **${side}**! (1-UP power boost gained!)`,
        emotion: "happy",
        servoPose: { leftArm: 45, rightArm: 75 },
      };
    } else if (lower.includes("purr")) {
      triggerEasterEgg("purr");
      easterEggData = {
        reply: "🐱 *Prrrrrrrrr...* (Zonyx+ emits a warm robotic purr, feeling cozy and loved!)",
        emotion: "happy",
        servoPose: { leftArm: 15, rightArm: 15 },
      };
    }

    if (easterEggData) {
      setTimeout(() => {
        const emotion = easterEggData!.emotion;
        const servoPose = easterEggData!.servoPose;
        setCurrentEmotion(emotion);
        setCurrentPose(servoPose);
        if (onUpdateEmotion) onUpdateEmotion(emotion, servoPose);

        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: "assistant",
          text: easterEggData!.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          emotion,
          servoPose,
          latencyMs: 12,
        };

        setMessages((prev) => [...prev, botMsg]);
        speakText(easterEggData!.reply);
        setLoading(false);
      }, 350);
      return;
    }

    try {
      const response = await fetch("/api/zonyx/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          modeId: activeMode.id,
          robotName,
          conversationHistory: messages.slice(-6).map((m) => ({
            role: m.role,
            text: m.text,
          })),
        }),
      });

      let data: any = null;
      if (response.ok) {
        const text = await response.text();
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
          reply: `Beep-boop! ${robotName} is online, dual SG90 servos active and standing by!`,
          emotion: activeMode.defaultExpression || "happy",
          servoPose: activeMode.defaultPose || { leftArm: 15, rightArm: 45 },
          latencyMs: 45,
        };
      }

      const emotion: EmotionType = data.emotion || activeMode.defaultExpression;
      const servoPose: ServoPose = data.servoPose || activeMode.defaultPose;

      setCurrentEmotion(emotion);
      setCurrentPose(servoPose);

      soundFX.playRobotChirp(emotion);
      soundFX.playServoMove();

      // Dispatch to physical robot if paired (Web Serial or WiFi WebSocket)
      hardwareSync.syncServoPose(servoPose.leftArm, servoPose.rightArm, emotion);

      if (onUpdateEmotion) {
        onUpdateEmotion(emotion, servoPose);
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        emotion,
        servoPose,
        latencyMs: data.latencyMs,
      };

      setMessages((prev) => [...prev, botMsg]);
      speakText(data.reply);
    } catch (error) {
      console.error("Failed to communicate with Zonyx+ brain:", error);
      const errorMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        text: "Beep! Connection to the Zonyx+ neural server lagged slightly. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        emotion: "alert",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const samplePrompts = [
    "🌀 do a barrel roll",
    "🪩 party mode",
    "🪙 flip a coin",
    "Who built you?",
    "Roast my desk setup",
    "Give me a high five",
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[620px] select-none">
      {/* Left Column: Visual Servo & 1.8" IPS Screen Monitor */}
      <div className="lg:col-span-5 bg-[#141820] border border-[#2a3140] p-4 flex flex-col items-center justify-between">
        <div className="w-full flex items-center justify-between text-xs font-mono text-[#8b93a7] pb-2 border-b border-[#2a3140]">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isSpeaking ? "bg-[#f2a65a] animate-ping" : "bg-[#5eead4]"}`} />
            1.8" IPS Display & Servo Monitor
          </span>
          <span className="px-1.5 py-0.5 bg-[#191e27] border border-[#2a3140] text-[#5eead4] capitalize">
            {currentEmotion}
          </span>
        </div>

        {/* 2D Robot Display Representation with Interactive Poke Reaction */}
        <div className="my-auto py-1 flex flex-col items-center relative">
          {pokeReaction && (
            <div className="absolute -top-6 px-3 py-1 bg-[#5eead4] text-[#10131a] text-xs font-mono font-bold rounded-full shadow-lg animate-bounce z-20 whitespace-nowrap">
              {pokeReaction}
            </div>
          )}

          <div
            onClick={handlePokeRobot}
            title={`Click to poke or tickle ${robotName}!`}
            className="scale-90 sm:scale-95 transition-transform cursor-pointer hover:scale-100 active:scale-90 select-none group"
          >
            <HeroRobotArt
              expression={currentEmotion}
              pose={currentPose}
              isTalking={isSpeaking || loading}
            />
            <div className="text-center mt-1">
              <span className="text-[10px] font-mono text-[#8b93a7] group-hover:text-[#5eead4] transition-colors">
                (Click robot to tickle)
              </span>
            </div>
          </div>

          {/* Quick Robot Gestures Toolbar */}
          <div className="flex items-center gap-1.5 mt-2">
            <button
              onClick={triggerHighFive}
              title={`High Five with ${robotName}`}
              className="px-2 py-1 bg-[#191e27] hover:bg-[#2a3140] border border-[#2a3140] hover:border-[#5eead4] text-[11px] font-mono text-[#5eead4] rounded transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <Hand className="w-3 h-3" />
              <span>High Five</span>
            </button>
            <button
              onClick={triggerDance}
              title="Servo Wiggle Dance"
              className="px-2 py-1 bg-[#191e27] hover:bg-[#2a3140] border border-[#2a3140] hover:border-[#f2a65a] text-[11px] font-mono text-[#f2a65a] rounded transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <Sparkles className="w-3 h-3" />
              <span>Dance</span>
            </button>
            <button
              onClick={triggerSalute}
              title="Military Servo Salute"
              className="px-2 py-1 bg-[#191e27] hover:bg-[#2a3140] border border-[#2a3140] hover:border-[#c084fc] text-[11px] font-mono text-[#c084fc] rounded transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <Activity className="w-3 h-3" />
              <span>Salute</span>
            </button>
          </div>
        </div>

        {/* Live Metrics readout */}
        <div className="w-full grid grid-cols-3 gap-2 text-center text-[11px] font-mono text-[#8b93a7] bg-[#10131a] p-2.5 border border-[#2a3140]">
          <div>
            <div className="text-[#5eead4] font-semibold">{currentPose.leftArm}°</div>
            <div>Left Servo</div>
          </div>
          <div>
            <div className="text-[#5eead4] font-semibold">{currentPose.rightArm}°</div>
            <div>Right Servo</div>
          </div>
          <div>
            <div className="text-[#f2a65a] font-semibold">{activeMode.name}</div>
            <div>Active Mode</div>
          </div>
        </div>
      </div>

      {/* Right Column: Chat History & Input */}
      <div className="lg:col-span-7 bg-[#141820] border border-[#2a3140] flex flex-col h-full">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3140] bg-[#191e27]">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#5eead4]" />
            <span className="font-mono text-xs font-semibold text-[#eef1f6]">{robotName} Brain Terminal</span>
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded border"
              style={{ borderColor: activeMode.badgeColor, color: activeMode.badgeColor }}
            >
              {activeMode.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSpeechEnabled(!speechEnabled)}
              title={speechEnabled ? "Voice Mute" : "Voice Enable"}
              className={`p-1.5 text-xs font-mono rounded border transition-colors cursor-pointer ${
                speechEnabled
                  ? "border-[#5eead4] text-[#5eead4] bg-[#5eead4]/10"
                  : "border-[#2a3140] text-[#8b93a7] hover:border-[#5eead4]"
              }`}
            >
              {speechEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() =>
                setMessages([
                  {
                    id: "reset-1",
                    role: "assistant",
                    text: `Hello! I'm ${robotName}, ready to help you build or explore. (${activeMode.name} mode ready)`,
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    emotion: activeMode.defaultExpression,
                    servoPose: activeMode.defaultPose,
                  },
                ])
              }
              title="Clear Terminal Messages"
              className="p-1.5 text-xs font-mono rounded border border-[#2a3140] text-[#8b93a7] hover:border-[#5eead4] hover:text-[#5eead4] transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 font-sans">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-[11px] font-mono text-[#8b93a7]">
                {msg.role === "user" ? (
                  <>
                    <span>You</span>
                    <User className="w-3 h-3 text-[#f2a65a]" />
                  </>
                ) : (
                  <>
                    <Bot className="w-3 h-3 text-[#5eead4]" />
                    <span>{robotName} ({activeMode.name})</span>
                    {msg.latencyMs && (
                      <span className="flex items-center gap-0.5 text-[#5eead4] text-[10px]">
                        <Clock className="w-2.5 h-2.5" />
                        {msg.latencyMs}ms
                      </span>
                    )}
                  </>
                )}
                <span>{msg.timestamp}</span>
              </div>
              <div
                className={`max-w-[85%] px-3.5 py-2.5 rounded text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#191e27] border border-[#2a3140] text-[#eef1f6]"
                    : "bg-[#10131a] border border-[#2a3140] text-[#eef1f6] shadow-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1.5 mb-1 text-[11px] font-mono text-[#8b93a7]">
                <Bot className="w-3 h-3 text-[#5eead4]" />
                <span>{robotName} is thinking...</span>
              </div>
              <div className="px-3.5 py-2.5 rounded text-sm bg-[#10131a] border border-[#5eead4]/40 text-[#5eead4] font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#5eead4] animate-ping" />
                <span>Processing through Gemini neural core...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Sample Prompts */}
        <div className="px-4 py-2 bg-[#12161f] border-t border-[#2a3140] overflow-x-auto flex gap-2 no-scrollbar">
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              className="text-[11px] font-mono whitespace-nowrap px-2.5 py-1 bg-[#191e27] hover:bg-[#2a3140] text-[#8b93a7] hover:text-[#5eead4] border border-[#2a3140] rounded transition-colors cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-[#191e27] border-t border-[#2a3140] flex items-center gap-2">
          <button
            type="button"
            onClick={toggleListening}
            title={isListening ? "Stop listening" : "Push to Talk (Mic)"}
            className={`p-2.5 rounded border transition-all cursor-pointer ${
              isListening
                ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse"
                : "bg-[#10131a] border-[#2a3140] text-[#8b93a7] hover:text-[#5eead4] hover:border-[#5eead4]"
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening to voice..." : `Ask ${robotName} anything or type an Easter egg...`}
            disabled={loading}
            className="flex-1 bg-[#10131a] border border-[#2a3140] focus:border-[#5eead4] px-3.5 py-2 text-sm text-[#eef1f6] placeholder-[#8b93a7] outline-none rounded font-sans"
          />

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="px-4 py-2 bg-[#5eead4] text-[#10131a] hover:bg-[#5eead4]/90 disabled:opacity-50 disabled:cursor-not-allowed font-mono text-xs font-bold rounded flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
