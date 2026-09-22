import React, { useState, useEffect } from "react";
import { soundFX } from "../../utils/soundFX";
import { hardwareSync } from "../../utils/hardwareSync";
import { HardwareTelemetry as IHardwareTelemetry, ServoPose, HardwareSyncState } from "../../types";
import {
  Battery,
  Wifi,
  Cpu,
  Activity,
  Gauge,
  Play,
  Terminal,
  Radio,
  Usb,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface HardwareTelemetryProps {
  telemetry: IHardwareTelemetry | null;
  onUpdatePose: (pose: ServoPose) => void;
  currentPose: ServoPose;
  onOpenPairingModal?: () => void;
}

export const HardwareTelemetry: React.FC<HardwareTelemetryProps> = ({
  telemetry,
  onUpdatePose,
  currentPose,
  onOpenPairingModal,
}) => {
  const [leftArm, setLeftArm] = useState(currentPose.leftArm);
  const [rightArm, setRightArm] = useState(currentPose.rightArm);
  const [syncState, setSyncState] = useState<HardwareSyncState>(hardwareSync.getState());
  const [serialLogs, setSerialLogs] = useState<string[]>([
    "[INIT] ESP32 boot sequence OK. Free heap: 184KB",
    "[I2S] INMP441 audio interface calibrated (16kHz 24-bit)",
    "[I2S] MAX98357A amplifier ready on GPIO 25/26/22",
    "[SERVO] Left SG90 (GPIO 18) & Right SG90 (GPIO 19) calibrated",
    "[LCD] ST7789 240x240 IPS display buffer active (SPI DMA)",
    "[SYNC] Ready for Web Serial or Home WiFi sync",
  ]);

  useEffect(() => {
    const unsub = hardwareSync.subscribeState(setSyncState);
    return () => {
      unsub();
    };
  }, []);

  const handleArmChange = (l: number, r: number) => {
    setLeftArm(l);
    setRightArm(r);
    soundFX.playServoMove();
    onUpdatePose({ leftArm: l, rightArm: r });
    hardwareSync.syncServoPose(l, r, "happy");
  };

  const executePresetGesture = (name: string, l: number, r: number) => {
    soundFX.playClick();
    soundFX.playServoMove();
    handleArmChange(l, r);
    setSerialLogs((prev) => [
      `[SERVO] Executing gesture "${name}" -> L:${l}° R:${r}°`,
      ...prev.slice(0, 8),
    ]);
  };

  const isConnected = syncState.status === "connected";

  return (
    <div className="space-y-6">
      {/* Hardware Sync Bridge Status Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono transition-colors ${
          isConnected
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            : "bg-[#141820] border-[#2a3140] text-[#8b93a7]"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg border ${
              isConnected
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                : "bg-amber-500/10 border-amber-500/30 text-[#f2a65a]"
            }`}
          >
            <Radio className={`w-4 h-4 ${isConnected ? "animate-pulse" : ""}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#eef1f6]">
                Physical Robot Sync:{" "}
                <span className={isConnected ? "text-emerald-400" : "text-[#f2a65a]"}>
                  {isConnected ? "HARDWARE PAIRED & ACTIVE" : "SIMULATION MODE"}
                </span>
              </span>
            </div>
            <p className="text-[11px] text-[#8b93a7]">
              {isConnected
                ? `Streaming live packets via ${syncState.connectionType.toUpperCase()} • ${syncState.packetsSent} TX packets sent`
                : "Physical robot not paired yet • Move sliders below to test in 3D simulator or click to pair physical robot"}
            </p>
          </div>
        </div>

        {onOpenPairingModal && (
          <button
            onClick={() => {
              soundFX.playClick();
              onOpenPairingModal();
            }}
            className="px-3.5 py-1.5 rounded-lg bg-[#5eead4] hover:bg-[#5eead4]/90 text-[#10131a] text-xs font-bold font-mono transition-all active:scale-95 cursor-pointer shrink-0 shadow-md shadow-[#5eead4]/20 flex items-center gap-1.5"
          >
            <Usb className="w-3.5 h-3.5" />
            <span>{isConnected ? "Manage Sync" : "Pair Physical Robot"}</span>
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">

        <div className="bg-[#141820] border border-[#2a3140] p-4">
          <div className="flex items-center justify-between text-[#8b93a7] text-xs font-mono mb-1.5">
            <span>Battery (18650)</span>
            <Battery className="w-4 h-4 text-[#5eead4]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#eef1f6]">
            {telemetry?.batteryPct || 84}%
          </div>
          <div className="text-[11px] font-mono text-[#5eead4] mt-0.5">
            {telemetry?.batteryVoltage || 4.08}V • Li-ion healthy
          </div>
        </div>

        <div className="bg-[#141820] border border-[#2a3140] p-4">
          <div className="flex items-center justify-between text-[#8b93a7] text-xs font-mono mb-1.5">
            <span>WiFi Signal</span>
            <Wifi className="w-4 h-4 text-[#5eead4]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#eef1f6]">
            {telemetry?.rssi || -58} dBm
          </div>
          <div className="text-[11px] font-mono text-[#8b93a7] mt-0.5 truncate">
            {telemetry?.wifiSSID || "Home_WiFi"}
          </div>
        </div>

        <div className="bg-[#141820] border border-[#2a3140] p-4">
          <div className="flex items-center justify-between text-[#8b93a7] text-xs font-mono mb-1.5">
            <span>ESP32 Core</span>
            <Cpu className="w-4 h-4 text-[#f2a65a]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#eef1f6]">
            {telemetry?.cpuTempC || 38.4}°C
          </div>
          <div className="text-[11px] font-mono text-[#8b93a7] mt-0.5">
            Free Heap: {telemetry?.freeHeapKb || 184} KB
          </div>
        </div>

        <div className="bg-[#141820] border border-[#2a3140] p-4">
          <div className="flex items-center justify-between text-[#8b93a7] text-xs font-mono mb-1.5">
            <span>Uptime & IP</span>
            <Activity className="w-4 h-4 text-[#c084fc]" />
          </div>
          <div className="text-lg font-bold font-mono text-[#eef1f6] truncate">
            {telemetry?.ipAddress || "192.168.1.42"}
          </div>
          <div className="text-[11px] font-mono text-[#8b93a7] mt-0.5">
            Uptime: {Math.floor((telemetry?.uptimeSecs || 1400) / 60)} min
          </div>
        </div>
      </div>

      {/* Manual Dual-Servo Calibration */}
      <div className="bg-[#141820] border border-[#2a3140] p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#2a3140]">
          <div>
            <h4 className="text-sm font-semibold font-mono text-[#5eead4] flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              Dual SG90 Servo Actuation & Gestures
            </h4>
            <p className="text-xs text-[#8b93a7] mt-0.5">
              Live test physical arm angles on GPIO 18 (left) & GPIO 19 (right). Range: -45° to 90°.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-[#10131a] border border-[#2a3140]">
            <div className="flex justify-between items-center text-xs font-mono mb-2">
              <span className="text-[#8b93a7]">Left Arm Servo (GPIO 18)</span>
              <span className="text-[#5eead4] font-bold text-sm">{leftArm}°</span>
            </div>
            <input
              type="range"
              min="-45"
              max="90"
              value={leftArm}
              onChange={(e) => handleArmChange(parseInt(e.target.value, 10), rightArm)}
              className="w-full accent-[#5eead4] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#8b93a7] mt-1">
              <span>-45° (Rest)</span>
              <span>0° (Neutral)</span>
              <span>45° (Raised)</span>
              <span>90° (Wave)</span>
            </div>
          </div>

          <div className="p-4 bg-[#10131a] border border-[#2a3140]">
            <div className="flex justify-between items-center text-xs font-mono mb-2">
              <span className="text-[#8b93a7]">Right Arm Servo (GPIO 19)</span>
              <span className="text-[#5eead4] font-bold text-sm">{rightArm}°</span>
            </div>
            <input
              type="range"
              min="-45"
              max="90"
              value={rightArm}
              onChange={(e) => handleArmChange(leftArm, parseInt(e.target.value, 10))}
              className="w-full accent-[#5eead4] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#8b93a7] mt-1">
              <span>-45° (Rest)</span>
              <span>0° (Neutral)</span>
              <span>45° (Raised)</span>
              <span>90° (Wave)</span>
            </div>
          </div>
        </div>

        {/* Action Preset buttons */}
        <div>
          <label className="block text-xs font-mono text-[#8b93a7] mb-2">
            Preset Hardware Gestures (Send to Servos)
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => executePresetGesture("Wave Hello", 0, 75)}
              className="px-3.5 py-2 text-xs font-mono bg-[#191e27] hover:bg-[#2a3140] hover:border-[#5eead4] active:scale-95 text-[#5eead4] border border-[#2a3140] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Play className="w-3 h-3" /> Wave Hello (0°, 75°)
            </button>
            <button
              onClick={() => executePresetGesture("High Five", 80, 80)}
              className="px-3.5 py-2 text-xs font-mono bg-[#191e27] hover:bg-[#2a3140] hover:border-[#f2a65a] active:scale-95 text-[#f2a65a] border border-[#2a3140] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Play className="w-3 h-3" /> High Five (80°, 80°)
            </button>
            <button
              onClick={() => executePresetGesture("Shrug", 45, 45)}
              className="px-3.5 py-2 text-xs font-mono bg-[#191e27] hover:bg-[#2a3140] hover:border-[#c084fc] active:scale-95 text-[#c084fc] border border-[#2a3140] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Play className="w-3 h-3" /> Shrug (45°, 45°)
            </button>
            <button
              onClick={() => executePresetGesture("Resting State", -20, -20)}
              className="px-3.5 py-2 text-xs font-mono bg-[#191e27] hover:bg-[#2a3140] hover:border-[#8b93a7] active:scale-95 text-[#8b93a7] border border-[#2a3140] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Play className="w-3 h-3" /> Rest (-20°, -20°)
            </button>
            <button
              onClick={() => executePresetGesture("Sassy Burn", -30, 60)}
              className="px-3.5 py-2 text-xs font-mono bg-[#191e27] hover:bg-[#2a3140] hover:border-red-400 active:scale-95 text-red-400 border border-[#2a3140] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Play className="w-3 h-3" /> Sassy Burn (-30°, 60°)
            </button>
          </div>
        </div>
      </div>

      {/* Simulated ESP32 Serial Monitor Console */}
      <div className="bg-[#10131a] border border-[#2a3140] p-4">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2a3140]">
          <div className="flex items-center gap-2 text-xs font-mono text-[#8b93a7]">
            <Terminal className="w-3.5 h-3.5 text-[#5eead4]" />
            <span>ESP32 UART0 Serial Log (115200 baud)</span>
          </div>
          <span className="text-[10px] font-mono text-[#5eead4]">Streaming Active</span>
        </div>
        <div className="font-mono text-[11px] text-[#5eead4]/90 space-y-1 max-h-36 overflow-y-auto leading-relaxed">
          {serialLogs.map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-[#8b93a7] select-none">&gt;</span>
              <span>{log}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
