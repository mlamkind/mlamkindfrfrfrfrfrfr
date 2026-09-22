import React, { useState, useEffect } from "react";
import { soundFX } from "../../utils/soundFX";
import {
  HardwareTelemetry as IHardwareTelemetry,
  RobotPersonalityMode,
  CommunitySuggestion,
  ServoPose,
} from "../../types";
import {
  X,
  RotateCw,
  Cpu,
  Gauge,
  Shield,
  Lightbulb,
  MessageSquare,
  Lock,
  LockOpen,
  Wifi,
  Edit3,
} from "lucide-react";
import { ChatSimulator } from "./ChatSimulator";
import { PersonalityManager } from "./PersonalityManager";
import { HardwareTelemetry } from "./HardwareTelemetry";
import { FirmwareAndSecurity } from "./FirmwareAndSecurity";
import { SuggestionsBoard } from "./SuggestionsBoard";

interface ControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: IHardwareTelemetry | null;
  modes: RobotPersonalityMode[];
  activeMode: RobotPersonalityMode;
  suggestions: CommunitySuggestion[];
  isUnlocked: boolean;
  robotName?: string;
  initialTab?: "chat" | "personalities" | "hardware" | "security" | "feedback";
  onOpenRename?: () => void;
  onOpenPairRobot?: () => void;
  onSelectMode: (id: string) => void;
  onSaveMode: (mode: Partial<RobotPersonalityMode>) => Promise<boolean>;
  onDeleteMode: (id: string) => void;
  onVerifyPin: (pin: string) => Promise<boolean>;
  onChangePin: (currentPin: string, newPin: string) => Promise<boolean>;
  onAddSuggestion: (sug: Omit<CommunitySuggestion, "id" | "upvotes" | "status" | "createdAt">) => Promise<void>;
  onUpvoteSuggestion: (id: string) => void;
  onRefreshTelemetry: () => void;
}

export const ControlModal: React.FC<ControlModalProps> = ({
  isOpen,
  onClose,
  telemetry,
  modes,
  activeMode,
  suggestions,
  isUnlocked,
  robotName = "Zonyx+",
  initialTab = "chat",
  onOpenRename,
  onOpenPairRobot,
  onSelectMode,
  onSaveMode,
  onDeleteMode,
  onVerifyPin,
  onChangePin,
  onAddSuggestion,
  onUpvoteSuggestion,
  onRefreshTelemetry,
}) => {
  const [activeTab, setActiveTab] = useState<"chat" | "personalities" | "hardware" | "security" | "feedback">(initialTab);
  const [currentPose, setCurrentPose] = useState<ServoPose>(activeMode.defaultPose);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#10131a] border border-[#2a3140] w-full max-w-5xl h-[94vh] max-h-[850px] flex flex-col shadow-2xl overflow-hidden rounded-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2a3140] bg-[#141820]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5eead4] animate-pulse" />
              <h2 className="font-mono text-sm sm:text-base font-bold text-[#eef1f6] tracking-tight">
                {robotName} Pocket Robot Control
              </h2>
            </div>
            {onOpenRename && (
              <button
                onClick={() => {
                  soundFX.playClick();
                  onOpenRename();
                }}
                className="hidden sm:flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border border-[#2a3140] hover:border-[#5eead4] text-[#8b93a7] hover:text-[#5eead4] transition-all cursor-pointer"
                title="Change robot name"
              >
                <Edit3 className="w-3 h-3" />
                <span>Rename</span>
              </button>
            )}
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono bg-[#191e27] border border-[#2a3140] text-[#5eead4]">
              <Wifi className="w-3 h-3" />
              <span>192.168.1.42</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                soundFX.playClick();
                setActiveTab("security");
              }}
              className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded border transition-all active:scale-95 cursor-pointer ${
                isUnlocked
                  ? "border-[#5eead4]/50 bg-[#5eead4]/10 text-[#5eead4]"
                  : "border-[#f2a65a]/50 bg-[#f2a65a]/10 text-[#f2a65a]"
              }`}
              title="Security Status (Click to manage PIN)"
            >
              {isUnlocked ? <LockOpen className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              <span className="hidden md:inline">{isUnlocked ? "Admin Mode" : "Guest Mode"}</span>
            </button>

            <button
              onClick={() => {
                soundFX.playClick();
                onRefreshTelemetry();
              }}
              title="Refresh ESP32 Telemetry"
              className="p-1.5 text-[#8b93a7] hover:text-[#5eead4] hover:bg-[#191e27] active:scale-90 rounded transition-all cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                soundFX.playClick();
                onClose();
              }}
              className="p-1.5 text-[#8b93a7] hover:text-[#eef1f6] hover:bg-[#191e27] active:scale-90 rounded transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#2a3140] bg-[#191e27] overflow-x-auto text-xs font-mono">
          <button
            onClick={() => {
              soundFX.playClick();
              setActiveTab("chat");
            }}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === "chat"
                ? "border-[#5eead4] text-[#5eead4] bg-[#141820]"
                : "border-transparent text-[#8b93a7] hover:text-[#eef1f6]"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>AI Brain &amp; Live Chat</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              setActiveTab("personalities");
            }}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === "personalities"
                ? "border-[#5eead4] text-[#5eead4] bg-[#141820]"
                : "border-transparent text-[#8b93a7] hover:text-[#eef1f6]"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Personalities ({modes.length})</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              setActiveTab("hardware");
            }}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === "hardware"
                ? "border-[#5eead4] text-[#5eead4] bg-[#141820]"
                : "border-transparent text-[#8b93a7] hover:text-[#eef1f6]"
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Live Telemetry</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              setActiveTab("security");
            }}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === "security"
                ? "border-[#5eead4] text-[#5eead4] bg-[#141820]"
                : "border-transparent text-[#8b93a7] hover:text-[#eef1f6]"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Firmware &amp; Security</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              setActiveTab("feedback");
            }}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === "feedback"
                ? "border-[#5eead4] text-[#5eead4] bg-[#141820]"
                : "border-transparent text-[#8b93a7] hover:text-[#eef1f6]"
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Community Wishlist ({suggestions.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#10131a]">
          {activeTab === "chat" && (
            <ChatSimulator
              activeMode={activeMode}
              robotName={robotName}
              onUpdateEmotion={(_expr, pose) => setCurrentPose(pose)}
            />
          )}

          {activeTab === "personalities" && (
            <PersonalityManager
              modes={modes}
              activeModeId={activeMode.id}
              onSelectMode={onSelectMode}
              onSaveMode={onSaveMode}
              onDeleteMode={onDeleteMode}
              isUnlocked={isUnlocked}
              onPromptUnlock={() => setActiveTab("security")}
            />
          )}

          {activeTab === "hardware" && (
            <HardwareTelemetry
              telemetry={telemetry}
              onUpdatePose={(p) => setCurrentPose(p)}
              currentPose={currentPose}
              onOpenPairingModal={onOpenPairRobot}
            />
          )}

          {activeTab === "security" && (
            <FirmwareAndSecurity
              isUnlocked={isUnlocked}
              onVerifyPin={onVerifyPin}
              onChangePin={onChangePin}
              robotName={robotName}
              modes={modes}
              activeMode={activeMode}
              telemetry={telemetry}
              suggestions={suggestions}
            />
          )}

          {activeTab === "feedback" && (
            <SuggestionsBoard
              suggestions={suggestions}
              onAddSuggestion={onAddSuggestion}
              onUpvote={onUpvoteSuggestion}
            />
          )}
        </div>
      </div>
    </div>
  );
};
