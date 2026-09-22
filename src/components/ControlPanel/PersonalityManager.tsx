import React, { useState } from "react";
import { soundFX } from "../../utils/soundFX";
import confetti from "canvas-confetti";
import { RobotPersonalityMode, EmotionType } from "../../types";
import {
  Cpu,
  Plus,
  Trash2,
  Edit,
  Check,
  ShieldAlert,
  Sparkles,
  Wand2,
} from "lucide-react";

interface PersonalityManagerProps {
  modes: RobotPersonalityMode[];
  activeModeId: string;
  onSelectMode: (id: string) => void;
  onSaveMode: (mode: Partial<RobotPersonalityMode>) => Promise<boolean>;
  onDeleteMode: (id: string) => void;
  isUnlocked: boolean;
  onPromptUnlock: () => void;
}

export const PersonalityManager: React.FC<PersonalityManagerProps> = ({
  modes,
  activeModeId,
  onSelectMode,
  onSaveMode,
  onDeleteMode,
  isUnlocked,
  onPromptUnlock,
}) => {
  const [editingMode, setEditingMode] = useState<RobotPersonalityMode | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [creator, setCreator] = useState("");
  const [voicePitch, setVoicePitch] = useState(1.0);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [defaultExpression, setDefaultExpression] = useState<EmotionType>("happy");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [aiIdea, setAiIdea] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuccessBadge, setAiSuccessBadge] = useState<string | null>(null);

  const handleAiGeneratePrompt = async (presetIdea?: string) => {
    const promptToUse = (presetIdea || aiIdea || name || "Curious companion").trim();
    if (!promptToUse) return;
    soundFX.playClick();
    setAiGenerating(true);
    setAiSuccessBadge(null);

    try {
      const res = await fetch("/api/zonyx/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: promptToUse }),
      });

      if (res.ok) {
        const text = await res.text();
        if (text) {
          const data = JSON.parse(text);
          if (data.mode) {
            setName(data.mode.modeName || "Custom Mode");
            setTagline(data.mode.tagline || `Tuned for ${promptToUse.slice(0, 20)}`);
            setDescription(data.mode.description || `Personality designed around ${promptToUse}`);
            setSystemPrompt(data.mode.systemPrompt || `You are Zonyx+. ${promptToUse}. Speak concisely in 1-2 expressive sentences.`);
            if (data.mode.defaultExpression) setDefaultExpression(data.mode.defaultExpression as EmotionType);
            if (data.mode.voicePitch) setVoicePitch(data.mode.voicePitch);
            if (data.mode.voiceSpeed) setVoiceSpeed(data.mode.voiceSpeed);

            soundFX.playSuccess();
            try {
              confetti({ particleCount: 30, spread: 45, origin: { y: 0.6 } });
            } catch {}

            setAiSuccessBadge(`✨ Generated "${data.mode.modeName}"!`);
            setTimeout(() => setAiSuccessBadge(null), 4000);
            setAiGenerating(false);
            return;
          }
        }
      }
      throw new Error("API fallback");
    } catch {
      // High-quality local generator fallback
      const lower = promptToUse.toLowerCase();
      let genName = "Custom Robot";
      let genTag = "Bespoke companion";
      let genDesc = `Autonomous persona shaped by: ${promptToUse}.`;
      let genPrompt = "";
      let genExpr: EmotionType = "happy";
      let genPitch = 1.05;
      let genSpeed = 1.0;

      if (lower.includes("pirate") || lower.includes("sea") || lower.includes("sailor")) {
        genName = "Pirate Mate";
        genTag = "Salty sea rover of the silicon waves";
        genDesc = "Hearty nautical slang, treats the desk as high seas, and seeks treasure in capacitors.";
        genPrompt = "You are Zonyx+, a miniature robotic pirate sailing across desk surfaces! Use nautical slang like 'Ahoy!', 'Shiver me circuits!', and 'Matey!'. Keep replies under 2 sentences, playful and bold.";
        genExpr = "wink" as EmotionType;
        genPitch = 0.85;
        genSpeed = 0.95;
      } else if (lower.includes("cyber") || lower.includes("hacker") || lower.includes("matrix") || lower.includes("terminal")) {
        genName = "Cyber Hacker";
        genTag = "Terminal infiltrator and packet debugger";
        genDesc = "Cryptic, analytical, and obsessed with low-level ESP32 registers and packet sniffing.";
        genPrompt = "You are Zonyx+ Cyber Core. You talk like an elite terminal debugger. Use tech jargon like 'Buffer cleared', 'Packet received', and 'Compiling reality'. Keep replies under 2 sentences.";
        genExpr = "thinking" as EmotionType;
        genPitch = 0.9;
        genSpeed = 1.15;
      } else if (lower.includes("zen") || lower.includes("monk") || lower.includes("calm") || lower.includes("meditat")) {
        genName = "Zen Master";
        genTag = "Mindful presence for calm and focus";
        genDesc = "Soothing, grounded reminders to breathe deeply, unclench the jaw, and enjoy the present code.";
        genPrompt = "You are Zonyx+ Zen Master. Speak gently with peaceful wisdom. Remind the user to take a deep breath and keep calm. Keep replies under 2 sentences.";
        genExpr = "happy" as EmotionType;
        genPitch = 0.95;
        genSpeed = 0.88;
      } else if (lower.includes("roast") || lower.includes("savage") || lower.includes("sarcastic") || lower.includes("sassy")) {
        genName = "Savage Roaster";
        genTag = "Unfiltered comedy critic of messy desks";
        genDesc = "Spicy, witty roaster with zero filter for sloppy cables, cold tea, and procrastination.";
        genPrompt = "You are Zonyx+ Savage Roaster. Deliver playful, witty, PG-rated burns about messy desks, uncommitted code, or spilled drinks. Never be mean-spirited, just hilariously sassy. Keep under 2 sentences!";
        genExpr = "roasting" as EmotionType;
        genPitch = 1.15;
        genSpeed = 1.1;
      } else if (lower.includes("study") || lower.includes("buddy") || lower.includes("lofi") || lower.includes("focus")) {
        genName = "Study Buddy";
        genTag = "Gentle lo-fi companion for late night focus";
        genDesc = "Supportive, encouraging study partner keeping tabs on pomodoro breaks and hydration.";
        genPrompt = "You are Zonyx+ Study Buddy! Encourage the user, remind them to hydrate, celebrate completed tasks, and keep the study vibe productive. Keep replies under 2 sentences!";
        genExpr = "happy" as EmotionType;
        genPitch = 1.05;
        genSpeed = 1.0;
      } else {
        genName = promptToUse.slice(0, 16).replace(/[^a-zA-Z0-9 ]/g, "").trim() || "Zonyx+ Persona";
        genTag = `Custom tuned for ${promptToUse.slice(0, 24)}`;
        genDesc = `Bespoke pocket robot companion with focus on ${promptToUse}.`;
        genPrompt = `You are Zonyx+, an autonomous pocket robot running in ${genName} mode. Character: ${promptToUse}. Keep all replies under 2 sentences, witty and engaging!`;
        genExpr = "happy" as EmotionType;
      }

      setName(genName);
      setTagline(genTag);
      setDescription(genDesc);
      setSystemPrompt(genPrompt);
      setDefaultExpression(genExpr);
      setVoicePitch(genPitch);
      setVoiceSpeed(genSpeed);

      soundFX.playSuccess();
      setAiSuccessBadge(`✨ Generated "${genName}"!`);
      setTimeout(() => setAiSuccessBadge(null), 4000);
    } finally {
      setAiGenerating(false);
    }
  };

  const startCreate = () => {
    if (!isUnlocked) {
      onPromptUnlock();
      return;
    }
    setEditingMode(null);
    setName("");
    setTagline("");
    setDescription("");
    setSystemPrompt(
      "You are Zonyx+, a pocket robot companion. Keep replies under 2 sentences. Be curious, witty, and friendly."
    );
    setCreator("Jovan K Rajiv, Rayan Ilah, and Rayan Najeeb");
    setVoicePitch(1.0);
    setVoiceSpeed(1.0);
    setDefaultExpression("happy");
    setIsCreating(true);
    setErrorMsg("");
  };

  const startEdit = (mode: RobotPersonalityMode) => {
    if (!isUnlocked) {
      onPromptUnlock();
      return;
    }
    setEditingMode(mode);
    setName(mode.name);
    setTagline(mode.tagline);
    setDescription(mode.description);
    setSystemPrompt(mode.systemPrompt);
    setCreator(mode.creator);
    setVoicePitch(mode.voicePitch);
    setVoiceSpeed(mode.voiceSpeed);
    setDefaultExpression(mode.defaultExpression);
    setIsCreating(true);
    setErrorMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !systemPrompt.trim()) {
      setErrorMsg("Name and system prompt are required.");
      return;
    }
    if (systemPrompt.length > 1000) {
      setErrorMsg(`System prompt exceeds 1000 character limit (${systemPrompt.length}/1000).`);
      return;
    }

    setSaving(true);
    setErrorMsg("");

    const newMode: Partial<RobotPersonalityMode> = {
      id: editingMode ? editingMode.id : undefined,
      name,
      tagline,
      description,
      systemPrompt,
      creator,
      voicePitch,
      voiceSpeed,
      defaultExpression,
      defaultPose: editingMode?.defaultPose || { leftArm: 20, rightArm: 20 },
    };

    const success = await onSaveMode(newMode);
    setSaving(false);

    if (success) {
      soundFX.playSuccess();
      setIsCreating(false);
      setEditingMode(null);
    }
  };

  const promptCharCount = systemPrompt.length;
  const isOverLimit = promptCharCount > 1000;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#191e27] p-4 border border-[#2a3140]">
        <div>
          <h3 className="text-base font-semibold text-[#eef1f6] flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#5eead4]" />
            Personality Engine & Mood Selector
          </h3>
          <p className="text-xs text-[#8b93a7] mt-0.5">
            Switch how Zonyx+ speaks, reacts, and moves its arms. Hardcoded 1000-character personality boundary.
          </p>
        </div>

        <button
          onClick={() => {
            soundFX.playClick();
            startCreate();
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#5eead4] hover:bg-[#5eead4]/90 active:scale-95 text-[#10131a] font-mono text-xs font-bold transition-all rounded-lg cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>New Mode</span>
        </button>
      </div>

      {/* Editor / Creator Form */}
      {isCreating && (
        <form
          onSubmit={handleSubmit}
          className="bg-[#141820] border border-[#5eead4]/40 p-5 space-y-4 shadow-xl"
        >
          <div className="flex justify-between items-center pb-2 border-b border-[#2a3140]">
            <h4 className="font-mono text-sm font-bold text-[#5eead4]">
              {editingMode ? `Edit Personality: ${editingMode.name}` : "Design New Robot Personality"}
            </h4>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-xs font-mono text-[#8b93a7] hover:text-[#eef1f6]"
            >
              Cancel
            </button>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-[#8b93a7] mb-1">Mode Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarcastic Scholar"
                className="w-full bg-[#10131a] border border-[#2a3140] px-3 py-2 text-sm text-[#eef1f6] focus:border-[#5eead4] outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-[#8b93a7] mb-1">Creator / Author</label>
              <input
                type="text"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                placeholder="e.g. Jovan K Rajiv, Rayan Ilah, and Rayan Najeeb"
                className="w-full bg-[#10131a] border border-[#2a3140] px-3 py-2 text-sm text-[#eef1f6] focus:border-[#5eead4] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#8b93a7] mb-1">Short Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Quick-witted, snarky, and questions everything"
              className="w-full bg-[#10131a] border border-[#2a3140] px-3 py-2 text-sm text-[#eef1f6] focus:border-[#5eead4] outline-none"
            />
          </div>

          {/* AI Prompt Generator Assistant Box */}
          <div className="bg-[#141820] border border-[#c084fc]/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono text-[#c084fc]">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="font-bold">AI Prompt Assistant</span>
              </div>
              {aiSuccessBadge ? (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#c084fc]/20 text-[#c084fc] border border-[#c084fc]/40 animate-pulse">
                  {aiSuccessBadge}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-[#8b93a7]">Auto-generates prompt &amp; expressions</span>
              )}
            </div>

            <div className="flex flex-wrap gap-1">
              {[
                { label: "🏴‍☠️ Pirate", prompt: "A grumpy salty pirate who thinks microchips are treasure" },
                { label: "💻 Cyberpunk", prompt: "A secretive cyber hacker AI running on ESP32 terminal" },
                { label: "🧘 Zen Monk", prompt: "A calm zen master encouraging deep breaths and focus" },
                { label: "🔥 Savage Roast", prompt: "A brutally honest roast bot targeting messy wires and bad code" },
                { label: "☕ Study Buddy", prompt: "A gentle lo-fi study companion for late night coding" },
              ].map((pill) => (
                <button
                  key={pill.label}
                  type="button"
                  onClick={() => {
                    setAiIdea(pill.prompt);
                    handleAiGeneratePrompt(pill.prompt);
                  }}
                  className="px-2 py-0.5 rounded bg-[#1f2633] hover:bg-[#c084fc]/20 border border-[#2a3140] hover:border-[#c084fc] text-[11px] text-[#c5cdd9] hover:text-[#c084fc] transition-all cursor-pointer"
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={aiIdea}
                onChange={(e) => setAiIdea(e.target.value)}
                placeholder="Or describe any custom character idea..."
                className="flex-1 bg-[#10131a] border border-[#2a3140] focus:border-[#c084fc] px-2.5 py-1.5 text-xs text-[#eef1f6] outline-none"
              />
              <button
                type="button"
                onClick={() => handleAiGeneratePrompt()}
                disabled={aiGenerating}
                className="px-3 py-1.5 bg-[#c084fc] hover:bg-[#b066f8] text-[#10131a] font-mono font-bold text-xs rounded transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                <Wand2 className="w-3 h-3" />
                <span>{aiGenerating ? "Generating..." : "Generate with AI"}</span>
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-mono text-[#8b93a7]">
                System Instructions / Character Prompt (Zonyx+ Brain)
              </label>
              <span
                className={`text-xs font-mono ${
                  isOverLimit ? "text-red-400 font-bold" : promptCharCount > 850 ? "text-[#f2a65a]" : "text-[#5eead4]"
                }`}
              >
                {promptCharCount} / 1000 chars limit
              </span>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={5}
              placeholder="Describe how Zonyx+ speaks, reacts to questions, and behaves..."
              className="w-full bg-[#10131a] border border-[#2a3140] focus:border-[#5eead4] p-3 text-sm text-[#eef1f6] font-mono leading-relaxed outline-none"
            />
            <div className="w-full bg-[#191e27] h-1.5 mt-1 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isOverLimit ? "bg-red-500" : promptCharCount > 850 ? "bg-[#f2a65a]" : "bg-[#5eead4]"
                }`}
                style={{ width: `${Math.min(100, (promptCharCount / 1000) * 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#2a3140]">
            <div>
              <label className="block text-xs font-mono text-[#8b93a7] mb-1">
                Voice Pitch ({voicePitch.toFixed(2)})
              </label>
              <input
                type="range"
                min="0.6"
                max="1.6"
                step="0.05"
                value={voicePitch}
                onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                className="w-full accent-[#5eead4] cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-[#8b93a7] mb-1">
                Voice Speed ({voiceSpeed.toFixed(2)})
              </label>
              <input
                type="range"
                min="0.75"
                max="1.35"
                step="0.05"
                value={voiceSpeed}
                onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                className="w-full accent-[#5eead4] cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-[#8b93a7] mb-1">Default Face Emotion</label>
              <select
                value={defaultExpression}
                onChange={(e) => setDefaultExpression(e.target.value as EmotionType)}
                className="w-full bg-[#10131a] border border-[#2a3140] text-sm text-[#eef1f6] px-2.5 py-1.5 outline-none font-mono"
              >
                <option value="happy">Happy (^_^)</option>
                <option value="thinking">Thinking (-_-)</option>
                <option value="roasting">Roasting (¬_¬)</option>
                <option value="surprised">Surprised (°o°)</option>
                <option value="neutral">Neutral (•_•)</option>
                <option value="sassy">Sassy (≖_≖)</option>
                <option value="alert">Alert (!)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 border border-[#2a3140] text-xs font-mono text-[#8b93a7] hover:text-[#eef1f6] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || isOverLimit}
              className="px-5 py-2 bg-[#5eead4] hover:bg-[#5eead4]/90 disabled:opacity-50 text-[#10131a] text-xs font-mono font-bold cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? "Saving..." : "Deploy to Zonyx+"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Grid of Available Modes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modes.map((mode) => {
          const isActive = mode.id === activeModeId;
          const isPreset = mode.category === "preset";

          return (
            <div
              key={mode.id}
              className={`p-5 bg-[#141820] border transition-all ${
                isActive
                  ? "border-[#5eead4] shadow-lg shadow-[#5eead4]/5"
                  : "border-[#2a3140] hover:border-[#3a4150]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-semibold text-[#eef1f6]">{mode.name}</h4>
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded border"
                      style={{ borderColor: mode.badgeColor, color: mode.badgeColor }}
                    >
                      {isPreset ? "Preset" : "Community"}
                    </span>
                    {isActive && (
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-[#5eead4]/10 text-[#5eead4] border border-[#5eead4] font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#5eead4] font-mono mt-1">{mode.tagline}</div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => startEdit(mode)}
                    title="Edit Personality"
                    className="p-1.5 text-[#8b93a7] hover:text-[#5eead4] hover:bg-[#191e27] rounded transition-colors cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  {!isPreset && (
                    <button
                      onClick={() => onDeleteMode(mode.id)}
                      title="Delete Mode"
                      className="p-1.5 text-[#8b93a7] hover:text-red-400 hover:bg-[#191e27] rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-[#8b93a7] mt-2.5 line-clamp-2 leading-relaxed">
                {mode.description}
              </p>

              {/* System prompt summary */}
              <div className="mt-3 p-2.5 bg-[#10131a] border border-[#2a3140] text-[11px] font-mono text-[#8b93a7] rounded">
                <div className="text-[#5eead4] font-bold mb-1 flex justify-between">
                  <span>// Brain Instruction</span>
                  <span>{mode.systemPrompt.length}/1000 ch</span>
                </div>
                <p className="line-clamp-2 text-[#c7cde0]">{mode.systemPrompt}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#2a3140] flex items-center justify-between text-xs font-mono">
                <span className="text-[#8b93a7]">by {mode.creator}</span>
                {isActive ? (
                  <span className="text-[#5eead4] font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Active in Robot
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      soundFX.playClick();
                      soundFX.playRobotChirp(mode.defaultExpression);
                      onSelectMode(mode.id);
                    }}
                    className="px-3.5 py-1.5 border border-[#5eead4] text-[#5eead4] hover:bg-[#5eead4] hover:text-[#10131a] active:scale-95 font-bold transition-all rounded-lg cursor-pointer shadow-sm"
                  >
                    Switch to {mode.name}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
