// ============================================================================
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

// ----------------------------------------------------------------------------
// PIN DEFINITIONS
// ----------------------------------------------------------------------------
#define TFT_CS    5    // Display Chip Select
#define TFT_DC   16    // Display Data/Command
#define TFT_RST   4    // Display Reset
#define TFT_MOSI 23    // Hardware SPI MOSI
#define TFT_SCLK 18    // Hardware SPI Clock

#define SERVO_LEFT_PIN   14   // SG90 Left Arm PWM
#define SERVO_RIGHT_PIN  12   // SG90 Right Arm PWM
#define BATT_ADC_PIN     34   // Battery Voltage Divider (100k + 100k)

// ----------------------------------------------------------------------------
// WIFI CONFIGURATION (Change to your home network)
// ----------------------------------------------------------------------------
const char* WIFI_SSID     = "YOUR_HOME_WIFI_2.4G";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ----------------------------------------------------------------------------
// GLOBAL OBJECTS & STATE
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// COLOR LCD FACIAL GRAPHICS ENGINE (ST7789 240x240)
// ----------------------------------------------------------------------------
void drawEye(int cx, int cy, int rx, int ry, String emotion, uint16_t color) {
  if (emotion == "sleeping") {
    // Closed peaceful horizontal arc
    tft.drawFastHLine(cx - rx, cy, rx * 2, color);
    tft.drawFastHLine(cx - rx, cy + 1, rx * 2, color);
    return;
  }

  if (emotion == "wink" && cx > 120) {
    // Right eye winks
    tft.drawFastHLine(cx - rx + 4, cy, (rx * 2) - 8, color);
    tft.drawFastHLine(cx - rx + 4, cy + 1, (rx * 2) - 8, color);
    return;
  }

  // Draw full round anime eye
  tft.fillRoundRect(cx - rx, cy - ry, rx * 2, ry * 2, 14, color);
  
  // Inner dark iris pupil
  tft.fillRoundRect(cx - (rx / 2), cy - (ry / 2), rx, ry, 8, ST77XX_BLACK);

  // Glossy white specular light highlight
  tft.fillCircle(cx - (rx / 3), cy - (ry / 3), 4, ST77XX_WHITE);
  tft.fillCircle(cx + (rx / 4), cy + (ry / 4), 2, ST77XX_WHITE);
}

void renderFace(String emotion, uint16_t accentColor) {
  tft.fillScreen(ST77XX_BLACK);

  // Top Status Bar: Battery & WiFi Indicator
  tft.setTextSize(1);
  tft.setTextColor(0x7BEF); // Light Gray
  tft.setCursor(8, 8);
  tft.print("ZONYX+");

  tft.setCursor(185, 8);
  tft.print(WiFi.status() == WL_CONNECTED ? "WIFI OK" : "USB SYNC");

  // Dual Expressive Eyes
  drawEye(68, 115, 26, 36, emotion, accentColor);
  drawEye(172, 115, 26, 36, emotion, accentColor);

  // Blushing pink cheeks for friendly anime aesthetic
  if (emotion == "happy" || emotion == "wink") {
    tft.fillRoundRect(38, 155, 18, 8, 4, 0xF81F); // Soft Magenta
    tft.fillRoundRect(184, 155, 18, 8, 4, 0xF81F);
  }

  // Cute mouth expression
  if (emotion == "happy") {
    tft.drawCircle(120, 150, 10, accentColor);
    tft.fillRect(108, 138, 24, 12, ST77XX_BLACK); // Crop top half of circle
  } else if (emotion == "thinking") {
    tft.fillCircle(120, 155, 4, accentColor);
  } else if (emotion == "roasting") {
    tft.drawFastHLine(110, 155, 20, accentColor);
    tft.drawFastHLine(110, 156, 20, accentColor);
  }
}

// ----------------------------------------------------------------------------
// PACKET PROCESSING (Shared between USB Web Serial & WiFi WebSocket)
// ----------------------------------------------------------------------------
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
    // Acknowledge receipt
    Serial.println("{\"status\":\"ok\",\"synced\":true}");
  }
  else if (strcmp(cmd, "test") == 0) {
    const char* testType = doc["type"];
    if (strcmp(testType, "servos") == 0) {
      // Diagnostic arm wave
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

// ----------------------------------------------------------------------------
// TELEMETRY STREAMER (Sends battery, angles, and temp back to website)
// ----------------------------------------------------------------------------
void broadcastTelemetry() {
  int rawAdc = analogRead(BATT_ADC_PIN);
  float voltage = (rawAdc / 4095.0) * 3.3 * 2.0 * 1.05; // 2:1 divider + calibration
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

  // Send over USB Web Serial
  Serial.println(output);

  // Send over WiFi WebSocket to all connected browser tabs
  if (webSocket.connectedClients() > 0) {
    webSocket.broadcastTXT(output);
  }
}

// ----------------------------------------------------------------------------
// SETUP
// ----------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  Serial.println("\n[ZONYX+] Pocket Robot Booting...");

  // 1. Initialize 1.8" IPS Color Display
  tft.init(240, 240);
  tft.setRotation(2); // Inverted portrait
  renderFace("happy", currentEyeColor);

  // 2. Attach SG90 Arm Servos
  servoLeft.attach(SERVO_LEFT_PIN, 500, 2400);
  servoRight.attach(SERVO_RIGHT_PIN, 500, 2400);
  servoLeft.write(90);
  servoRight.write(90);

  // 3. Connect to Home WiFi (Non-blocking fallback)
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startWifi = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startWifi < 5000) {
    delay(200);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Connected! IP Address: ");
    Serial.println(WiFi.localIP());

    // REST Ping Endpoint
    server.on("/api/ping", []() {
      server.send(200, "application/json", "{\"status\":\"online\",\"robot\":\"Zonyx+\"}");
    });
    server.begin();

    // WebSocket Server for continuous bidirectional streaming
    webSocket.begin();
    webSocket.onEvent([](uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
      if (type == WStype_TEXT) {
        processJsonPacket(String((char*)payload));
      }
    });
  } else {
    Serial.println("\n[STANDALONE] WiFi offline. Running in direct USB-C Web Serial mode.");
  }

  Serial.println("{\"ready\":true,\"robot\":\"Zonyx+\",\"version\":\"1.5.0\"}");
}

// ----------------------------------------------------------------------------
// MAIN LOOP
// ----------------------------------------------------------------------------
void loop() {
  // 1. Read USB-C Web Serial commands from browser
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.length() > 0) {
      processJsonPacket(line);
    }
  }

  // 2. Handle WiFi & WebSocket clients
  if (WiFi.status() == WL_CONNECTED) {
    server.handleClient();
    webSocket.loop();
  }

  // 3. Smooth Servo Arm Easing (Prevents jitter & sudden mechanical jerk)
  if (currentLeftAngle < targetLeftAngle) currentLeftAngle += 2;
  else if (currentLeftAngle > targetLeftAngle) currentLeftAngle -= 2;

  if (currentRightAngle < targetRightAngle) currentRightAngle += 2;
  else if (currentRightAngle > targetRightAngle) currentRightAngle -= 2;

  servoLeft.write(currentLeftAngle);
  servoRight.write(currentRightAngle);

  // 4. Natural blink cycle every ~4.5 seconds
  if (millis() - lastBlinkTime > 4500 && currentEmotion == "happy") {
    lastBlinkTime = millis();
    drawEye(68, 115, 26, 36, "sleeping", currentEyeColor);
    drawEye(172, 115, 26, 36, "sleeping", currentEyeColor);
    delay(140);
    drawEye(68, 115, 26, 36, "happy", currentEyeColor);
    drawEye(172, 115, 26, 36, "happy", currentEyeColor);
  }

  // 5. Stream telemetry back to website every 500ms
  if (millis() - lastTelemetrySend > 500) {
    lastTelemetrySend = millis();
    broadcastTelemetry();
  }

  delay(15);
}
