export type EmotionType =
  | "happy"
  | "thinking"
  | "roasting"
  | "surprised"
  | "neutral"
  | "sassy"
  | "alert"
  | "sleeping"
  | "wink"
  | "ninja";

export interface ServoPose {
  leftArm: number; // -45 to 90 degrees
  rightArm: number; // -45 to 90 degrees
}

export interface RobotPersonalityMode {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: "preset" | "custom";
  creator: string;
  systemPrompt: string; // Max 1000 characters
  voicePitch: number;
  voiceSpeed: number;
  defaultExpression: EmotionType;
  defaultPose: ServoPose;
  badgeColor: string;
  updatedAt?: string;
}

export interface HardwareTelemetry {
  online: boolean;
  batteryPct: number;
  batteryVoltage: number;
  wifiSSID: string;
  rssi: number;
  cpuTempC: number;
  freeHeapKb: number;
  ipAddress: string;
  uptimeSecs: number;
  leftServoDeg: number;
  rightServoDeg: number;
  screenState: "active" | "standby" | "dim";
  lastPingMs: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  emotion?: EmotionType;
  servoPose?: ServoPose;
  latencyMs?: number;
}

export interface CommunitySuggestion {
  id: string;
  author: string;
  title: string;
  description: string;
  category: "servo" | "personality" | "hardware" | "feature";
  upvotes: number;
  status: "submitted" | "in_review" | "implemented";
  createdAt: string;
}

export interface ChatApiResponse {
  reply: string;
  emotion: EmotionType;
  servoPose: ServoPose;
  latencyMs: number;
  modeId: string;
}

export type RgbThemeId = "cyan" | "violet" | "amber" | "emerald" | "rose";

export interface RgbThemeConfig {
  id: RgbThemeId;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  cardBorder: string;
  bgGlow: string;
  hexNumber: number;
  lcdEyeColor: string;
  lcdIrisColor: string;
  lcdCheekColor: string;
}

export type HardwareConnectionType = "simulation" | "webserial" | "wifi" | "ble";

export type LanguageId = "en" | "ml" | "hi" | "es" | "ja" | "de" | "fr" | "ar" | "ta";

export interface LanguageConfig {
  id: LanguageId;
  code: LanguageId;
  name: string;
  nativeName: string;
  flag: string;
  speechLang: string;
  robotGreeting: string;
  systemPromptDirective: string;
}

export interface HardwareSyncState {
  status: "simulation" | "connecting" | "connected" | "error";
  connectionType: HardwareConnectionType;
  portName?: string;
  ipAddress?: string;
  packetsSent: number;
  packetsReceived: number;
  lastSyncTime?: number;
  latencyMs: number;
  error?: string;
  currentLanguage?: LanguageId;
}
