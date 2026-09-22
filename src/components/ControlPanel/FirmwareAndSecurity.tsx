import React, { useState, useRef } from "react";
import { soundFX } from "../../utils/soundFX";
import confetti from "canvas-confetti";
import {
  HardwareTelemetry as IHardwareTelemetry,
  RobotPersonalityMode,
  CommunitySuggestion,
} from "../../types";
import {
  Lock,
  LockOpen,
  Copy,
  Check,
  Download,
  Terminal,
  Cpu,
  FolderArchive,
  FileJson,
  Upload,
  Sparkles,
} from "lucide-react";

interface FirmwareAndSecurityProps {
  isUnlocked: boolean;
  onVerifyPin: (pin: string) => Promise<boolean>;
  onChangePin: (currentPin: string, newPin: string) => Promise<boolean>;
  robotName?: string;
  modes?: RobotPersonalityMode[];
  activeMode?: RobotPersonalityMode;
  telemetry?: IHardwareTelemetry | null;
  suggestions?: CommunitySuggestion[];
  onRestoreConfig?: (config: any) => void;
}

export const FirmwareAndSecurity: React.FC<FirmwareAndSecurityProps> = ({
  isUnlocked,
  onVerifyPin,
  onChangePin,
  robotName = "Zonyx+",
  modes = [],
  activeMode,
  telemetry,
  suggestions = [],
  onRestoreConfig,
}) => {
  const [pinInput, setPinInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [copied, setCopied] = useState(false);
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate & Download App Configuration JSON
  const handleDownloadAppConfig = () => {
    soundFX.playSuccess();
    try {
      confetti({
        particleCount: 35,
        spread: 50,
        origin: { y: 0.6 },
        colors: ["#5eead4", "#f2a65a", "#c084fc"],
      });
    } catch {
      // non-blocking
    }

    const configPayload = {
      appName: "Zonyx+ Pocket Robot Station",
      robotName,
      appVersion: "1.4.2",
      exportedAt: new Date().toISOString(),
      timestamp: Date.now(),
      activeModeId: activeMode?.id || "smart",
      personalityModes: modes,
      hardwareState: {
        telemetry: telemetry || {
          socPercent: 88,
          batteryVoltage: 3.98,
          cpuTempC: 41.2,
          wifiRssi: -58,
          i2sSampleRate: 16000,
          leftServoAngle: 20,
          rightServoAngle: 45,
          currentExpression: "happy",
        },
        servos: {
          leftGpio: 18,
          rightGpio: 19,
          frequencyHz: 50,
        },
        screen: {
          driver: "SSD1306",
          bus: "I2C",
          address: "0x3C",
          resolution: "128x64",
        },
      },
      security: {
        adminUnlocked: isUnlocked,
        accessControlMode: "PIN_PROTECTED",
      },
      communityFeedback: suggestions,
      notes: "This backup file contains complete state and configurations for Zonyx+. You can restore it anytime in the settings panel.",
    };

    const jsonString = JSON.stringify(configPayload, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = robotName.toLowerCase().replace(/[^a-z0-9]/g, "_") || "p1_robot";
    a.href = url;
    a.download = `${safeName}_config_backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setBackupDownloaded(true);
    setTimeout(() => setBackupDownloaded(false), 3500);
  };

  // Restore Configuration from imported JSON
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || (!parsed.personalityModes && !parsed.robotName)) {
          throw new Error("Invalid configuration schema");
        }

        soundFX.playSuccess();
        try {
          confetti({ particleCount: 45, spread: 60 });
        } catch {}

        if (parsed.robotName) {
          localStorage.setItem("p1_robot_name", parsed.robotName);
        }
        if (Array.isArray(parsed.personalityModes)) {
          localStorage.setItem("p1_personality_modes", JSON.stringify(parsed.personalityModes));
        }

        setRestoreStatus(`Successfully restored backup from ${new Date(parsed.exportedAt || Date.now()).toLocaleDateString()}! Refreshing in 1s...`);
        if (onRestoreConfig) {
          onRestoreConfig(parsed);
        }
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } catch (err) {
        soundFX.playRobotChirp("roasting");
        setRestoreStatus("Error reading configuration JSON. Please select a valid backup file.");
      }
    };
    reader.readAsText(file);
  };

  const sampleFirmware = `// ============================================================================
// ZONYX+ POCKET ROBOT — OFFICIAL ESP32 DUAL-MODE CLIENT FIRMWARE (v1.5.0)
// Designed by Jovan K Rajiv, Rayan Ilah, and Rayan Najeeb
// 
// HARDWARE ARCHITECTURE:
// - Brain: ESP32-WROOM-32D / ESP32-S3 (Dual-Core 240MHz, 4MB Flash)
// - Facial Display: 1.8" IPS Color Display (ST7735 / ST7789 SPI)
// - Actuators: Dual SG90 9g Micro-Servos (Left Arm: GPIO 18, Right Arm: GPIO 19)
// - Microphone: INMP441 I2S MEMS Mic (SCK: 32, WS: 33, SD: 35)
// - Audio Out: MAX98357A I2S DAC Amp + 3W 8-Ohm Micro Speaker (BCLK: 26, LRC: 25, DIN: 22)
// - Power: 18650 Li-ion 2500mAh 3.7V + TP4056 USB-C Charging + ADC Batt (GPIO 34)
//
// SYNC INTERFACES:
// 1. USB-C Web Serial (115,200 baud) — Plug into browser & sync instantly!
// 2. WiFi WebSocket (Port 81) & REST API (Port 80) — Untethered home pocket sync.
// ============================================================================

#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>

#define TFT_CS    5    // Display Chip Select
#define TFT_DC   16    // Display Data/Command
#define TFT_RST   4    // Display Reset
#define TFT_MOSI 23    // Hardware SPI MOSI
#define TFT_SCLK 18    // Hardware SPI Clock

#define SERVO_LEFT_PIN   14   // SG90 Left Arm PWM
#define SERVO_RIGHT_PIN  12   // SG90 Right Arm PWM
#define BATT_ADC_PIN     34   // Battery Voltage Divider (100k + 100k)

const char* WIFI_SSID     = "YOUR_HOME_WIFI_2.4G";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

Adafruit_ST7789 tft = Adafruit_ST7789(TFT_CS, TFT_DC, TFT_RST);
Servo servoLeft;
Servo servoRight;
WebServer server(80);
WebSocketsServer webSocket(81);

int targetLeftAngle = 90;
int targetRightAngle = 90;
int currentLeftAngle = 90;
int currentRightAngle = 90;
String currentEmotion = "happy";
uint16_t currentEyeColor = ST77XX_CYAN;
unsigned long lastTelemetrySend = 0;
unsigned long lastBlinkTime = 0;

void drawEye(int cx, int cy, int rx, int ry, String emotion, uint16_t color) {
  if (emotion == "sleeping") {
    tft.drawFastHLine(cx - rx, cy, rx * 2, color);
    tft.drawFastHLine(cx - rx, cy + 1, rx * 2, color);
    return;
  }
  if (emotion == "wink" && cx > 120) {
    tft.drawFastHLine(cx - rx + 4, cy, (rx * 2) - 8, color);
    tft.drawFastHLine(cx - rx + 4, cy + 1, (rx * 2) - 8, color);
    return;
  }
  tft.fillRoundRect(cx - rx, cy - ry, rx * 2, ry * 2, 14, color);
  tft.fillRoundRect(cx - (rx / 2), cy - (ry / 2), rx, ry, 8, ST77XX_BLACK);
  tft.fillCircle(cx - (rx / 3), cy - (ry / 3), 4, ST77XX_WHITE);
  tft.fillCircle(cx + (rx / 4), cy + (ry / 4), 2, ST77XX_WHITE);
}

void renderFace(String emotion, uint16_t accentColor) {
  tft.fillScreen(ST77XX_BLACK);
  tft.setTextSize(1);
  tft.setTextColor(0x7BEF);
  tft.setCursor(8, 8);
  tft.print("ZONYX+");
  tft.setCursor(185, 8);
  tft.print(WiFi.status() == WL_CONNECTED ? "WIFI OK" : "USB SYNC");

  drawEye(68, 115, 26, 36, emotion, accentColor);
  drawEye(172, 115, 26, 36, emotion, accentColor);

  if (emotion == "happy" || emotion == "wink") {
    tft.fillRoundRect(38, 155, 18, 8, 4, 0xF81F);
    tft.fillRoundRect(184, 155, 18, 8, 4, 0xF81F);
  }
  if (emotion == "happy") {
    tft.drawCircle(120, 150, 10, accentColor);
    tft.fillRect(108, 138, 24, 12, ST77XX_BLACK);
  } else if (emotion == "thinking") {
    tft.fillCircle(120, 155, 4, accentColor);
  } else if (emotion == "roasting") {
    tft.drawFastHLine(110, 155, 20, accentColor);
    tft.drawFastHLine(110, 156, 20, accentColor);
  }
}

void processJsonPacket(String jsonStr) {
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, jsonStr);
  if (err) return;

  const char* cmd = doc["cmd"];
  if (!cmd) return;

  if (strcmp(cmd, "sync") == 0) {
    if (doc.containsKey("left")) {
      int leftDeg = doc["left"];
      targetLeftAngle = constrain(map(leftDeg, -45, 90, 0, 180), 0, 180);
    }
    if (doc.containsKey("right")) {
      int rightDeg = doc["right"];
      targetRightAngle = constrain(map(rightDeg, -45, 90, 0, 180), 0, 180);
    }
    if (doc.containsKey("expr")) {
      String expr = doc["expr"].as<String>();
      if (expr != currentEmotion) {
        currentEmotion = expr;
        renderFace(currentEmotion, currentEyeColor);
      }
    }
    Serial.println("{\\"status\\":\\"ok\\",\\"synced\\":true}");
  }
  else if (strcmp(cmd, "test") == 0) {
    const char* testType = doc["type"];
    if (strcmp(testType, "servos") == 0) {
      servoLeft.write(45);
      servoRight.write(135);
      delay(300);
      servoLeft.write(135);
      servoRight.write(45);
      delay(300);
      servoLeft.write(90);
      servoRight.write(90);
    } else if (strcmp(testType, "display") == 0) {
      renderFace("wink", ST77XX_MAGENTA);
      delay(600);
      renderFace("happy", ST77XX_CYAN);
    }
  }
}

void broadcastTelemetry() {
  int rawAdc = analogRead(BATT_ADC_PIN);
  float voltage = (rawAdc / 4095.0) * 3.3 * 2.0 * 1.05;
  int soc = constrain((int)((voltage - 3.2) / (4.2 - 3.2) * 100), 0, 100);

  StaticJsonDocument<256> tDoc;
  JsonObject t = tDoc.createNestedObject("telemetry");
  t["volts"] = (int)(voltage * 100) / 100.0;
  t["soc"] = soc;
  t["temp"] = (int)(temperatureRead() * 10) / 10.0;
  t["rssi"] = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0;
  t["uptime"] = millis() / 1000;
  t["left"] = currentLeftAngle;
  t["right"] = currentRightAngle;

  String output;
  serializeJson(tDoc, output);
  Serial.println(output);
  if (webSocket.connectedClients() > 0) {
    webSocket.broadcastTXT(output);
  }
}

void setup() {
  Serial.begin(115200);
  tft.init(240, 240);
  tft.setRotation(2);
  renderFace("happy", currentEyeColor);

  servoLeft.attach(SERVO_LEFT_PIN, 500, 2400);
  servoRight.attach(SERVO_RIGHT_PIN, 500, 2400);
  servoLeft.write(90);
  servoRight.write(90);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long startWifi = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startWifi < 5000) {
    delay(200);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    server.on("/api/ping", []() {
      server.send(200, "application/json", "{\\"status\\":\\"online\\",\\"robot\\":\\"Zonyx+\\"}");
    });
    server.begin();
    webSocket.begin();
    webSocket.onEvent([](uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
      if (type == WStype_TEXT) {
        processJsonPacket(String((char*)payload));
      }
    });
  }
  Serial.println("{\\"ready\\":true,\\"robot\\":\\"Zonyx+\\",\\"version\\":\\"1.5.0\\"}");
}

void loop() {
  if (Serial.available()) {
    String line = Serial.readStringUntil('\\\\n');
    line.trim();
    if (line.length() > 0) {
      processJsonPacket(line);
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
    server.handleClient();
    webSocket.loop();
  }

  if (currentLeftAngle < targetLeftAngle) currentLeftAngle += 2;
  else if (currentLeftAngle > targetLeftAngle) currentLeftAngle -= 2;

  if (currentRightAngle < targetRightAngle) currentRightAngle += 2;
  else if (currentRightAngle > targetRightAngle) currentRightAngle -= 2;

  servoLeft.write(currentLeftAngle);
  servoRight.write(currentRightAngle);

  if (millis() - lastBlinkTime > 4500 && currentEmotion == "happy") {
    lastBlinkTime = millis();
    drawEye(68, 115, 26, 36, "sleeping", currentEyeColor);
    drawEye(172, 115, 26, 36, "sleeping", currentEyeColor);
    delay(140);
    drawEye(68, 115, 26, 36, "happy", currentEyeColor);
    drawEye(172, 115, 26, 36, "happy", currentEyeColor);
  }

  if (millis() - lastTelemetrySend > 500) {
    lastTelemetrySend = millis();
    broadcastTelemetry();
  }
  delay(15);
}`;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    const ok = await onVerifyPin(pinInput);
    if (ok) {
      soundFX.playSuccess();
      setSuccessMsg("Access granted! Full admin privileges enabled.");
      setPinInput("");
    } else {
      soundFX.playRobotChirp("roasting");
      setErrorMsg("Incorrect PIN. (Default WiFi control PIN is 1234)");
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    const ok = await onChangePin(currentPin, newPin);
    if (ok) {
      soundFX.playSuccess();
      setSuccessMsg("Security PIN successfully updated.");
      setCurrentPin("");
      setNewPin("");
    } else {
      setErrorMsg("Failed to change PIN. Verify your current PIN.");
    }
  };

  const copyCode = () => {
    soundFX.playBoop();
    navigator.clipboard.writeText(sampleFirmware);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* App Configuration & Offline Backup Card */}
      <div className="bg-gradient-to-r from-[#141820] to-[#1c2230] border border-[#5eead4]/50 rounded-xl p-5 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-[#5eead4]/15 text-[#5eead4] shrink-0 mt-0.5">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold font-mono text-[#eef1f6]">
                  App Configuration &amp; Offline Backup
                </h4>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#5eead4]/10 text-[#5eead4] border border-[#5eead4]/30">
                  .JSON
                </span>
              </div>
              <p className="text-xs font-mono text-[#8b93a7] mt-0.5 leading-relaxed">
                Serializes current robot settings (<span className="text-[#5eead4]">{robotName}</span>), {modes.length} personality modes, servo calibrations, and app state for instant offline backup.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadAppConfig}
              title="Export complete state as JSON"
              className="px-4 py-2.5 bg-[#5eead4] hover:bg-[#5eead4]/90 text-[#10131a] font-mono text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-[#5eead4]/20"
            >
              <Download className="w-4 h-4" />
              <span>{backupDownloaded ? "Downloaded!" : "Download App Configuration"}</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              title="Import and restore from backup JSON"
              className="px-3 py-2.5 bg-[#191e27] hover:bg-[#2a3140] border border-[#2a3140] hover:border-[#5eead4] text-[#eef1f6] font-mono text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-[#8b93a7]" />
              <span>Restore</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {restoreStatus && (
          <div className="p-2.5 bg-[#191e27] border border-[#5eead4]/40 rounded text-xs font-mono text-[#5eead4] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#5eead4] shrink-0" />
            <span>{restoreStatus}</span>
          </div>
        )}
      </div>

      {/* 1-Click Project Download Hero Banner */}
      <div className="bg-gradient-to-r from-[#141820] to-[#191e27] border border-[#2a3140] hover:border-[#5eead4]/40 rounded-xl p-5 shadow-lg space-y-3 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-[#5eead4]/10 text-[#5eead4] shrink-0 mt-0.5">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold font-mono text-[#eef1f6]">GitHub-Ready Project Archive (.ZIP)</h4>
              <p className="text-xs font-mono text-[#8b93a7] mt-0.5">
                Complete package with README.md, MIT License, 3D CAD viewer, Express API, FreeRTOS firmware & config files.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <a
              href="/api/download/offline-app"
              download="zonyx-plus-robot-run-offline.zip"
              onClick={() => soundFX.playTaDa()}
              title="Download standalone offline bundle (runs in any browser without internet)"
              className="px-3.5 py-2.5 bg-[#191e27] hover:bg-[#2a3140] border border-[#2a3140] hover:border-[#fbbf24] text-[#fbbf24] font-mono text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Download className="w-4 h-4 text-[#fbbf24]" />
              <span>Offline Bundle (.ZIP)</span>
            </a>

            <a
              href="/api/download/source-zip"
              download="zonyx-plus-pocket-robot-source.zip"
              onClick={() => soundFX.playBoop()}
              className="px-4 py-2.5 bg-[#191e27] hover:bg-[#2a3140] border border-[#2a3140] hover:border-[#5eead4] text-[#eef1f6] font-mono text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 shrink-0"
            >
              <Download className="w-4 h-4 text-[#5eead4]" />
              <span>Source ZIP</span>
            </a>
          </div>
        </div>
      </div>

      {/* PIN Security Section */}
      <div className="bg-[#141820] border border-[#2a3140] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#2a3140]">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded ${isUnlocked ? "bg-[#5eead4]/10 text-[#5eead4]" : "bg-amber-500/10 text-[#f2a65a]"}`}>
              {isUnlocked ? <LockOpen className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-sm font-semibold font-mono text-[#eef1f6]">Device Access Security & Control Lock</h4>
              <p className="text-xs text-[#8b93a7]">
                {isUnlocked
                  ? "Unlocked: You have full permissions to rewrite personality prompts, deploy gestures, and modify hardware settings."
                  : "Locked: Guest access mode. Enter your home WiFi access PIN to enable full configuration."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded border ${
                isUnlocked
                  ? "bg-[#5eead4]/10 border-[#5eead4] text-[#5eead4]"
                  : "bg-amber-500/10 border-[#f2a65a] text-[#f2a65a]"
              }`}
            >
              {isUnlocked ? "ADMIN UNLOCKED" : "PIN PROTECTED"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Unlock Form */}
          <form onSubmit={handleUnlock} className="space-y-3">
            <label className="block text-xs font-mono text-[#8b93a7]">
              {isUnlocked ? "Re-verify PIN or Switch User" : "Enter 4-Digit Control PIN"}
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Default: 1234"
                className="bg-[#10131a] border border-[#2a3140] px-3 py-2 text-sm text-[#eef1f6] focus:border-[#5eead4] outline-none font-mono w-full"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#5eead4] hover:bg-[#5eead4]/90 text-[#10131a] text-xs font-mono font-bold whitespace-nowrap cursor-pointer"
              >
                {isUnlocked ? "Verify" : "Unlock"}
              </button>
            </div>
            <p className="text-[11px] font-mono text-[#8b93a7]">
              Default demo PIN is <span className="text-[#5eead4] font-bold">1234</span>
            </p>
          </form>

          {/* Change PIN Form */}
          <form onSubmit={handleChangePin} className="space-y-3">
            <label className="block text-xs font-mono text-[#8b93a7]">Update Security PIN</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="password"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="Current PIN"
                className="bg-[#10131a] border border-[#2a3140] px-3 py-2 text-xs text-[#eef1f6] focus:border-[#5eead4] outline-none font-mono"
              />
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="New PIN (4+ digits)"
                className="bg-[#10131a] border border-[#2a3140] px-3 py-2 text-xs text-[#eef1f6] focus:border-[#5eead4] outline-none font-mono"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-[#191e27] hover:bg-[#2a3140] border border-[#2a3140] hover:border-[#5eead4] text-xs font-mono text-[#eef1f6] transition-colors cursor-pointer"
            >
              Update Device Security PIN
            </button>
          </form>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mt-3 p-2 bg-[#5eead4]/10 border border-[#5eead4]/30 text-[#5eead4] text-xs font-mono">
            {successMsg}
          </div>
        )}
      </div>

      {/* Hardware Pinout Configuration */}
      <div className="bg-[#141820] border border-[#2a3140] p-5 space-y-3">
        <h4 className="text-sm font-semibold font-mono text-[#eef1f6] flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#5eead4]" />
          ESP32 Hardware Pinout Configuration
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 bg-[#10131a] border border-[#2a3140]">
            <div className="text-[#5eead4] font-bold mb-1">Servo Arms</div>
            <div className="text-[#8b93a7]">Left: GPIO 18 (PWM)</div>
            <div className="text-[#8b93a7]">Right: GPIO 19 (PWM)</div>
            <div className="text-[#8b93a7]">Power: 5V / 3.7V Li-ion</div>
          </div>
          <div className="p-3 bg-[#10131a] border border-[#2a3140]">
            <div className="text-[#f2a65a] font-bold mb-1">1.8" IPS Display Face</div>
            <div className="text-[#8b93a7]">MOSI: GPIO 23 / SCLK: 18</div>
            <div className="text-[#8b93a7]">CS: GPIO 5 / DC: GPIO 16</div>
            <div className="text-[#8b93a7]">Driver: 1.8" SPI IPS (RGB)</div>
          </div>
          <div className="p-3 bg-[#10131a] border border-[#2a3140]">
            <div className="text-[#c084fc] font-bold mb-1">Audio I2S Ears/Mouth</div>
            <div className="text-[#8b93a7]">Mic: INMP441 (GPIO 32,33,34)</div>
            <div className="text-[#8b93a7]">DAC: MAX98357A (GPIO 25,26,22)</div>
            <div className="text-[#8b93a7]">Rate: 16kHz PCM</div>
          </div>
        </div>
      </div>

      {/* Embedded Arduino Firmware */}
      <div className="bg-[#141820] border border-[#2a3140] p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#5eead4]" />
            <h4 className="text-sm font-semibold font-mono text-[#eef1f6]">ESP32 Dual-Mode Arduino Firmware (v1.5.0)</h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#5eead4]/15 text-[#5eead4] border border-[#5eead4]/30">
              Web Serial &amp; WiFi Ready
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/download/ino"
              download="Zonyx_Plus_ESP32_Firmware.ino"
              onClick={() => soundFX.playBoop()}
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 bg-[#191e27] hover:bg-[#252e3e] border border-[#2a3140] hover:border-[#5eead4] text-[#5eead4] rounded transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .INO</span>
            </a>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 bg-[#191e27] hover:bg-[#2a3140] border border-[#2a3140] hover:border-[#5eead4] text-[#eef1f6] rounded transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#5eead4]" />}
              <span>{copied ? "Copied!" : "Copy C++"}</span>
            </button>
          </div>
        </div>
        <pre className="p-4 bg-[#10131a] border border-[#2a3140] text-xs font-mono text-[#c7cde0] overflow-x-auto max-h-72 leading-relaxed rounded-lg">
          {sampleFirmware}
        </pre>
      </div>
    </div>
  );
};
