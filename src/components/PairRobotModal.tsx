import React, { useState, useEffect, useRef } from "react";
import { soundFX } from "../utils/soundFX";
import { hardwareSync } from "../utils/hardwareSync";
import { HardwareSyncState, RgbThemeId } from "../types";
import { RGB_THEMES } from "../utils/rgbThemes";
import { RadarStatusIndicator } from "./RadarStatusIndicator";
import {
  Usb,
  Wifi,
  Radio,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Sliders,
  Play,
  Download,
  Copy,
  Check,
  X,
  Zap,
  Info,
  Layers,
  ArrowRight,
} from "lucide-react";

interface PairRobotModalProps {
  isOpen: boolean;
  onClose: () => void;
  robotName?: string;
  rgbTheme?: RgbThemeId;
  onSelectTabInControl?: (tab: "hardware" | "security") => void;
}

export const PairRobotModal: React.FC<PairRobotModalProps> = ({
  isOpen,
  onClose,
  robotName = "Zonyx+",
  rgbTheme = "cyan",
  onSelectTabInControl,
}) => {
  const [syncState, setSyncState] = useState<HardwareSyncState>(hardwareSync.getState());
  const [wifiIpInput, setWifiIpInput] = useState(hardwareSync.getWifiIp());
  const [logs, setLogs] = useState<Array<{ time: string; type: "tx" | "rx" | "info" | "err"; text: string }>>([]);
  const [manualCmd, setManualCmd] = useState('{"cmd":"sync","left":45,"right":45,"expr":"happy"}');
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<"pair" | "diagnostic" | "guide" | "terminal">("pair");
  const logContainerRef = useRef<HTMLDivElement>(null);

  const currentTheme = RGB_THEMES[rgbTheme] || RGB_THEMES.cyan;
  const isWebSerialSupported = hardwareSync.isWebSerialSupported();

  useEffect(() => {
    const unsubState = hardwareSync.subscribeState(setSyncState);
    const unsubLogs = hardwareSync.subscribeLogs((newLog) => {
      setLogs((prev) => [...prev.slice(-80), newLog]);
    });
    return () => {
      unsubState();
      unsubLogs();
    };
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isOpen) return null;

  const handleConnectSerial = async () => {
    soundFX.playClick();
    const ok = await hardwareSync.connectSerial();
    if (ok) {
      soundFX.playSuccess();
    } else {
      soundFX.playRobotChirp("roasting");
    }
  };

  const handleConnectWifi = async () => {
    soundFX.playClick();
    const ok = await hardwareSync.connectWifi(wifiIpInput);
    if (ok) {
      soundFX.playSuccess();
    } else {
      soundFX.playRobotChirp("roasting");
    }
  };

  const handleDisconnect = () => {
    soundFX.playBoop();
    hardwareSync.disconnect();
  };

  const handleSendManual = () => {
    if (!manualCmd.trim()) return;
    try {
      const parsed = JSON.parse(manualCmd);
      if (parsed.left !== undefined || parsed.right !== undefined) {
        hardwareSync.syncServoPose(parsed.left || 0, parsed.right || 0, parsed.expr || "happy", currentTheme.primary);
      } else {
        hardwareSync.log("tx", manualCmd);
      }
      soundFX.playClick();
    } catch {
      soundFX.playRobotChirp("roasting");
      hardwareSync.log("err", "Invalid JSON syntax in manual packet command");
    }
  };

  const handleRunDiagnostic = (testType: "servos" | "display" | "audio" | "wave") => {
    soundFX.playCoin();
    hardwareSync.sendTestCommand(testType);
  };

  const isConnected = syncState.status === "connected";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0e121a] border border-[#2a3140] w-full max-w-4xl h-[92vh] max-h-[820px] flex flex-col shadow-2xl overflow-hidden rounded-2xl">
        {/* Top Header */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b transition-colors duration-500"
          style={{
            backgroundColor: "#131722",
            borderColor: isConnected ? `${currentTheme.primary}40` : "#2a3140",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg border flex items-center justify-center transition-colors ${
                isConnected
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/30 text-[#f2a65a]"
              }`}
            >
              <Radio className={`w-5 h-5 ${isConnected ? "animate-pulse" : ""}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-mono text-[#eef1f6] tracking-tight">
                  {robotName} Physical Hardware Sync Center
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                    isConnected
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                      : "bg-amber-500/15 text-[#f2a65a] border-amber-500/40"
                  }`}
                >
                  {isConnected ? "Hardware Paired" : "Simulation Mode"}
                </span>
              </div>
              <p className="text-xs font-mono text-[#8b93a7]">
                {isConnected
                  ? `Live connected via ${syncState.connectionType.toUpperCase()} (${syncState.portName || syncState.ipAddress}) • ${syncState.latencyMs}ms latency`
                  : "Physical robot not connected yet • Running in high-fidelity 3D simulation"}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundFX.playClick();
              onClose();
            }}
            className="p-1.5 text-[#8b93a7] hover:text-[#eef1f6] hover:bg-[#191e27] active:scale-95 rounded-lg transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Callout Banner */}
        <div
          className={`px-4 sm:px-6 py-3 border-b text-xs font-mono flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            isConnected
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-[#141923] border-[#2a3140] text-[#a0aec0]"
          }`}
        >
          <div className="flex items-center gap-3">
            <RadarStatusIndicator
              isActive={isConnected}
              size="sm"
              connectionType={syncState.connectionType}
            />
            <div>
              {isConnected ? (
                <span>
                  <strong>Full Synchronization Active:</strong> Every slider, emotion, and AI response on this website is currently streaming live to your physical ESP32 robot!
                </span>
              ) : (
                <span>
                  <strong>Robot under construction?</strong> No problem! This website is 100% functional in Simulation Mode right now. When you complete your hardware assembly, use the pairing buttons below to connect via USB-C or WiFi!
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[11px] text-[#8b93a7]">
              TX: <strong className="text-[#eef1f6]">{syncState.packetsSent}</strong> | RX:{" "}
              <strong className="text-[#eef1f6]">{syncState.packetsReceived}</strong>
            </span>
            {isConnected && (
              <button
                onClick={handleDisconnect}
                className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-mono cursor-pointer transition-colors active:scale-95"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#2a3140] bg-[#11151f] text-xs font-mono overflow-x-auto">
          <button
            onClick={() => {
              soundFX.playClick();
              setActiveTab("pair");
            }}
            className={`flex items-center gap-2 px-4 sm:px-6 py-3 border-b-2 font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "pair"
                ? "border-[#5eead4] text-[#5eead4] bg-[#0e121a]"
                : "border-transparent text-[#8b93a7] hover:text-[#eef1f6]"
            }`}
          >
            <Usb className="w-3.5 h-3.5" />
            <span>1. Pair &amp; Connect</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              setActiveTab("guide");
            }}
            className={`flex items-center gap-2 px-4 sm:px-6 py-3 border-b-2 font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "guide"
                ? "border-[#5eead4] text-[#5eead4] bg-[#0e121a]"
                : "border-transparent text-[#8b93a7] hover:text-[#eef1f6]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. How to Sync Both</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              setActiveTab("diagnostic");
            }}
            className={`flex items-center gap-2 px-4 sm:px-6 py-3 border-b-2 font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "diagnostic"
                ? "border-[#5eead4] text-[#5eead4] bg-[#0e121a]"
                : "border-transparent text-[#8b93a7] hover:text-[#eef1f6]"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>3. Hardware Tester</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              setActiveTab("terminal");
            }}
            className={`flex items-center gap-2 px-4 sm:px-6 py-3 border-b-2 font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "terminal"
                ? "border-[#5eead4] text-[#5eead4] bg-[#0e121a]"
                : "border-transparent text-[#8b93a7] hover:text-[#eef1f6]"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>4. Live Packet Terminal ({logs.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0e121a] space-y-6">
          {/* TAB 1: PAIR & CONNECT */}
          {activeTab === "pair" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Method A: USB-C Web Serial */}
                <div className="p-5 rounded-xl bg-[#131722] border border-[#2a3140] hover:border-[#5eead4]/40 transition-all flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-[#5eead4]/10 text-[#5eead4]">
                          <Usb className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold font-mono text-[#eef1f6]">Method A: USB-C Cable (Web Serial)</h4>
                          <span className="text-[10px] font-mono text-emerald-400">Zero-Config • Plug &amp; Play</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1c2230] text-[#8b93a7]">
                        115,200 baud
                      </span>
                    </div>

                    <p className="text-xs text-[#8b93a7] mt-3 leading-relaxed">
                      Connect your physical ESP32 directly to your PC, Mac, or Chromebook via a USB-C data cable. Your browser will detect the serial port and stream bidirectional packets with 8ms latency.
                    </p>

                    <div className="mt-3 text-[11px] font-mono space-y-1">
                      <div className="flex items-center gap-2 text-[#8b93a7]">
                        <Check className="w-3.5 h-3.5 text-[#5eead4]" />
                        <span>Chrome / Edge / Opera Web Serial API</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#8b93a7]">
                        <Check className="w-3.5 h-3.5 text-[#5eead4]" />
                        <span>Streams servo angles, ST7789 screen data &amp; telemetry</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    {syncState.connectionType === "webserial" && isConnected ? (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between">
                        <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Connected to ESP32 Serial
                        </span>
                        <button
                          onClick={handleDisconnect}
                          className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-mono rounded cursor-pointer"
                        >
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleConnectSerial}
                        disabled={!isWebSerialSupported}
                        className={`w-full py-2.5 px-4 font-mono text-xs font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-95 ${
                          isWebSerialSupported
                            ? "bg-[#5eead4] hover:bg-[#5eead4]/90 text-[#0e121a] shadow-[#5eead4]/20"
                            : "bg-[#1f2633] text-[#6b7280] cursor-not-allowed"
                        }`}
                      >
                        <Usb className="w-4 h-4" />
                        <span>{isWebSerialSupported ? "Pair via USB-C (Web Serial)" : "Web Serial Not Supported in Browser"}</span>
                      </button>
                    )}
                    {!isWebSerialSupported && (
                      <p className="text-[10px] font-mono text-amber-400 mt-1.5">
                        Please open this website in Google Chrome or Microsoft Edge for native USB Web Serial support.
                      </p>
                    )}
                  </div>
                </div>

                {/* Method B: Local Home WiFi (WebSocket) */}
                <div className="p-5 rounded-xl bg-[#131722] border border-[#2a3140] hover:border-[#38bdf8]/40 transition-all flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-[#38bdf8]/10 text-[#38bdf8]">
                          <Wifi className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold font-mono text-[#eef1f6]">Method B: Home WiFi (WebSocket / IP)</h4>
                          <span className="text-[10px] font-mono text-[#38bdf8]">Wireless • Untethered Pocket Mode</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1c2230] text-[#8b93a7]">
                        Port 80/81
                      </span>
                    </div>

                    <p className="text-xs text-[#8b93a7] mt-3 leading-relaxed">
                      When your real robot is powered by its 18650 Li-ion battery, it connects to your home 2.4GHz WiFi network. Enter the IP printed in your serial monitor (e.g. 192.168.1.42).
                    </p>

                    <div className="mt-4 space-y-1.5">
                      <label className="text-[11px] font-mono text-[#8b93a7]">Physical Robot Local IP Address:</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={wifiIpInput}
                          onChange={(e) => setWifiIpInput(e.target.value)}
                          placeholder="e.g. 192.168.1.42"
                          className="flex-1 bg-[#0b0e14] border border-[#2a3140] rounded-lg px-3 py-2 text-xs font-mono text-[#eef1f6] focus:border-[#38bdf8] outline-none"
                        />
                        <button
                          onClick={handleConnectWifi}
                          className="px-3.5 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#0e121a] font-mono text-xs font-bold rounded-lg cursor-pointer transition-all active:scale-95"
                        >
                          Pair
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    {syncState.connectionType === "wifi" && isConnected ? (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between">
                        <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> WiFi Connected to {syncState.ipAddress}
                        </span>
                        <button
                          onClick={handleDisconnect}
                          className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-mono rounded cursor-pointer"
                        >
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] font-mono text-[#8b93a7] flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-[#38bdf8]" />
                        <span>Both your computer and robot must be on the same WiFi router.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Hardware Connection Quick Diagnostics with Radar */}
              <div className="p-4 rounded-xl bg-[#11151f] border border-[#2a3140] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <RadarStatusIndicator
                      isActive={isConnected}
                      size="sm"
                      connectionType={syncState.connectionType}
                    />
                    <div>
                      <h4 className="text-xs font-bold font-mono text-[#eef1f6] uppercase tracking-wider flex items-center gap-1.5">
                        ESP32 Radar Scanning &amp; Telemetry Bridge
                      </h4>
                      <span className="text-[10px] font-mono text-[#8b93a7]">
                        Active RF beam sweep • ST7789 display &amp; dual-servo telemetry stream
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#8b93a7] hidden sm:inline">
                    Updated every 40ms
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Visual Radar CRT Scope */}
                  <div className="p-3 bg-[#080d14] rounded-xl border border-[#222f3e] flex items-center gap-3.5 shrink-0">
                    <RadarStatusIndicator
                      isActive={isConnected}
                      size="lg"
                      connectionType={syncState.connectionType}
                    />
                    <div className="text-[11px] font-mono space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5eead4] animate-ping" />
                        <span className="text-[#5eead4] font-bold">RADAR FREQ: 2.4 GHz</span>
                      </div>
                      <div className="text-[10px] text-[#8b93a7]">
                        TARGET: {isConnected ? "ESP32 LOCKED [0x42A]" : "BEACON SEARCHING..."}
                      </div>
                      <div className="text-[10px] text-emerald-400">
                        BAUD: 115,200 (8-N-1)
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono flex-1 w-full">
                    <div className="p-3 rounded-lg bg-[#0b0e14] border border-[#2a3140]">
                      <div className="text-[10px] text-[#8b93a7]">Sync Status</div>
                      <div
                        className={`text-sm font-bold mt-0.5 ${
                          isConnected ? "text-emerald-400" : "text-[#f2a65a]"
                        }`}
                      >
                        {isConnected ? "ACTIVE LINK" : "SIMULATION"}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#0b0e14] border border-[#2a3140]">
                      <div className="text-[10px] text-[#8b93a7]">Packets Sent (TX)</div>
                      <div className="text-sm font-bold text-[#5eead4] mt-0.5">{syncState.packetsSent}</div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#0b0e14] border border-[#2a3140]">
                      <div className="text-[10px] text-[#8b93a7]">Packets Received (RX)</div>
                      <div className="text-sm font-bold text-[#c084fc] mt-0.5">{syncState.packetsReceived}</div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#0b0e14] border border-[#2a3140]">
                      <div className="text-[10px] text-[#8b93a7]">Link Latency</div>
                      <div className="text-sm font-bold text-emerald-400 mt-0.5">{syncState.latencyMs} ms</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HOW TO SYNC BOTH TOGETHER */}
          {activeTab === "guide" && (
            <div className="space-y-6 text-xs font-mono">
              <div className="p-4 rounded-xl bg-[#131722] border border-[#5eead4]/30 space-y-2">
                <h4 className="text-sm font-bold text-[#5eead4] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  How to Make This Website and Your Finished Robot Sync in Real Time
                </h4>
                <p className="text-[#8b93a7] text-xs leading-relaxed">
                  We designed a bi-directional serial &amp; network protocol so your physical Zonyx+ robot and this website communicate effortlessly. Here is the step-by-step procedure:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Step 1 */}
                <div className="p-4 rounded-xl bg-[#131722] border border-[#2a3140] space-y-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#5eead4]/10 text-[#5eead4] font-bold flex items-center justify-center text-xs">
                    1
                  </div>
                  <h5 className="font-bold text-[#eef1f6] text-sm">Flash the ESP32 Firmware</h5>
                  <p className="text-[#8b93a7] leading-relaxed">
                    Open Arduino IDE, select <strong>ESP32 Dev Module</strong>. Install <strong>TFT_eSPI</strong> (for 1.8" IPS Color Display), <strong>ESP32Servo</strong>, and <strong>ArduinoJson</strong>. Paste or download the firmware code from the Security tab.
                  </p>
                  <a
                    href="/api/download/ino"
                    download="Zonyx_Plus_ESP32_Firmware.ino"
                    onClick={() => soundFX.playBoop()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1c2230] hover:bg-[#252e3e] border border-[#2a3140] text-[#5eead4] text-xs cursor-pointer mt-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .INO Firmware</span>
                  </a>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-xl bg-[#131722] border border-[#2a3140] space-y-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#38bdf8]/10 text-[#38bdf8] font-bold flex items-center justify-center text-xs">
                    2
                  </div>
                  <h5 className="font-bold text-[#eef1f6] text-sm">Plug in USB-C or Turn on Battery</h5>
                  <p className="text-[#8b93a7] leading-relaxed">
                    Connect the ESP32 to your computer with a USB-C data cable (or power it from the 18650 Li-ion battery). The 1.8" IPS color screen will illuminate with waking anime eyes and a battery icon.
                  </p>
                  <div className="text-[11px] text-[#f2a65a] p-2 bg-[#0b0e14] rounded border border-[#2a3140]">
                    1.8" IPS SPI Pins: MOSI 23, SCLK 18, CS 5, DC 16
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-xl bg-[#131722] border border-[#2a3140] space-y-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#c084fc]/10 text-[#c084fc] font-bold flex items-center justify-center text-xs">
                    3
                  </div>
                  <h5 className="font-bold text-[#eef1f6] text-sm">Click "Pair" &amp; Move Sliders</h5>
                  <p className="text-[#8b93a7] leading-relaxed">
                    Click <strong>Pair via USB-C</strong> above. Immediately:
                  </p>
                  <ul className="text-[#8b93a7] space-y-1 text-[11px] list-disc list-inside">
                    <li>Moving arm sliders physically moves SG90 servos</li>
                    <li>Changing emotion changes the physical LCD eyes</li>
                    <li>AI responses stream speech and gestures to the robot</li>
                    <li>Robot battery % and temp stream back to web gauges</li>
                  </ul>
                </div>
              </div>

              {/* Packet Specification Reference */}
              <div className="p-4 rounded-xl bg-[#11151f] border border-[#2a3140] space-y-2">
                <div className="text-xs font-bold text-[#c084fc] uppercase tracking-wider">
                  Live JSON Packet Protocol Specification
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-3 bg-[#0b0e14] rounded-lg border border-[#2a3140]">
                    <div className="text-[#5eead4] font-bold mb-1">Web Station → Physical Robot (TX)</div>
                    <pre className="text-[#8b93a7] leading-relaxed overflow-x-auto">
{`{
  "cmd": "sync",
  "left": 45,        // Left arm angle (-45 to 90)
  "right": -20,      // Right arm angle (-45 to 90)
  "expr": "wink",    // happy, thinking, wink, etc.
  "rgb": "#5eead4",  // LCD accent color
  "mode": "smart"
}`}
                    </pre>
                  </div>

                  <div className="p-3 bg-[#0b0e14] rounded-lg border border-[#2a3140]">
                    <div className="text-[#f2a65a] font-bold mb-1">Physical Robot → Web Station (RX)</div>
                    <pre className="text-[#8b93a7] leading-relaxed overflow-x-auto">
{`{
  "telemetry": {
    "volts": 3.98,   // 18650 Battery Voltage
    "soc": 88,       // Battery Percentage %
    "temp": 41.2,    // ESP32 Internal Temp (°C)
    "rssi": -58,     // WiFi Signal Strength
    "uptime": 1420   // Uptime in seconds
  }
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HARDWARE DIAGNOSTIC TESTER */}
          {activeTab === "diagnostic" && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-[#131722] border border-[#2a3140] space-y-2">
                <h4 className="text-sm font-bold font-mono text-[#eef1f6] flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#5eead4]" />
                  Interactive Hardware Diagnostics
                </h4>
                <p className="text-xs font-mono text-[#8b93a7]">
                  Use these instant trigger buttons to test each physical component individually as you assemble your robot.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Servo Wave Test */}
                <div className="p-4 rounded-xl bg-[#11151f] border border-[#2a3140] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#5eead4]">Dual Servo Motor Test</span>
                    <span className="text-[10px] font-mono text-[#8b93a7]">GPIO 18 &amp; 19</span>
                  </div>
                  <p className="text-xs text-[#8b93a7]">
                    Sweeps left and right SG90 micro-servos from -30° to 75° to verify gear alignment and 50Hz PWM signal.
                  </p>
                  <button
                    onClick={() => handleRunDiagnostic("servos")}
                    className="w-full py-2 px-3 bg-[#1c2230] hover:bg-[#252e3e] border border-[#2a3140] hover:border-[#5eead4] text-[#5eead4] font-mono text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run Servo Sweep Test</span>
                  </button>
                </div>

                {/* 1.8" IPS Color Screen Test */}
                <div className="p-4 rounded-xl bg-[#11151f] border border-[#2a3140] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#c084fc]">1.8" IPS Screen Test</span>
                    <span className="text-[10px] font-mono text-[#8b93a7]">1.8" SPI IPS (RGB 65K)</span>
                  </div>
                  <p className="text-xs text-[#8b93a7]">
                    Cycles through 6 emotion eye bitmaps (happy, thinking, wink, alert, roasting) and verifies 65K color palette.
                  </p>
                  <button
                    onClick={() => handleRunDiagnostic("display")}
                    className="w-full py-2 px-3 bg-[#1c2230] hover:bg-[#252e3e] border border-[#2a3140] hover:border-[#c084fc] text-[#c084fc] font-mono text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run IPS Face Animation Test</span>
                  </button>
                </div>

                {/* Speaker Chirp Test */}
                <div className="p-4 rounded-xl bg-[#11151f] border border-[#2a3140] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#f2a65a]">MAX98357A I2S Speaker Test</span>
                    <span className="text-[10px] font-mono text-[#8b93a7]">3W 8Ω Micro-speaker</span>
                  </div>
                  <p className="text-xs text-[#8b93a7]">
                    Plays a 3-tone cheerful robotic chime over the I2S DAC amplifier to confirm audio wiring.
                  </p>
                  <button
                    onClick={() => handleRunDiagnostic("audio")}
                    className="w-full py-2 px-3 bg-[#1c2230] hover:bg-[#252e3e] border border-[#2a3140] hover:border-[#f2a65a] text-[#f2a65a] font-mono text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Play Audio Chime Test</span>
                  </button>
                </div>

                {/* Celebrate Wave Test */}
                <div className="p-4 rounded-xl bg-[#11151f] border border-[#2a3140] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-emerald-400">Full Choreography Wave</span>
                    <span className="text-[10px] font-mono text-[#8b93a7]">Servos + LCD Sync</span>
                  </div>
                  <p className="text-xs text-[#8b93a7]">
                    Simultaneously waves both arms, winks on the color LCD, and beeps a celebratory maker greeting.
                  </p>
                  <button
                    onClick={() => handleRunDiagnostic("wave")}
                    className="w-full py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run Full Choreography</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LIVE PACKET TERMINAL */}
          {activeTab === "terminal" && (
            <div className="space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#8b93a7] text-xs">
                  Real-time Serial &amp; WebSocket Packet Monitor (TX/RX)
                </span>
                <button
                  onClick={() => setLogs([])}
                  className="px-2.5 py-1 rounded bg-[#191e27] hover:bg-[#252e3e] text-[#8b93a7] hover:text-[#eef1f6] text-[11px] cursor-pointer"
                >
                  Clear Terminal
                </button>
              </div>

              {/* Log window */}
              <div
                ref={logContainerRef}
                className="h-80 bg-[#07090e] border border-[#2a3140] rounded-xl p-3.5 overflow-y-auto space-y-1.5 scrollbar-thin text-[11px]"
              >
                {logs.length === 0 ? (
                  <div className="text-[#4b5563] italic">No packets yet. Click 'Pair' or move the 3D model to stream commands.</div>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2 leading-tight">
                      <span className="text-[#4b5563] shrink-0">[{log.time}]</span>
                      <span
                        className={`font-bold shrink-0 uppercase text-[10px] px-1 rounded ${
                          log.type === "tx"
                            ? "bg-[#5eead4]/15 text-[#5eead4]"
                            : log.type === "rx"
                            ? "bg-[#c084fc]/15 text-[#c084fc]"
                            : log.type === "err"
                            ? "bg-red-500/15 text-red-400"
                            : "bg-blue-500/15 text-blue-400"
                        }`}
                      >
                        {log.type}
                      </span>
                      <span
                        className={`break-all ${
                          log.type === "tx"
                            ? "text-[#5eead4]"
                            : log.type === "rx"
                            ? "text-[#eef1f6]"
                            : log.type === "err"
                            ? "text-red-300"
                            : "text-[#8b93a7]"
                        }`}
                      >
                        {log.text}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Manual Command Injector */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] text-[#8b93a7]">Inject Custom JSON Packet to Robot:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCmd}
                    onChange={(e) => setManualCmd(e.target.value)}
                    className="flex-1 bg-[#0b0e14] border border-[#2a3140] rounded-lg px-3 py-2 text-xs text-[#eef1f6] focus:border-[#5eead4] outline-none"
                  />
                  <button
                    onClick={handleSendManual}
                    className="px-4 py-2 bg-[#5eead4] hover:bg-[#5eead4]/90 text-[#0e121a] font-bold rounded-lg cursor-pointer transition-all active:scale-95"
                  >
                    Send Packet
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
