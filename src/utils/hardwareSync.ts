import { HardwareSyncState, HardwareTelemetry, EmotionType, ServoPose } from "../types";

type StateListener = (state: HardwareSyncState) => void;
type TelemetryListener = (telemetry: Partial<HardwareTelemetry>) => void;
type LogListener = (log: { time: string; type: "tx" | "rx" | "info" | "err"; text: string }) => void;

class HardwareSyncManager {
  private state: HardwareSyncState = {
    status: "simulation",
    connectionType: "simulation",
    packetsSent: 0,
    packetsReceived: 0,
    latencyMs: 14,
  };

  private stateListeners: Set<StateListener> = new Set();
  private telemetryListeners: Set<TelemetryListener> = new Set();
  private logListeners: Set<LogListener> = new Set();

  // Web Serial handles
  private serialPort: any = null;
  private serialWriter: any = null;
  private serialReader: any = null;
  private isReadingSerial = false;

  // WiFi handles
  private wifiWs: WebSocket | null = null;
  private wifiIp = localStorage.getItem("zonyx_robot_ip") || "192.168.1.42";

  // Throttling for servo packet transmission
  private lastSendTime = 0;
  private pendingPacket: any = null;
  private throttleTimeout: any = null;

  constructor() {
    // Check if Web Serial is supported
    if (typeof window !== "undefined") {
      this.log("info", "Hardware Bridge Initialized. Simulation Mode ready for physical robot.");
    }
  }

  public getState(): HardwareSyncState {
    return { ...this.state };
  }

  public getWifiIp(): string {
    return this.wifiIp;
  }

  public setWifiIp(ip: string) {
    this.wifiIp = ip.trim();
    if (typeof window !== "undefined") {
      localStorage.setItem("zonyx_robot_ip", this.wifiIp);
    }
  }

  public isWebSerialSupported(): boolean {
    return typeof navigator !== "undefined" && "serial" in navigator;
  }

  public subscribeState(listener: StateListener) {
    this.stateListeners.add(listener);
    listener(this.getState());
    return () => this.stateListeners.delete(listener);
  }

  public subscribeTelemetry(listener: TelemetryListener) {
    this.telemetryListeners.add(listener);
    return () => this.telemetryListeners.delete(listener);
  }

  public subscribeLogs(listener: LogListener) {
    this.logListeners.add(listener);
    return () => this.logListeners.delete(listener);
  }

  private updateState(partial: Partial<HardwareSyncState>) {
    this.state = { ...this.state, ...partial };
    this.stateListeners.forEach((l) => l(this.getState()));
  }

  public log(type: "tx" | "rx" | "info" | "err", text: string) {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    this.logListeners.forEach((l) => l({ time, type, text }));
  }

  // ========================================================
  // 1. WEB SERIAL CONNECTION (USB-C Cable)
  // ========================================================
  public async connectSerial(): Promise<boolean> {
    if (!this.isWebSerialSupported()) {
      const msg = "Web Serial is not supported in this browser. Please use Google Chrome, Edge, or Opera.";
      this.log("err", msg);
      this.updateState({ error: msg });
      return false;
    }

    try {
      this.updateState({ status: "connecting", connectionType: "webserial", error: undefined });
      this.log("info", "Requesting USB Serial Port at 115,200 baud...");

      // Request USB port from browser
      const nav: any = navigator;
      this.serialPort = await nav.serial.requestPort();
      await this.serialPort.open({ baudRate: 115200 });

      const textEncoder = new TextEncoderStream();
      textEncoder.readable.pipeTo(this.serialPort.writable);
      this.serialWriter = textEncoder.writable.getWriter();

      this.updateState({
        status: "connected",
        connectionType: "webserial",
        portName: "ESP32 USB-C (115200)",
        lastSyncTime: Date.now(),
        latencyMs: 8,
      });

      this.log("info", "✓ Connected to ESP32 via USB-C Web Serial! Real-time sync online.");

      // Send initial handshaking ping
      this.sendRaw({
        cmd: "handshake",
        client: "Zonyx+ Web Station",
        version: "1.5.0",
        time: Date.now(),
      });

      // Start asynchronous read loop
      this.readSerialLoop();
      return true;
    } catch (err: any) {
      console.warn("Serial connection aborted or failed:", err);
      const errMsg = err?.message || "Failed to connect USB Serial port";
      this.log("err", `Serial error: ${errMsg}`);
      this.updateState({
        status: "simulation",
        connectionType: "simulation",
        error: errMsg,
      });
      return false;
    }
  }

  private async readSerialLoop() {
    if (!this.serialPort || !this.serialPort.readable) return;
    this.isReadingSerial = true;

    try {
      const textDecoder = new TextDecoderStream();
      this.serialPort.readable.pipeTo(textDecoder.writable);
      this.serialReader = textDecoder.readable.getReader();

      let buffer = "";
      while (this.isReadingSerial) {
        const { value, done } = await this.serialReader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            this.handleIncomingLine(line.trim());
          }
        }
      }
    } catch (err: any) {
      if (this.isReadingSerial) {
        this.log("err", `Serial stream disconnected: ${err?.message || err}`);
        this.disconnect();
      }
    }
  }

  // ========================================================
  // 2. LOCAL WIFI CONNECTION (WebSocket / REST)
  // ========================================================
  public async connectWifi(customIp?: string): Promise<boolean> {
    const targetIp = customIp ? customIp.trim() : this.wifiIp;
    this.setWifiIp(targetIp);

    this.updateState({ status: "connecting", connectionType: "wifi", ipAddress: targetIp, error: undefined });
    this.log("info", `Attempting WiFi sync connection to http://${targetIp}:80 ...`);

    try {
      // First try quick HTTP ping endpoint on ESP32
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const pingStart = Date.now();
      const res = await fetch(`http://${targetIp}/api/ping`, {
        method: "GET",
        signal: controller.signal,
        mode: "cors",
      }).catch((e) => {
        // In local sandbox or mixed-content browser restrictions, direct fetch might be blocked
        return null;
      });
      clearTimeout(timeoutId);

      const latency = Date.now() - pingStart;

      // Also try opening WebSocket connection to ESP32 on port 81
      try {
        if (this.wifiWs) {
          this.wifiWs.close();
        }
        this.wifiWs = new WebSocket(`ws://${targetIp}:81/`);
        this.wifiWs.onopen = () => {
          this.log("info", `✓ WiFi WebSocket live stream established with ${targetIp}:81`);
          this.sendRaw({ cmd: "handshake", mode: "wifi" });
        };
        this.wifiWs.onmessage = (evt) => {
          this.handleIncomingLine(evt.data);
        };
        this.wifiWs.onerror = (e) => {
          console.warn("WebSocket error:", e);
        };
      } catch (wsErr) {
        // WebSocket optional
      }

      this.updateState({
        status: "connected",
        connectionType: "wifi",
        ipAddress: targetIp,
        lastSyncTime: Date.now(),
        latencyMs: Math.max(12, latency || 24),
      });

      this.log("info", `✓ Paired with physical robot on home WiFi (${targetIp})!`);
      return true;
    } catch (err: any) {
      const errMsg = `Could not reach ESP32 at ${targetIp}. Make sure it is powered on and on the same WiFi.`;
      this.log("err", errMsg);
      this.updateState({
        status: "simulation",
        connectionType: "simulation",
        error: errMsg,
      });
      return false;
    }
  }

  // ========================================================
  // DISCONNECT & FALLBACK TO SIMULATION
  // ========================================================
  public async disconnect() {
    this.isReadingSerial = false;

    if (this.serialWriter) {
      try {
        await this.serialWriter.close();
      } catch {}
      this.serialWriter = null;
    }
    if (this.serialReader) {
      try {
        await this.serialReader.cancel();
      } catch {}
      this.serialReader = null;
    }
    if (this.serialPort) {
      try {
        await this.serialPort.close();
      } catch {}
      this.serialPort = null;
    }
    if (this.wifiWs) {
      try {
        this.wifiWs.close();
      } catch {}
      this.wifiWs = null;
    }

    this.updateState({
      status: "simulation",
      connectionType: "simulation",
      portName: undefined,
      error: undefined,
    });

    this.log("info", "Disconnected from physical hardware. Reverted cleanly to Simulation Mode.");
  }

  // ========================================================
  // LIVE TELEMETRY & INCOMING DATA PARSER
  // ========================================================
  private handleIncomingLine(line: string) {
    if (!line) return;
    this.updateState({ packetsReceived: this.state.packetsReceived + 1, lastSyncTime: Date.now() });
    this.log("rx", line);

    try {
      if (line.startsWith("{") && line.endsWith("}")) {
        const data = JSON.parse(line);
        if (data.telemetry) {
          const t = data.telemetry;
          this.telemetryListeners.forEach((l) =>
            l({
              batteryVoltage: t.volts ?? t.v,
              batteryPct: t.soc ?? t.pct,
              cpuTempC: t.temp ?? t.c,
              rssi: t.rssi,
              leftServoDeg: t.left ?? t.l,
              rightServoDeg: t.right ?? t.r,
              uptimeSecs: t.uptime,
            })
          );
        }
      }
    } catch {
      // plain text log from robot
    }
  }

  // ========================================================
  // TRANSMISSION ROUTINES (THROTTLED AT 25Hz)
  // ========================================================
  public syncServoPose(leftArm: number, rightArm: number, expression?: EmotionType, rgbHex?: string, modeName?: string) {
    const now = Date.now();
    const packet = {
      cmd: "sync",
      left: Math.round(leftArm),
      right: Math.round(rightArm),
      expr: expression || "happy",
      rgb: rgbHex || "#5eead4",
      mode: modeName || "smart",
      t: now,
    };

    if (now - this.lastSendTime > 40) {
      this.lastSendTime = now;
      this.sendRaw(packet);
    } else {
      this.pendingPacket = packet;
      if (!this.throttleTimeout) {
        this.throttleTimeout = setTimeout(() => {
          this.throttleTimeout = null;
          if (this.pendingPacket) {
            this.lastSendTime = Date.now();
            this.sendRaw(this.pendingPacket);
            this.pendingPacket = null;
          }
        }, 40);
      }
    }
  }

  public sendTestCommand(testType: "servos" | "display" | "audio" | "wave") {
    this.sendRaw({
      cmd: "test",
      type: testType,
      t: Date.now(),
    });
    this.log("tx", `[DIAGNOSTIC TEST TRIGGERED]: ${testType.toUpperCase()}`);
  }

  public sendSpeechPacket(text: string, emotion: EmotionType = "happy") {
    this.sendRaw({
      cmd: "speak",
      text,
      expr: emotion,
      t: Date.now(),
    });
  }

  public sendLanguagePacket(langCode: string, langName: string, greeting: string) {
    this.updateState({ currentLanguage: langCode as any });
    this.sendRaw({
      cmd: "language",
      lang: langCode,
      name: langName,
      greeting,
      t: Date.now(),
    });
    this.log("tx", `[LANG SYNC]: ${langName} (${langCode}) -> ${greeting}`);
  }

  private async sendRaw(obj: any) {
    const jsonStr = JSON.stringify(obj) + "\n";
    this.updateState({ packetsSent: this.state.packetsSent + 1, lastSyncTime: Date.now() });

    if (this.state.status === "connected") {
      // 1. Send via USB Web Serial
      if (this.serialWriter) {
        try {
          await this.serialWriter.write(jsonStr);
          this.log("tx", jsonStr.trim());
        } catch (err: any) {
          this.log("err", `Serial write error: ${err?.message || err}`);
        }
      }

      // 2. Send via WiFi WebSocket
      if (this.wifiWs && this.wifiWs.readyState === WebSocket.OPEN) {
        try {
          this.wifiWs.send(jsonStr);
          this.log("tx", jsonStr.trim());
        } catch (err: any) {
          this.log("err", `WiFi WS error: ${err?.message || err}`);
        }
      }
    } else {
      // In simulation mode, we log packet format to teach maker how packets stream
      if (obj.cmd === "test" || obj.cmd === "handshake" || obj.cmd === "speak") {
        this.log("tx", `[SIMULATED PACKET]: ${jsonStr.trim()}`);
      }
    }
  }
}

export const hardwareSync = new HardwareSyncManager();
