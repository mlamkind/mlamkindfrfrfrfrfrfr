import React, { useState, useEffect } from "react";
import { soundFX } from "../utils/soundFX";
import { X, Check, RotateCcw, Bot, Sparkles } from "lucide-react";

interface RenameRobotModalProps {
  isOpen: boolean;
  currentName: string;
  onClose: () => void;
  onSaveName: (newName: string) => void;
}

const PRESET_NAMES = [
  "Zonyx+",
  "Aura",
  "Bolt",
  "Nova",
  "Echo",
  "Pixel",
];

export const RenameRobotModal: React.FC<RenameRobotModalProps> = ({
  isOpen,
  currentName,
  onClose,
  onSaveName,
}) => {
  const [nameInput, setNameInput] = useState(currentName || "Zonyx+");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setNameInput(currentName || "Zonyx+");
      setError("");
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nameInput.trim();
    if (!cleanName) {
      setError("Please enter a valid robot name.");
      soundFX.playRobotChirp("roasting");
      return;
    }
    if (cleanName.length > 25) {
      setError("Robot name cannot exceed 25 characters.");
      return;
    }
    soundFX.playSuccess();
    onSaveName(cleanName);
    onClose();
  };

  const handleSelectPreset = (preset: string) => {
    soundFX.playBoop();
    setNameInput(preset);
    setError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#141820] border border-[#5eead4]/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2a3140] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#5eead4]/15 border border-[#5eead4]/30 flex items-center justify-center text-[#5eead4]">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-mono text-sm sm:text-base font-bold text-[#eef1f6]">
                Rename Your Robot
              </h3>
              <p className="text-xs text-[#8b93a7] font-mono">
                Default: <span className="text-[#5eead4] font-bold">Zonyx+</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundFX.playClick();
              onClose();
            }}
            className="p-1.5 text-[#8b93a7] hover:text-[#eef1f6] hover:bg-[#191e27] rounded transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Preview of Face Screen Tag */}
        <div className="p-4 bg-[#0d1017] rounded-xl border border-[#2a3140] text-center space-y-2">
          <div className="text-[10px] font-mono text-[#8b93a7] uppercase tracking-widest">
            1.8" IPS Display Screen Preview
          </div>
          <div className="inline-block px-5 py-2.5 bg-[#06080c] border border-[#5eead4] rounded-lg shadow-inner">
            <div className="text-[10px] font-mono text-[#5eead4]/70 flex items-center justify-between gap-6">
              <span>{nameInput.trim() || "Zonyx+"} // 84%</span>
              <span>WiFi: OK</span>
            </div>
            <div className="text-lg font-mono text-[#5eead4] font-bold mt-1 tracking-wider">
              ^ ⏝ ^
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-[#8b93a7] mb-1.5">
              Custom Robot Name (e.g. Zonyx+, Aura, Bolt):
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                maxLength={25}
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter robot name..."
                className="w-full bg-[#10131a] border border-[#2a3140] focus:border-[#5eead4] px-4 py-2.5 rounded-lg text-sm text-[#eef1f6] font-mono outline-none transition-all placeholder-[#8b93a7]/50"
              />
              <span className="absolute right-3 top-2.5 text-xs font-mono text-[#8b93a7]">
                {nameInput.length}/25
              </span>
            </div>
            {error && (
              <p className="mt-1 text-xs font-mono text-red-400">{error}</p>
            )}
          </div>

          {/* Quick Preset Names */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono text-[#8b93a7] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#5eead4]" />
              <span>Quick Suggestions:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_NAMES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`px-2.5 py-1 text-xs font-mono rounded border transition-all cursor-pointer active:scale-95 ${
                    nameInput.toLowerCase() === preset.toLowerCase()
                      ? "bg-[#5eead4] border-[#5eead4] text-[#10131a] font-bold"
                      : "bg-[#10131a] hover:bg-[#191e27] border-[#2a3140] text-[#8b93a7] hover:text-[#5eead4]"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-[#2a3140]">
            <button
              type="button"
              onClick={() => handleSelectPreset("Zonyx+")}
              className="flex items-center gap-1 text-xs font-mono text-[#8b93a7] hover:text-[#5eead4] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to "Zonyx+"</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  onClose();
                }}
                className="px-4 py-2 text-xs font-mono text-[#8b93a7] hover:text-[#eef1f6] border border-[#2a3140] rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#5eead4] hover:bg-[#5eead4]/90 text-[#10131a] font-mono text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-[#5eead4]/20 active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Name</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
