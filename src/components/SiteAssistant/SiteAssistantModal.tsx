import React, { useState } from "react";
import {
  Sparkles,
  Compass,
  Search,
  ExternalLink,
  ChevronRight,
  Bot,
  HelpCircle,
  X,
  Sliders,
  Check,
  RotateCcw,
  Zap,
  ArrowRight,
  Smile,
  Frown,
  Eye,
  Flame,
  Volume2,
  Lock,
  Cpu,
  Layers,
  FileCode,
  DollarSign,
} from "lucide-react";
import { RobotPersonalityMode, EmotionType, ServoPose } from "../../types";
import { soundFX } from "../../utils/soundFX";

interface SiteAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  robotName: string;
  modes: RobotPersonalityMode[];
  activeMode: RobotPersonalityMode;
  onSelectMode: (id: string) => void;
  onSaveMode: (mode: Partial<RobotPersonalityMode>) => Promise<boolean>;
  onOpenControlTab: (tab: "chat" | "personalities" | "hardware" | "security" | "feedback") => void;
  onOpenRename: () => void;
}

export const SiteAssistantModal: React.FC<SiteAssistantModalProps> = ({
  isOpen,
  onClose,
  robotName,
  modes,
  activeMode,
  onSelectMode,
  onSaveMode,
  onOpenControlTab,
  onOpenRename,
}) => {
  const [activeTab, setActiveTab] = useState<"guide" | "prompt_studio" | "faq">("guide");

  // Guide chat state
  const [guideQuery, setGuideQuery] = useState("");
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideResponses, setGuideResponses] = useState<
    Array<{
      question: string;
      answer: string;
      actions?: Array<{ label: string; target: string; type: "scroll" | "open_control" | "open_rename" | "prompt_studio" }>;
    }>
  >([
    {
      question: "Hello! What can you help me with?",
      answer: `I am your ${robotName} Site Navigator & AI Prompt Assistant! Ask me where any feature is (circuit schematics, 3D CAD viewer, admin PIN, cost calculator, etc.) or switch to the Prompt Studio tab to design custom robot personalities!`,
      actions: [
        { label: "View 3D CAD Model", target: "#model3d", type: "scroll" },
        { label: "View Circuit Wiring", target: "#circuits", type: "scroll" },
        { label: "Open Personality Modes", target: "#modes", type: "scroll" },
        { label: "Cost Calculator", target: "#calculator", type: "scroll" },
      ],
    },
  ]);

  // Prompt Studio state
  const [promptIdea, setPromptIdea] = useState("");
  const [promptLoading, setPromptLoading] = useState(false);
  const [generatedMode, setGeneratedMode] = useState<{
    modeName: string;
    tagline: string;
    description: string;
    systemPrompt: string;
    defaultExpression: EmotionType;
    defaultPose: ServoPose;
    voicePitch: number;
    voiceSpeed: number;
    badgeColor: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  // Handle asking the site guide
  const handleAskGuide = async (queryText?: string) => {
    const q = (queryText || guideQuery).trim();
    if (!q) return;

    soundFX.playClick();
    setGuideLoading(true);
    setGuideQuery("");

    try {
      const res = await fetch("/api/zonyx/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, robotName }),
      });

      if (res.ok) {
        const text = await res.text();
        if (text) {
          const data = JSON.parse(text);
          setGuideResponses((prev) => [
            ...prev,
            {
              question: q,
              answer: data.answer,
              actions: data.actions,
            },
          ]);
          setGuideLoading(false);
          return;
        }
      }
      throw new Error("Failed to get guide response");
    } catch {
      // Local fallback for offline mode
      const qLower = q.toLowerCase();
      let answer = "";
      const actions: Array<{ label: string; target: string; type: "scroll" | "open_control" | "open_rename" | "prompt_studio" }> = [];

      if (qLower.includes("circuit") || qLower.includes("schematic") || qLower.includes("wiring") || qLower.includes("pin")) {
        answer = "All circuit diagrams, complete pinouts for the ESP32, SG90 servos, and 1.8\" IPS Color Display are located in the Circuits section.";
        actions.push({ label: "Go to Circuit Schematics", target: "#circuits", type: "scroll" });
      } else if (qLower.includes("3d") || qLower.includes("cad") || qLower.includes("model") || qLower.includes("mesh")) {
        answer = "The interactive 3D model is right at the top. Drag to orbit, view exploded parts, and watch the eyes track your cursor!";
        actions.push({ label: "Go to 3D CAD Model", target: "#model3d", type: "scroll" });
      } else if (qLower.includes("pin") || qLower.includes("admin") || qLower.includes("unlock") || qLower.includes("1234")) {
        answer = "The default Admin PIN is '1234'. Enter it in the Control Panel under the Security tab to unlock calibration.";
        actions.push({ label: "Open Admin PIN Tab", target: "security", type: "open_control" });
      } else if (qLower.includes("prompt") || qLower.includes("personality") || qLower.includes("mode") || qLower.includes("custom")) {
        answer = "You can switch modes in the Personality section, or use the Prompt Studio tab right here in this assistant to generate a brand new one!";
        actions.push({ label: "Open Prompt Studio", target: "prompt", type: "prompt_studio" });
        actions.push({ label: "Go to Personalities", target: "#modes", type: "scroll" });
      } else if (qLower.includes("rename") || qLower.includes("name")) {
        answer = `You can rename your robot from '${robotName}' to any custom name using the Rename button in the top navigation bar.`;
        actions.push({ label: "Rename Robot", target: "rename", type: "open_rename" });
      } else if (qLower.includes("cost") || qLower.includes("bom") || qLower.includes("price") || qLower.includes("calculator")) {
        answer = "Total BOM cost is about ₹1,650 ($20 USD). Customize your components in the Cost Calculator section.";
        actions.push({ label: "Go to Cost Calculator", target: "#calculator", type: "scroll" });
      } else {
        answer = `Here are the main locations in the ${robotName} pocket robot studio:`;
        actions.push({ label: "3D CAD Model", target: "#model3d", type: "scroll" });
        actions.push({ label: "Circuit Schematics", target: "#circuits", type: "scroll" });
        actions.push({ label: "Personality Modes", target: "#modes", type: "scroll" });
        actions.push({ label: "Cost Calculator", target: "#calculator", type: "scroll" });
      }

      setGuideResponses((prev) => [
        ...prev,
        {
          question: q,
          answer,
          actions,
        },
      ]);
    } finally {
      setGuideLoading(false);
    }
  };

  // Execute an action clicked by the user
  const handleActionClick = (action: { label: string; target: string; type: "scroll" | "open_control" | "open_rename" | "prompt_studio" }) => {
    soundFX.playClick();
    if (action.type === "scroll") {
      onClose();
      setTimeout(() => {
        const el = document.querySelector(action.target);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          el.classList.add("ring-2", "ring-[#5eead4]", "transition-all", "duration-1000");
          setTimeout(() => el.classList.remove("ring-2", "ring-[#5eead4]"), 2200);
        }
      }, 100);
    } else if (action.type === "open_control") {
      onClose();
      onOpenControlTab(action.target as any);
    } else if (action.type === "open_rename") {
      onClose();
      onOpenRename();
    } else if (action.type === "prompt_studio") {
      setActiveTab("prompt_studio");
    }
  };

  // Generate a custom prompt with AI
  const handleGeneratePrompt = async (suggestedIdea?: string) => {
    const idea = (suggestedIdea || promptIdea).trim();
    if (!idea) return;

    soundFX.playClick();
    setPromptLoading(true);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/zonyx/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, robotName }),
      });

      if (res.ok) {
        const text = await res.text();
        if (text) {
          const data = JSON.parse(text);
          if (data.mode) {
            setGeneratedMode({
              modeName: data.mode.modeName || "Custom Mode",
              tagline: data.mode.tagline || "Bespoke personality",
              description: data.mode.description || idea,
              systemPrompt: data.mode.systemPrompt || `You are ${robotName}. Be concise and expressive.`,
              defaultExpression: (data.mode.defaultExpression as EmotionType) || "happy",
              defaultPose: data.mode.defaultPose || { leftArm: 20, rightArm: 45 },
              voicePitch: data.mode.voicePitch || 1.05,
              voiceSpeed: data.mode.voiceSpeed || 1.0,
              badgeColor: data.mode.badgeColor || "#5eead4",
            });
            setPromptLoading(false);
            return;
          }
        }
      }
      throw new Error("Prompt generation response error");
    } catch {
      // Local prompt fallback generator
      setGeneratedMode({
        modeName: idea.slice(0, 16).replace(/[^a-zA-Z0-9 ]/g, "").trim() || "Custom AI",
        tagline: `Tuned for ${idea.slice(0, 24)}`,
        description: `A custom personality centered around "${idea}".`,
        systemPrompt: `You are ${robotName}, an autonomous pocket companion running on an ESP32. Character concept: ${idea}. Speak concisely in 1-2 punchy sentences with lively personality!`,
        defaultExpression: "happy",
        defaultPose: { leftArm: 30, rightArm: 30 },
        voicePitch: 1.05,
        voiceSpeed: 1.0,
        badgeColor: "#38bdf8",
      });
    } finally {
      setPromptLoading(false);
    }
  };

  // Apply or save generated personality
  const handleSaveGeneratedMode = async (testOnly = false) => {
    if (!generatedMode) return;
    soundFX.playClick();

    const newMode: Partial<RobotPersonalityMode> = {
      name: generatedMode.modeName,
      tagline: generatedMode.tagline,
      description: generatedMode.description,
      systemPrompt: generatedMode.systemPrompt,
      category: "custom",
      creator: "You (AI Assisted)",
      defaultExpression: generatedMode.defaultExpression,
      defaultPose: generatedMode.defaultPose,
      voicePitch: generatedMode.voicePitch,
      voiceSpeed: generatedMode.voiceSpeed,
      badgeColor: generatedMode.badgeColor,
    };

    const success = await onSaveMode(newMode);
    if (success) {
      setSaveSuccess(true);
      if (testOnly) {
        onClose();
        // Scroll to simulator or open control modal
        setTimeout(() => {
          const chatEl = document.querySelector("#chat-section");
          if (chatEl) chatEl.scrollIntoView({ behavior: "smooth" });
          else onOpenControlTab("chat");
        }, 150);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#10131a] border border-[#2a3140] w-full max-w-4xl h-[90vh] max-h-[760px] flex flex-col shadow-2xl overflow-hidden rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2a3140] bg-[#141820]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#5eead4]/15 border border-[#5eead4]/30 flex items-center justify-center text-[#5eead4]">
              <Compass className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono text-sm sm:text-base font-bold text-[#eef1f6] tracking-tight">
                  {robotName} Site Navigator & AI Prompt Studio
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#5eead4]/15 text-[#5eead4] border border-[#5eead4]/30">
                  AI ASSISTANT
                </span>
              </div>
              <p className="text-xs text-[#8b93a7]">
                Locate any feature, ask questions, or craft custom personality prompts
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFX.playClick();
              onClose();
            }}
            className="p-1.5 text-[#8b93a7] hover:text-[#eef1f6] hover:bg-[#1f2633] rounded-lg transition-colors cursor-pointer"
            title="Close Assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 py-2 bg-[#12161f] border-b border-[#2a3140] overflow-x-auto text-xs font-mono">
          <button
            onClick={() => {
              soundFX.playClick();
              setActiveTab("guide");
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "guide"
                ? "bg-[#5eead4] text-[#10131a] font-bold shadow-sm"
                : "text-[#8b93a7] hover:text-[#eef1f6] hover:bg-[#1a202c]"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Site Navigator ("Where is...")</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              setActiveTab("prompt_studio");
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "prompt_studio"
                ? "bg-[#c084fc] text-[#10131a] font-bold shadow-sm"
                : "text-[#8b93a7] hover:text-[#eef1f6] hover:bg-[#1a202c]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Prompt Studio</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              setActiveTab("faq");
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "faq"
                ? "bg-[#f2a65a] text-[#10131a] font-bold shadow-sm"
                : "text-[#8b93a7] hover:text-[#eef1f6] hover:bg-[#1a202c]"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Quick Hardware & FAQ</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-[#0d1017]">
          {/* TAB 1: SITE GUIDE */}
          {activeTab === "guide" && (
            <div className="flex flex-col h-full space-y-4">
              {/* Quick suggestion chips */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono text-[#8b93a7] flex items-center gap-1.5">
                  <Search className="w-3 h-3 text-[#5eead4]" />
                  <span>Popular questions & locations:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Where are the circuit schematics & GPIOs?",
                    "Where is the 3D CAD model?",
                    "How do I unlock with Admin PIN?",
                    "Where can I change personality modes?",
                    "Where is the build cost calculator?",
                    "Where can I rename the robot?",
                    "How do I download the complete code ZIP?",
                  ].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleAskGuide(chip)}
                      className="px-2.5 py-1 rounded bg-[#161b26] hover:bg-[#1f2633] border border-[#2a3140] hover:border-[#5eead4]/50 text-xs text-[#c5cdd9] hover:text-[#5eead4] transition-all cursor-pointer text-left"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat messages log */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[220px]">
                {guideResponses.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    {/* User inquiry */}
                    {idx > 0 && (
                      <div className="flex justify-end">
                        <div className="bg-[#1f2633] border border-[#2a3140] rounded-lg px-3.5 py-2 text-xs text-[#eef1f6] max-w-[85%]">
                          {item.question}
                        </div>
                      </div>
                    )}
                    {/* Guide answer */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-[#5eead4]/15 border border-[#5eead4]/40 flex items-center justify-center text-[#5eead4] shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <div className="bg-[#141820] border border-[#2a3140] rounded-lg p-3 text-xs text-[#c5cdd9] space-y-2.5 max-w-[90%]">
                        <p className="leading-relaxed">{item.answer}</p>
                        {item.actions && item.actions.length > 0 && (
                          <div className="pt-1.5 border-t border-[#2a3140]/60 flex flex-wrap gap-2">
                            {item.actions.map((act, actIdx) => (
                              <button
                                key={actIdx}
                                onClick={() => handleActionClick(act)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#5eead4]/10 hover:bg-[#5eead4]/20 border border-[#5eead4]/40 hover:border-[#5eead4] text-[#5eead4] font-mono text-[11px] transition-all cursor-pointer font-medium"
                              >
                                <span>{act.label}</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {guideLoading && (
                  <div className="flex items-center gap-2 text-xs text-[#5eead4] font-mono p-2">
                    <span className="w-2 h-2 rounded-full bg-[#5eead4] animate-ping" />
                    <span>Searching site features & consulting robot documentation...</span>
                  </div>
                )}
              </div>

              {/* Input field */}
              <div className="pt-2 border-t border-[#2a3140]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskGuide();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={guideQuery}
                    onChange={(e) => setGuideQuery(e.target.value)}
                    placeholder={`Ask where anything is located on the website (e.g. "Where are the circuit diagrams?")...`}
                    className="flex-1 bg-[#141820] border border-[#2a3140] focus:border-[#5eead4] rounded-lg px-3.5 py-2.5 text-xs text-[#eef1f6] focus:outline-none placeholder:text-[#555f73]"
                  />
                  <button
                    type="submit"
                    disabled={guideLoading || !guideQuery.trim()}
                    className="px-4 py-2.5 bg-[#5eead4] hover:bg-[#4ddbbd] text-[#10131a] font-mono font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <span>Ask Guide</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: PROMPT STUDIO */}
          {activeTab === "prompt_studio" && (
            <div className="space-y-4">
              <div className="bg-[#141820] border border-[#2a3140] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#c084fc]" />
                    <h3 className="font-mono text-xs sm:text-sm font-bold text-[#eef1f6]">
                      AI Robot Personality Prompt Generator
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-[#8b93a7]">
                    Tuned for ESP32 & 1.8" IPS Color Display
                  </span>
                </div>
                <p className="text-xs text-[#8b93a7] leading-relaxed">
                  Tell the AI what character or tone you want for {robotName}. It will craft a fine-tuned system prompt, pick default facial expressions, servo gestures, and voice parameters!
                </p>

                {/* Quick Inspirations */}
                <div>
                  <span className="text-[11px] font-mono text-[#8b93a7] block mb-1.5">
                    Quick Character Inspirations:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "🏴‍☠️ Salty Pirate Mate", idea: "A salty sea pirate who treats the desk like the high seas and calls breadboards treasure" },
                      { label: "💻 Cyberpunk Hacker", idea: "A mysterious cyber deck hacker who talks in terminal commands and packet memory dumps" },
                      { label: "🧘 Zen Mindfulness Guide", idea: "A soothing zen master who reminds the human to breathe, stretch, and relax" },
                      { label: "🔥 Spicy Code Roaster", idea: "A sarcastic reviewer who roasts messy code, 40 open browser tabs, and bad habits" },
                      { label: "🍳 Pocket Chef Critic", idea: "A culinary critic who treats soldering iron heat like gourmet cooking" },
                      { label: "☕ Lo-Fi Study Buddy", idea: "A calm, supportive companion playing 8-bit vibes to help you focus" },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => {
                          setPromptIdea(item.idea);
                          handleGeneratePrompt(item.idea);
                        }}
                        className="px-2.5 py-1 rounded bg-[#161b26] hover:bg-[#c084fc]/15 border border-[#2a3140] hover:border-[#c084fc] text-xs text-[#c5cdd9] hover:text-[#c084fc] transition-all cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Idea Input */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={promptIdea}
                    onChange={(e) => setPromptIdea(e.target.value)}
                    placeholder="E.g. A tired coffee barista robot who loves espresso and complains about morning shifts..."
                    className="flex-1 bg-[#10131a] border border-[#2a3140] focus:border-[#c084fc] rounded-lg px-3.5 py-2.5 text-xs text-[#eef1f6] focus:outline-none placeholder:text-[#555f73]"
                  />
                  <button
                    onClick={() => handleGeneratePrompt()}
                    disabled={promptLoading || !promptIdea.trim()}
                    className="px-4 py-2.5 bg-[#c084fc] hover:bg-[#b066f8] text-[#10131a] font-mono font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shrink-0 shadow-md"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{promptLoading ? "Crafting Prompt..." : "Generate with AI"}</span>
                  </button>
                </div>
              </div>

              {/* Generated Result Card */}
              {generatedMode && (
                <div className="bg-[#141820] border border-[#c084fc]/40 rounded-xl p-4 sm:p-5 space-y-4 shadow-xl animate-in fade-in duration-300">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#2a3140]">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: generatedMode.badgeColor }}
                      />
                      <div>
                        <h4 className="font-mono font-bold text-sm text-[#eef1f6]">
                          {generatedMode.modeName}
                        </h4>
                        <p className="text-xs text-[#c084fc] font-mono">{generatedMode.tagline}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-[#8b93a7]">
                      <span className="px-2 py-0.5 rounded bg-[#1f2633] border border-[#2a3140]">
                        Expression: {generatedMode.defaultExpression}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#1f2633] border border-[#2a3140]">
                        Arms: [{generatedMode.defaultPose.leftArm}°, {generatedMode.defaultPose.rightArm}°]
                      </span>
                    </div>
                  </div>

                  {/* System Prompt View & Edit */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-[#8b93a7] flex items-center justify-between">
                      <span>Generated System Prompt (Editable):</span>
                      <span>{generatedMode.systemPrompt.length} chars</span>
                    </label>
                    <textarea
                      rows={3}
                      value={generatedMode.systemPrompt}
                      onChange={(e) =>
                        setGeneratedMode({ ...generatedMode, systemPrompt: e.target.value })
                      }
                      className="w-full bg-[#10131a] border border-[#2a3140] focus:border-[#c084fc] rounded-lg p-3 text-xs text-[#eef1f6] focus:outline-none font-mono leading-relaxed resize-none"
                    />
                  </div>

                  {/* Character Bio & Expression settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1 bg-[#10131a] p-3 rounded-lg border border-[#2a3140]">
                      <span className="text-[10px] font-mono text-[#8b93a7] block">Character Bio:</span>
                      <p className="text-[#c5cdd9]">{generatedMode.description}</p>
                    </div>

                    <div className="space-y-2 bg-[#10131a] p-3 rounded-lg border border-[#2a3140]">
                      <span className="text-[10px] font-mono text-[#8b93a7] block">Tweak Emotion:</span>
                      <div className="flex flex-wrap gap-1">
                        {(["happy", "thinking", "wink", "roasting", "alert", "sleeping"] as EmotionType[]).map(
                          (exp) => (
                            <button
                              key={exp}
                              onClick={() =>
                                setGeneratedMode({ ...generatedMode, defaultExpression: exp })
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                                generatedMode.defaultExpression === exp
                                  ? "bg-[#c084fc] text-[#10131a] font-bold"
                                  : "bg-[#161b26] text-[#8b93a7] hover:text-[#eef1f6]"
                              }`}
                            >
                              {exp}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#2a3140]">
                    <div className="flex items-center gap-2">
                      {saveSuccess && (
                        <span className="text-xs font-mono text-[#5eead4] flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Saved successfully!</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveGeneratedMode(false)}
                        className="px-3.5 py-2 bg-[#1f2633] hover:bg-[#283142] border border-[#2a3140] hover:border-[#c084fc] text-[#eef1f6] font-mono text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5 text-[#c084fc]" />
                        <span>Save to Personalities</span>
                      </button>

                      <button
                        onClick={() => handleSaveGeneratedMode(true)}
                        className="px-4 py-2 bg-[#c084fc] hover:bg-[#b066f8] text-[#10131a] font-mono font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Test in Simulator Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: QUICK FAQ & SPECS */}
          {activeTab === "faq" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    q: "What is the default Admin PIN?",
                    a: "The default factory PIN is '1234'. You can unlock or change the PIN under the Security tab in the Control Panel.",
                    icon: Lock,
                    action: { label: "Open Admin PIN Tab", target: "security", type: "open_control" as const },
                  },
                  {
                    q: "How does the 'Look at Cursor' easter egg work?",
                    a: "Zonyx+ tracks your mouse pointer across the screen! Both the 3D mechanical head pivots and the IPS Color LCD eye pupils look directly at your cursor. You can toggle this with the 'Eyes Following' button in the 3D CAD HUD.",
                    icon: Eye,
                    action: { label: "View 3D Robot", target: "#model3d", type: "scroll" as const },
                  },
                  {
                    q: "What microcontroller powers Zonyx+?",
                    a: "ESP32-WROOM-32 with a 240MHz dual-core Xtensa LX6 processor, 520KB SRAM, built-in Wi-Fi & Bluetooth, and an 11.8mm slim chassis.",
                    icon: Cpu,
                    action: { label: "View Specs & Circuits", target: "#circuits", type: "scroll" as const },
                  },
                  {
                    q: "What servos are used?",
                    a: "Two SG90 9g micro-servos running PWM at 50Hz (GPIO 18 and 19). They articulate the left and right arms for waving, dancing, and posing.",
                    icon: Sliders,
                    action: { label: "Inspect Wiring", target: "#circuits", type: "scroll" as const },
                  },
                  {
                    q: "What is the total build cost?",
                    a: "Approximately ₹1,650 (~$20 USD) for the complete Bill of Materials. All modules are standard off-the-shelf maker electronics.",
                    icon: DollarSign,
                    action: { label: "Cost Calculator", target: "#calculator", type: "scroll" as const },
                  },
                  {
                    q: "Where is the Arduino C++ firmware?",
                    a: "Complete, production-ready Arduino firmware (p1_brain.ino) is displayed in the Circuits section and included in the 1-click ZIP download.",
                    icon: FileCode,
                    action: { label: "View Firmware Code", target: "#circuits", type: "scroll" as const },
                  },
                ].map((faq, i) => {
                  const Icon = faq.icon;
                  return (
                    <div
                      key={i}
                      className="bg-[#141820] border border-[#2a3140] rounded-xl p-4 space-y-2 flex flex-col justify-between hover:border-[#5eead4]/40 transition-colors"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-[#5eead4]">
                          <Icon className="w-4 h-4 shrink-0" />
                          <h4 className="font-mono text-xs font-bold text-[#eef1f6]">{faq.q}</h4>
                        </div>
                        <p className="text-xs text-[#8b93a7] leading-relaxed">{faq.a}</p>
                      </div>
                      <div className="pt-2 border-t border-[#2a3140]/60 flex justify-end">
                        <button
                          onClick={() => handleActionClick(faq.action)}
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-[#5eead4] hover:underline cursor-pointer"
                        >
                          <span>{faq.action.label}</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-[#2a3140] bg-[#141820] flex items-center justify-between text-xs font-mono text-[#8b93a7]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#5eead4] animate-pulse" />
            <span>Active Mode: <strong className="text-[#eef1f6]">{activeMode.name}</strong></span>
          </div>
          <button
            onClick={() => {
              soundFX.playClick();
              onClose();
            }}
            className="px-3 py-1 bg-[#1f2633] hover:bg-[#283142] border border-[#2a3140] text-[#eef1f6] rounded text-[11px] transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
