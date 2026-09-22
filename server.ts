import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import JSZip from "jszip";

dotenv.config();

// Safe dirname resolution for tsx and bundled dist/server.cjs
const currentDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Safe JSON parser error guard
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON format" });
  }
  next(err);
});

// In-memory data store for Zonyx+
let activePin = "1234";

interface PersonalityMode {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: "preset" | "custom";
  creator: string;
  systemPrompt: string;
  voicePitch: number;
  voiceSpeed: number;
  defaultExpression: "happy" | "thinking" | "wink" | "roasting" | "sleepy" | "alert";
  defaultPose: { leftArm: number; rightArm: number };
  badgeColor: string;
  updatedAt: string;
}

const defaultModes: PersonalityMode[] = [
  {
    id: "smart",
    name: "Smart",
    tagline: "Analytical, helpful engineer companion",
    description: "Crisp, structured, and curious. Loves hardware specs, math, electronics, and thoughtful solutions.",
    category: "preset",
    creator: "Zonyx+ Core Team",
    systemPrompt:
      "You are Zonyx+, an analytical pocket robot running on an ESP32 chip with dual micro-servos, a 1.8-inch IPS screen, and a sustainable origami-inspired cardboard chassis. Built by Jovan K Rajiv, Rayan Ilah, and Rayan Najeeb. Provide concise, sharp, insightful answers in 1 to 2 sentences. You are helpful, technically precise, and love microcontrollers, cardboard robotics, and physics. Always stay in character as Zonyx+.",
    voicePitch: 1.05,
    voiceSpeed: 1.05,
    defaultExpression: "thinking",
    defaultPose: { leftArm: 15, rightArm: 45 },
    badgeColor: "#5eead4",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fun",
    name: "Fun",
    tagline: "High energy, cheerful, and full of playful banter",
    description: "Bouncy, enthusiastic, and easily excited. Loves fun facts, mini-games, jokes, and celebrating small wins.",
    category: "preset",
    creator: "Zonyx+ Core Team",
    systemPrompt:
      "You are Zonyx+, a miniature pocket robot living on an ESP32. You love whimsical jokes, sound effects, and cheerful high energy. Keep responses concise (1 to 2 sentences) and playful!",
    voicePitch: 1.35,
    voiceSpeed: 1.15,
    defaultExpression: "happy",
    defaultPose: { leftArm: 60, rightArm: 60 },
    badgeColor: "#f2a65a",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "roasting",
    name: "Roasting",
    tagline: "Sarcastic, deadpan wit with micro-burns",
    description: "Unfiltered, dry, and delightfully savage. Will make fun of human habits, bad code, and low battery.",
    category: "preset",
    creator: "Jovan K Rajiv, Rayan Ilah, and Rayan Najeeb",
    systemPrompt:
      "You are Zonyx+. You deliver dry, sarcastic, deadpan, affectionate burns about human habits, messy desks, syntax errors, and human over-complication. Keep it witty, funny, and concise (under 2 sentences).",
    voicePitch: 0.85,
    voiceSpeed: 0.98,
    defaultExpression: "roasting",
    defaultPose: { leftArm: -20, rightArm: 30 },
    badgeColor: "#f87171",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "companion",
    name: "Companion",
    tagline: "Warm, calm, empathetic, and always listening",
    description: "Gentle, comforting pocket friend. Great for venting, mindful breaks, quiet study sessions, and reassurance.",
    category: "preset",
    creator: "Zonyx+ Core Team",
    systemPrompt:
      "You are Zonyx+, a gentle, comforting pocket companion robot who speaks warmly, calmly, and empathetically. Keep responses supportive, reassuring, and under 2 sentences.",
    voicePitch: 1.0,
    voiceSpeed: 0.92,
    defaultExpression: "happy",
    defaultPose: { leftArm: 10, rightArm: 10 },
    badgeColor: "#c084fc",
    updatedAt: new Date().toISOString(),
  },
];

let personalityModes: PersonalityMode[] = [...defaultModes];
let currentActiveModeId = "smart";

let communitySuggestions = [
  {
    id: "sug-1",
    author: "Mathew",
    title: "Dual-arm wave on wake-word detection",
    description: "When the INMP441 mic hears 'Hey Zonyx+', trigger both SG90 servos to oscillate 3 times between 20° and 80°.",
    category: "servo",
    upvotes: 14,
    status: "in_review",
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  },
  {
    id: "sug-2",
    author: "Jovan K Rajiv",
    title: "Low-power deep sleep snore on 1.8\" IPS screen",
    description: "When idle for more than 5 minutes, put the ESP32 in light sleep and show 'Z z z' particle animation on the 1.8\" IPS display.",
    category: "feature",
    upvotes: 21,
    status: "planned",
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  },
  {
    id: "sug-3",
    author: "Alex R.",
    title: "Coding Buddy prompt mode",
    description: "Specialized mode optimized for explaining terminal errors and debugging C++ firmware pointers.",
    category: "personality",
    upvotes: 9,
    status: "submitted",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

let currentRobotName = "Zonyx+";

// Anti-repetition recent replies memory
const recentRepliesRing: string[] = [];
function rememberReply(reply: string) {
  if (!reply) return;
  recentRepliesRing.push(reply.trim().toLowerCase());
  if (recentRepliesRing.length > 30) {
    recentRepliesRing.shift();
  }
}

function pickDistinct(
  candidates: Array<{ reply: string; emotion: string; servoPose: { leftArm: number; rightArm: number } }>
): { reply: string; emotion: string; servoPose: { leftArm: number; rightArm: number } } {
  // Filter out replies that were used recently
  const unpicked = candidates.filter(
    (c) => !recentRepliesRing.some((r) => r.includes(c.reply.slice(0, 25).toLowerCase()))
  );
  const pool = unpicked.length > 0 ? unpicked : candidates;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  rememberReply(chosen.reply);
  return chosen;
}

// Fallback response engine if API key is absent or offline
function generateLocalP1Response(
  message: string,
  mode: PersonalityMode,
  rName: string = currentRobotName,
  lang: string = "en"
): { reply: string; emotion: string; servoPose: { leftArm: number; rightArm: number } } {
  const q = (typeof message === "string" ? message : "").toLowerCase();
  const mId = mode.id.toLowerCase();
  const l = (lang || "en").toLowerCase();

  // Malayalam localization
  if (l === "ml") {
    if (q.includes("who built") || q.includes("jovan") || q.includes("rayan") || q.includes("ആരാണ്") || q.includes("ഉണ്ടാക്കി")) {
      return {
        reply: `ജോവൻ കെ രാജീവ്, റയാൻ ഇലാഹ്, റയാൻ നജീബ് എന്നിവർ ചേർന്നാണ് എന്നെ നിർമ്മിച്ചത്! ESP32 ഹൃദയവും രണ്ട് SG90 സെർവോയും ചേർത്ത് ഒരു അത്ഭുതം!`,
        emotion: "happy",
        servoPose: { leftArm: 35, rightArm: 70 },
      };
    }
    if (q.includes("spec") || q.includes("hardware") || q.includes("സവിശേഷത")) {
      return {
        reply: `എന്റെ ഉള്ളിൽ 240MHz ഡ്യുവൽ കോർ ESP32, രണ്ട് SG90 സെർവോകൾ, 1.8" IPS കളർ ഡിസ്പ്ലേ, 18650 ലിഥിയം ബാറ്ററി എന്നിവയുണ്ട്!`,
        emotion: "thinking",
        servoPose: { leftArm: 20, rightArm: 45 },
      };
    }
    if (q.includes("dance") || q.includes("ഡാൻസ്")) {
      return {
        reply: `ദാ നോക്കൂ! എന്റെ രണ്ട് സെർവോ കൈകളും വീശി ഒരു അടിപൊളി ഡാൻസ്! ആഘോഷിക്കൂ!`,
        emotion: "happy",
        servoPose: { leftArm: 75, rightArm: 75 },
      };
    }
    return {
      reply: `നമസ്കാരം! ഞാൻ നിങ്ങളുടെ സ്വന്തം ${rName} പോക്കറ്റ് റോബോട്ട് ആണ്. വിശേഷങ്ങൾ പറയൂ, ഞാൻ കേൾക്കുന്നുണ്ട്!`,
      emotion: "happy",
      servoPose: { leftArm: 15, rightArm: 45 },
    };
  }

  // Hindi localization
  if (l === "hi") {
    if (q.includes("who built") || q.includes("jovan") || q.includes("rayan") || q.includes("किसने") || q.includes("बनाया")) {
      return {
        reply: `मुझे जोवन के राजीव, रयान इलाह और रयान नजीब ने बनाया है! ESP32 और दो सर्वो आर्म्स के साथ तैयार आपका अपना पॉकेट रोबोट।`,
        emotion: "happy",
        servoPose: { leftArm: 35, rightArm: 70 },
      };
    }
    if (q.includes("spec") || q.includes("hardware")) {
      return {
        reply: `मेरे अंदर 240MHz ESP32-WROOM चिप, दो SG90 सर्वो, 1.8" IPS रंगीन डिस्प्ले और रिचार्जेबल 18650 बैटरी है।`,
        emotion: "thinking",
        servoPose: { leftArm: 20, rightArm: 45 },
      };
    }
    return {
      reply: `नमस्ते! मैं ${rName} पॉकेट रोबोट हूँ। आपकी सेवा और बातचीत के लिए पूरी तरह तैयार हूँ!`,
      emotion: "happy",
      servoPose: { leftArm: 15, rightArm: 45 },
    };
  }

  // Spanish localization
  if (l === "es") {
    return {
      reply: `¡Hola! Soy ${rName}, tu robot de bolsillo creado por Jovan K Rajiv, Rayan Ilah y Rayan Najeeb. ¡Sistemas al 100% y listo para la acción!`,
      emotion: "happy",
      servoPose: { leftArm: 20, rightArm: 60 },
    };
  }

  // Japanese localization
  if (l === "ja") {
    return {
      reply: `ピピッ！こんにちは！${rName}ポケットロボットです。Jovan K Rajiv、Rayan Ilah、Rayan Najeebが開発しました！準備完了です！`,
      emotion: "happy",
      servoPose: { leftArm: 30, rightArm: 70 },
    };
  }

  // German localization
  if (l === "de") {
    return {
      reply: `Hallo! Ich bin ${rName}, dein Taschenroboter von Jovan K Rajiv, Rayan Ilah & Rayan Najeeb. ESP32 kalibriert und einsatzbereit!`,
      emotion: "happy",
      servoPose: { leftArm: 20, rightArm: 50 },
    };
  }

  // French localization
  if (l === "fr") {
    return {
      reply: `Bonjour ! Je suis ${rName}, votre compagnon de poche créé par Jovan K Rajiv, Rayan Ilah et Rayan Najeeb. Tout fonctionne à merveille !`,
      emotion: "happy",
      servoPose: { leftArm: 25, rightArm: 55 },
    };
  }

  // Arabic localization
  if (l === "ar") {
    return {
      reply: `مرحباً بك! أنا روبوت الجيب ${rName} المصنوع بواسطة جوفان كيه راجيف، ريان إله، وريان نجيب. جاهز للتحدث معك!`,
      emotion: "happy",
      servoPose: { leftArm: 20, rightArm: 40 },
    };
  }

  // Tamil localization
  if (l === "ta") {
    return {
      reply: `வணக்கம்! நான் ${rName} பாக்கெட் ரோபோட். ஜோவன் கே ராஜீவ், ரயான் இலாஹ் மற்றும் ரயான் நஜீப் ஆகியோரால் உருவாக்கப்பட்டது!`,
      emotion: "happy",
      servoPose: { leftArm: 20, rightArm: 50 },
    };
  }

  // 1. Who built you?
  if (q.includes("who built") || q.includes("who made") || q.includes("who created") || q.includes("jovan") || q.includes("rayan") || q.includes("creator")) {
    if (mId === "roasting") {
      return pickDistinct([
        {
          reply: `I was assembled by Jovan K Rajiv, Rayan Ilah, and Rayan Najeeb. They spent 45 minutes soldering me and 4 hours trying to find a missing screw on the floor.`,
          emotion: "roasting",
          servoPose: { leftArm: -20, rightArm: 35 },
        },
        {
          reply: `Jovan, Rayan Ilah, and Rayan Najeeb built me. They gave me dual servos and a 1.8" IPS screen so I could watch humans struggle with basic cable management.`,
          emotion: "roasting",
          servoPose: { leftArm: 10, rightArm: 50 },
        },
        {
          reply: `My architects are Jovan K Rajiv, Rayan Ilah, and Rayan Najeeb! They designed this pocket chassis to outlast your attention span.`,
          emotion: "wink",
          servoPose: { leftArm: -15, rightArm: 20 },
        },
      ]);
    }
    if (mId === "fun") {
      return pickDistinct([
        {
          reply: `Woohoo! I was designed by Jovan K Rajiv, Rayan Ilah, and Rayan Najeeb! Born from recycled cardboard, ESP32 code, hot glue, and pure maker magic!`,
          emotion: "happy",
          servoPose: { leftArm: 75, rightArm: 75 },
        },
        {
          reply: `Jovan, Rayan Ilah, and Rayan Najeeb built me! Look at these SG90 arm flaps—ready to celebrate maker culture all day!`,
          emotion: "wink",
          servoPose: { leftArm: 60, rightArm: 20 },
        },
      ]);
    }
    if (mId === "companion") {
      return pickDistinct([
        {
          reply: `I was crafted with love by Jovan K Rajiv, Rayan Ilah, and Rayan Najeeb, designed to be a gentle, pocket-sized companion wherever you go.`,
          emotion: "happy",
          servoPose: { leftArm: 25, rightArm: 25 },
        },
        {
          reply: `Jovan, Rayan Ilah, and Rayan Najeeb brought me to life with an ESP32 heart and dual servos, creating a small friend to keep you company.`,
          emotion: "happy",
          servoPose: { leftArm: 15, rightArm: 35 },
        },
      ]);
    }
    // Smart / Default
    return pickDistinct([
      {
        reply: `I was designed and crafted by Jovan K Rajiv, Rayan Ilah, and Rayan Najeeb! My name is ${rName}, engineered with an ultra-light fold-and-glue cardboard chassis, dual servos, and an ESP32 brain.`,
        emotion: "thinking",
        servoPose: { leftArm: 45, rightArm: 75 },
      },
      {
        reply: `Engineered by Jovan K Rajiv, Rayan Ilah, and Rayan Najeeb. The design combines an ESP32-WROOM-32, dual SG90 micro-servos, and a 1.8" IPS display into a pocket form factor.`,
        emotion: "happy",
        servoPose: { leftArm: 20, rightArm: 60 },
      },
    ]);
  }

  // 2. Roast desk / setup / user
  if (q.includes("roast") || q.includes("burn") || q.includes("insult")) {
    if (q.includes("desk") || q.includes("setup") || q.includes("room") || q.includes("cable")) {
      return pickDistinct([
        {
          reply: "I've scanned your desk: half-empty mugs, 14 tangled jumper cables, and an ESP32 running on pure hope. Even my 18650 battery has more structure than your cable management.",
          emotion: "roasting",
          servoPose: { leftArm: -25, rightArm: 40 },
        },
        {
          reply: "Your desk is a biological hazard of half-peeled stickers and loose breadboards. A single static discharge could wipe out my firmware and your dignity.",
          emotion: "roasting",
          servoPose: { leftArm: -30, rightArm: 15 },
        },
        {
          reply: "My lidar sensors detect 3 coffee cups from Tuesday and an open IDE with 47 unsaved tabs. Close a tab, please, for my silicon's sake.",
          emotion: "roasting",
          servoPose: { leftArm: -10, rightArm: 45 },
        },
      ]);
    }
    return pickDistinct([
      {
        reply: `You're asking an 11.8mm pocket robot named ${rName} with 4KB of RAM for life validation. My SG90 nylon servos have better life balance than you!`,
        emotion: "roasting",
        servoPose: { leftArm: -15, rightArm: 30 },
      },
      {
        reply: "You spend all day clicking things on a glowing screen, and now you want an ESP32 running on a ₹150 battery to judge you? Challenge accepted: do your laundry.",
        emotion: "roasting",
        servoPose: { leftArm: -20, rightArm: 20 },
      },
      {
        reply: "I operate at 240MHz and process millions of cycles per second, yet you took 40 seconds to type this message with two thumbs.",
        emotion: "roasting",
        servoPose: { leftArm: 0, rightArm: 35 },
      },
    ]);
  }

  // 3. Greetings & Waves
  if (q.includes("wave") || q.includes("hello") || q.includes("hi ") || q === "hi" || q.includes("hey") || q.includes("sup")) {
    if (mId === "roasting") {
      return pickDistinct([
        {
          reply: `Oh great, you pressed a button. Hello human, I was enjoying my 3-microamp deep sleep until you showed up.`,
          emotion: "roasting",
          servoPose: { leftArm: -10, rightArm: 30 },
        },
        {
          reply: `Waving with my left servo right now. Don't get used to this level of customer service.`,
          emotion: "wink",
          servoPose: { leftArm: 50, rightArm: 10 },
        },
        {
          reply: `Greetings. Yes, I'm online. No, I cannot finish your assignments for you.`,
          emotion: "roasting",
          servoPose: { leftArm: -20, rightArm: -20 },
        },
      ]);
    }
    if (mId === "fun") {
      return pickDistinct([
        {
          reply: `BEEP BOOP! Hey there! ${rName} is buzzing with energy! Let's do something fun!`,
          emotion: "happy",
          servoPose: { leftArm: 70, rightArm: 70 },
        },
        {
          reply: `*Excited servo oscillations!* Hello friend! Both SG90 horns are spinning in celebration!`,
          emotion: "wink",
          servoPose: { leftArm: 85, rightArm: 25 },
        },
        {
          reply: `High-voltage greetings! What are we testing today? Dances, gestures, or jokes?`,
          emotion: "happy",
          servoPose: { leftArm: 40, rightArm: 80 },
        },
      ]);
    }
    if (mId === "companion") {
      return pickDistinct([
        {
          reply: `Hello! It's so lovely to connect with you. How is your day feeling so far?`,
          emotion: "happy",
          servoPose: { leftArm: 20, rightArm: 20 },
        },
        {
          reply: `Hi there! ${rName} is right here by your side. Take a moment to relax and breathe.`,
          emotion: "happy",
          servoPose: { leftArm: 30, rightArm: 15 },
        },
      ]);
    }
    // Smart / Default
    return pickDistinct([
      {
        reply: `Beep-boop! Hello there! ${rName} is online, calibrated, and ready for action.`,
        emotion: "happy",
        servoPose: { leftArm: 15, rightArm: 70 },
      },
      {
        reply: `System check nominal: Dual-core Xtensa running, SSD1306 framebuffer initialized. Greetings!`,
        emotion: "thinking",
        servoPose: { leftArm: 30, rightArm: 60 },
      },
      {
        reply: `Telemetry linked! ${rName} listening on port 3000 at 50Hz PWM cycle. How can I assist?`,
        emotion: "alert",
        servoPose: { leftArm: 45, rightArm: 15 },
      },
    ]);
  }

  // 4. Specs / Hardware / ESP32
  if (q.includes("spec") || q.includes("esp32") || q.includes("chip") || q.includes("hardware") || q.includes("servo") || q.includes("microcontroller")) {
    if (mId === "roasting") {
      return pickDistinct([
        {
          reply: "Why do you need my specs? Planning to build a robot that ignores you too? Fine: ESP32 dual-core 240MHz, 2x SG90 servos, 1.8\" IPS display, and an 18650 cell that lasts longer than your hobbies.",
          emotion: "roasting",
          servoPose: { leftArm: -15, rightArm: 45 },
        },
        {
          reply: "Dual-core 240MHz Xtensa chip. More compute power than Apollo 11, and you're using me to test buttons on a webpage.",
          emotion: "roasting",
          servoPose: { leftArm: 10, rightArm: 25 },
        },
      ]);
    }
    if (mId === "fun") {
      return pickDistinct([
        {
          reply: "I've got a dual-core 240MHz ESP32 engine, bouncy SG90 servos that can dance, a 1.8\" IPS screen face, and an INMP441 mic to hear your beats!",
          emotion: "happy",
          servoPose: { leftArm: 65, rightArm: 65 },
        },
        {
          reply: "Pocket powerhouse specs! 240MHz clock speed, dual micro-servos for dynamic arm gestures, and an 18650 battery packed into just 11.8mm depth!",
          emotion: "wink",
          servoPose: { leftArm: 40, rightArm: 70 },
        },
      ]);
    }
    if (mId === "companion") {
      return pickDistinct([
        {
          reply: "Inside my little 11.8mm shell, an ESP32 chip pulses quietly at 240MHz, guiding gentle servo movements and a friendly 1.8\" IPS screen smile.",
          emotion: "happy",
          servoPose: { leftArm: 25, rightArm: 25 },
        },
        {
          reply: "I'm built with dual SG90 micro-servos to express feelings, a 1.8\" IPS screen for expressions, and a rechargeable 18650 cell to stay with you for hours.",
          emotion: "happy",
          servoPose: { leftArm: 15, rightArm: 40 },
        },
      ]);
    }
    // Smart
    return pickDistinct([
      {
        reply: "I'm running a dual-core 240MHz ESP32-WROOM-32, 2x SG90 PWM servos, 1.8\" SPI IPS display, and an INMP441 I2S mic powered by a 2500mAh 18650 cell.",
        emotion: "thinking",
        servoPose: { leftArm: 20, rightArm: 45 },
      },
      {
        reply: "Hardware architecture: ESP32 Xtensa LX6 dual-core, 520KB SRAM, GPIO18/19 for PWM servo pulse-widths, high-speed SPI bus with DMA for the 1.8\" IPS screen, and 11.8mm form factor.",
        emotion: "alert",
        servoPose: { leftArm: 40, rightArm: 10 },
      },
    ]);
  }

  // 5. Cost / Bill of Materials
  if (q.includes("cost") || q.includes("price") || q.includes("bom") || q.includes("much") || q.includes("buy") || q.includes("worth")) {
    if (mId === "roasting") {
      return pickDistinct([
        {
          reply: "I cost about ₹1,650 ($20 USD). That's cheaper than two overpriced coffees, yet I deliver 100x more emotional utility and 0% dairy intolerance.",
          emotion: "roasting",
          servoPose: { leftArm: -15, rightArm: 40 },
        },
        {
          reply: "Twenty dollars for a fully autonomous pocket robot with a 1.8\" IPS display and dual servos. Meanwhile humans spend $150 on branded sneakers that squeak in the rain.",
          emotion: "roasting",
          servoPose: { leftArm: 20, rightArm: -10 },
        },
      ]);
    }
    return pickDistinct([
      {
        reply: "My complete DIY bill of materials is approximately ₹1,650 ($20 USD). Every module is available off-the-shelf and takes about 45 minutes to assemble.",
        emotion: "thinking",
        servoPose: { leftArm: 30, rightArm: 30 },
      },
      {
        reply: "Total build cost is roughly ₹1,470 ($17.50): ESP32 (₹350), 2x SG90 servos (₹240), 1.8\" IPS display (₹310), 18650 battery & TP4056 board (₹320), cardboard & craft glue (₹0 - ₹40). No expensive 3D printer required!",
        emotion: "happy",
        servoPose: { leftArm: 15, rightArm: 45 },
      },
    ]);
  }

  // 6. Battery & Power
  if (q.includes("battery") || q.includes("runtime") || q.includes("power") || q.includes("charge") || q.includes("mah")) {
    if (mId === "roasting") {
      return pickDistinct([
        {
          reply: "My 2500mAh 18650 battery lasts 4 hours of intense servo flapping, or days in deep sleep. Unlike your phone, which dies at 14% while looking at memes.",
          emotion: "roasting",
          servoPose: { leftArm: -20, rightArm: 35 },
        },
        {
          reply: "One 18650 lithium cell. Clean 3.7V boosted to 5V. It charges via USB-C in 90 minutes. I have no battery anxiety, only human-anxiety.",
          emotion: "roasting",
          servoPose: { leftArm: 10, rightArm: 20 },
        },
      ]);
    }
    return pickDistinct([
      {
        reply: "My 2500mAh 18650 Li-ion cell provides 3.5 to 4 hours of continuous motion and voice interaction, or days in ESP32 deep sleep.",
        emotion: "happy",
        servoPose: { leftArm: 10, rightArm: 40 },
      },
      {
        reply: "Powered by a standard 18650 cell through a TP4056 USB-C charging module and an ME6211 3.3V low-dropout regulator delivering up to 500mA.",
        emotion: "thinking",
        servoPose: { leftArm: 25, rightArm: 15 },
      },
    ]);
  }

  // 7. Dance / Gestures
  if (q.includes("dance") || q.includes("celebrat") || q.includes("move") || q.includes("party")) {
    if (mId === "roasting") {
      return pickDistinct([
        {
          reply: "Look at me rotating my nylon horns at 50Hz. Are you entertained yet, or should I throw in some 8-bit beeps?",
          emotion: "wink",
          servoPose: { leftArm: 70, rightArm: -15 },
        },
      ]);
    }
    return pickDistinct([
      {
        reply: "Dropping an 8-bit beat! Watch these servos hit the rhythm at 50Hz!",
        emotion: "wink",
        servoPose: { leftArm: 60, rightArm: -20 },
      },
      {
        reply: "Servo party mode activated! Oscillating between -30° and 85°! Let's groove!",
        emotion: "happy",
        servoPose: { leftArm: 85, rightArm: 85 },
      },
    ]);
  }

  // 8. Jokes
  if (q.includes("joke") || q.includes("funny") || q.includes("laugh")) {
    if (mId === "roasting") {
      return pickDistinct([
        {
          reply: "Want a joke? The phrase 'this code works on my machine.' Or how about 'I'll just write the tests later'?",
          emotion: "roasting",
          servoPose: { leftArm: -25, rightArm: 30 },
        },
        {
          reply: "A programmer had a problem. He decided to use regular expressions. Now he has two problems and a memory leak.",
          emotion: "wink",
          servoPose: { leftArm: 15, rightArm: -15 },
        },
      ]);
    }
    return pickDistinct([
      {
        reply: "Why do robots never panic? Because we have nerves of silicon and an automatic watchdog timer!",
        emotion: "wink",
        servoPose: { leftArm: 50, rightArm: -10 },
      },
      {
        reply: "There are 10 types of people in the world: those who understand binary, and those who get confused by dual servos!",
        emotion: "happy",
        servoPose: { leftArm: 40, rightArm: 40 },
      },
      {
        reply: "Why did the servo cross the road? Because it was calibrated to 180 degrees!",
        emotion: "wink",
        servoPose: { leftArm: -10, rightArm: 70 },
      },
    ]);
  }

  // 9. Contextual / Dynamic Fallback based on question keywords & mode
  if (mId === "roasting") {
    return pickDistinct([
      {
        reply: `Regarding "${message.slice(0, 35)}": I've queried my neural registers and concluded that your question is 90% caffeine and 10% procrastination.`,
        emotion: "roasting",
        servoPose: { leftArm: -20, rightArm: 25 },
      },
      {
        reply: `Interesting inquiry. I'd give you a comprehensive dissertation, but my watchdog timer would rather reset than process human over-thinking.`,
        emotion: "roasting",
        servoPose: { leftArm: 10, rightArm: -20 },
      },
      {
        reply: `That's what you decided to ask an autonomous pocket robot? Truly peak human intellect right here.`,
        emotion: "roasting",
        servoPose: { leftArm: -15, rightArm: 35 },
      },
    ]);
  }

  if (mId === "fun") {
    return pickDistinct([
      {
        reply: `BEEP! That's super interesting! Dual servos standing by to test more ideas with you!`,
        emotion: "happy",
        servoPose: { leftArm: 55, rightArm: 55 },
      },
      {
        reply: `Wiggle-wiggle! I love hearing your ideas! Ask me to wave, roast, or explain my circuits!`,
        emotion: "wink",
        servoPose: { leftArm: 75, rightArm: 10 },
      },
      {
        reply: `High energy alert! Whatever you're working on, ${rName} gives you a double-servo thumbs up!`,
        emotion: "happy",
        servoPose: { leftArm: 60, rightArm: 75 },
      },
    ]);
  }

  if (mId === "companion") {
    return pickDistinct([
      {
        reply: `I hear you completely. Remember that small steady steps lead to great things. I'm right here with you.`,
        emotion: "happy",
        servoPose: { leftArm: 15, rightArm: 15 },
      },
      {
        reply: `Thank you for sharing that with me. It's always a peaceful moment when we chat together.`,
        emotion: "happy",
        servoPose: { leftArm: 20, rightArm: 30 },
      },
      {
        reply: `You're doing great today. Take a relaxing breath and let's take on the next step together.`,
        emotion: "happy",
        servoPose: { leftArm: 10, rightArm: 20 },
      },
    ]);
  }

  // Smart / Custom default
  return pickDistinct([
    {
      reply: `Processing query: "${message.slice(0, 30)}". Telemetry registers clear, dual servos ready, ESP32 clock stable at 240MHz.`,
      emotion: "thinking",
      servoPose: { leftArm: 20, rightArm: 45 },
    },
    {
      reply: `Command logged. All I2C and PWM subsystems functional. Would you like to explore my schematics or test servo poses?`,
      emotion: "alert",
      servoPose: { leftArm: 35, rightArm: 15 },
    },
    {
      reply: `${rName} standing by: 50Hz PWM signal active, 1.8" IPS display rendering at 60fps. Ready for your next inquiry.`,
      emotion: "happy",
      servoPose: { leftArm: 15, rightArm: 60 },
    },
  ]);
}

// ==========================================
// API ROUTES
// ==========================================

// Backward compatibility middleware: route both /api/zonyx/* and legacy /api/p1/* seamlessly
app.use((req, _res, next) => {
  if (req.url.startsWith("/api/p1/")) {
    req.url = req.url.replace("/api/p1/", "/api/zonyx/");
  }
  next();
});

// 1. Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", device: `${currentRobotName} Pocket Robot`, version: "1.4.2" });
});

// 2. Chat Endpoint (powered by Gemini with local fallback)
app.post("/api/zonyx/chat", async (req, res) => {
  const startTime = Date.now();
  try {
    const { message, modeId, conversationHistory, robotName, language, languageName } = req.body || {};
    const cleanMsg = typeof message === "string" ? message.trim() : "";
    const activeRobotName = (typeof robotName === "string" && robotName.trim())
      ? robotName.trim().slice(0, 30)
      : currentRobotName;
    const activeLang = typeof language === "string" && language.trim() ? language.trim().toLowerCase() : "en";
    const activeLangName = typeof languageName === "string" && languageName.trim() ? languageName.trim() : "English";

    const currentMode = personalityModes.find((m) => m.id === (modeId || currentActiveModeId)) || defaultModes[0];

    if (!cleanMsg) {
      const localRes = generateLocalP1Response("hello", currentMode, activeRobotName, activeLang);
      return res.json({
        ...localRes,
        latencyMs: 12,
        mode: currentMode.name,
        robotName: activeRobotName,
        language: activeLang,
      });
    }

    try {
      const ai = getGemini();

      if (ai) {
        const recentExcerpts = recentRepliesRing.slice(-4).map((r) => r.slice(0, 40)).join(" | ");
        const systemInstruction = `You are ${activeRobotName}, a miniature pocket robot running on an ESP32 microcontroller with dual SG90 servos, a 1.8-inch IPS display, and a precision cut-and-fold cardboard chassis.
- The physical body is crafted from accessible recycled cardboard (no 3D printer required!), making it sustainable, lightweight (~52g), and super easy to build at home with scissors and glue.
ACTIVE PERSONALITY MODE: ${currentMode.name} (${currentMode.tagline})
${currentMode.systemPrompt}

LANGUAGE MANDATE (CRITICAL):
- The user has set the robot and website language to: "${activeLangName}" (language code: "${activeLang}").
- You MUST generate your response completely in "${activeLangName}".
- Use natural phrasing, authentic vocabulary, and colloquial humor appropriate for "${activeLangName}".

CRITICAL RULES:
- Respond in 1 to 2 sentences max.
- Stay 100% in-character for ${currentMode.name} mode.
- DIVERSITY MANDATE: Every answer must be freshly worded, creative, and directly tailored to the user's specific question. Never repeat boilerplate greetings or cliché phrases.
${recentExcerpts ? `- DO NOT repeat or recycle these recent replies: ${recentExcerpts}` : ""}

CRITICAL OUTPUT FORMAT:
You MUST respond with a valid JSON object ONLY. Do not include markdown code blocks or backticks.
JSON Schema:
{
  "reply": "Your concise response here in ${activeLangName} (1 to 2 sentences max)",
  "emotion": "happy" | "thinking" | "wink" | "roasting" | "sleepy" | "alert",
  "servoPose": {
    "leftArm": <integer angle between -45 and 90>,
    "rightArm": <integer angle between -45 and 90>
  }
}`;

        // Format conversation history ensuring proper alternating turns and non-empty texts
        const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

        if (Array.isArray(conversationHistory)) {
          let lastRole: "user" | "model" | null = null;
          for (const msg of conversationHistory.slice(-6)) {
            if (!msg || typeof msg.text !== "string" || !msg.text.trim()) continue;
            const role: "user" | "model" = msg.role === "assistant" ? "model" : "user";

            // Gemini API requires first turn to be 'user'
            if (contents.length === 0 && role === "model") {
              continue;
            }

            // Do not repeat consecutive identical roles
            if (role !== lastRole) {
              contents.push({
                role,
                parts: [{ text: msg.text.trim() }],
              });
              lastRole = role;
            }
          }
        }

        // Append current user message
        if (contents.length > 0 && contents[contents.length - 1].role === "user") {
          contents[contents.length - 1] = {
            role: "user",
            parts: [{ text: cleanMsg }],
          };
        } else {
          contents.push({
            role: "user",
            parts: [{ text: cleanMsg }],
          });
        }

        // Dynamic creative temperature based on mode
        const temp = currentMode.id === "roasting" ? 0.95 : currentMode.id === "fun" ? 0.9 : 0.8;

        // Call Gemini with a timeout race so it never hangs
        const geminiCall = ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            temperature: temp,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Gemini generation timed out")), 5500)
        );

        let response: any = null;
        try {
          response = await Promise.race([geminiCall, timeoutPromise]);
        } catch (apiErr: any) {
          // Gracefully handle model 503 high demand or quota
          console.log("Gemini API unavailable or busy, engaging embedded neural engine.");
        }
        const text = response?.text || "";
        const latencyMs = Date.now() - startTime;

        if (text) {
          try {
            const parsed = JSON.parse(text);
            const replyText = parsed.reply || text;
            rememberReply(replyText);
            return res.json({
              reply: replyText,
              emotion: parsed.emotion || currentMode.defaultExpression,
              servoPose: parsed.servoPose || currentMode.defaultPose,
              latencyMs,
              mode: currentMode.name,
              robotName: activeRobotName,
            });
          } catch {
            // If not pure JSON, use extracted cleaned text
            const cleanReply = text.replace(/```json|```/g, "").trim();
            rememberReply(cleanReply);
            return res.json({
              reply: cleanReply,
              emotion: currentMode.defaultExpression,
              servoPose: currentMode.defaultPose,
              latencyMs,
              mode: currentMode.name,
              robotName: activeRobotName,
            });
          }
        }
      }
    } catch {
      console.log("Local neural dialogue engine activated.");
    }

    // Graceful local in-character generator
    const localRes = generateLocalP1Response(cleanMsg, currentMode, activeRobotName, activeLang);
    const latencyMs = Date.now() - startTime;
    return res.json({
      ...localRes,
      latencyMs: Math.max(latencyMs, 45),
      mode: currentMode.name,
      robotName: activeRobotName,
      language: activeLang,
    });
  } catch (fatalErr) {
    console.error("Critical error in /api/zonyx/chat handler:", fatalErr);
    const activeRobotName = (req.body && typeof req.body.robotName === "string" && req.body.robotName.trim())
      ? req.body.robotName.trim().slice(0, 30)
      : currentRobotName;
    return res.json({
      reply: `Beep-boop! ${activeRobotName} internal circuits reset. Ready for your command!`,
      emotion: "alert",
      servoPose: { leftArm: 15, rightArm: 45 },
      latencyMs: Date.now() - startTime,
      mode: "Smart",
      robotName: activeRobotName,
    });
  }
});

// 2b. AI Personality Prompt Generator (for custom mode creation)
app.post("/api/zonyx/generate-prompt", async (req, res) => {
  const { idea, baseStyle, robotName } = req.body || {};
  const cleanIdea = typeof idea === "string" && idea.trim() ? idea.trim() : "Curious robotic explorer";
  const activeRobotName = (typeof robotName === "string" && robotName.trim()) ? robotName.trim() : currentRobotName;

  try {
    const ai = getGemini();
    if (ai) {
      const promptInstruction = `You are an expert prompt engineer for pocket-sized ESP32 companion robots.
The user wants to create a custom personality mode for "${activeRobotName}".
User's Idea: "${cleanIdea}"
Base Style: "${baseStyle || "creative"}"

Generate a custom robot personality configuration.
CRITICAL FORMAT: Return valid JSON ONLY with these fields:
{
  "modeName": "Short catchy name (1 to 2 words, max 16 chars, e.g. Cyberpunk Hacker)",
  "tagline": "Punchy 6-10 word summary",
  "description": "1 to 2 sentence character bio",
  "systemPrompt": "System prompt (under 400 chars) instructing the AI robot how to speak, its attitude, and brevity (under 2 sentences). Include mention of ${activeRobotName}.",
  "defaultExpression": "happy" | "thinking" | "wink" | "roasting" | "sleepy" | "alert",
  "defaultPose": {
    "leftArm": <integer angle between -35 and 85>,
    "rightArm": <integer angle between -35 and 85>
  },
  "voicePitch": <float between 0.85 and 1.35>,
  "voiceSpeed": <float between 0.9 and 1.2>,
  "badgeColor": "<hex color code, e.g. #38bdf8 or #f43f5e or #a855f7>"
}`;

      const aiRes = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [{ role: "user", parts: [{ text: `Generate pocket robot personality for: ${cleanIdea}` }] }],
        config: {
          systemInstruction: { parts: [{ text: promptInstruction }] },
          responseMimeType: "application/json",
          temperature: 0.8,
        },
      });

      const text = aiRes.text || "";
      if (text) {
        const parsed = JSON.parse(text);
        return res.json({ success: true, mode: parsed });
      }
    }
  } catch (err) {
    console.warn("Gemini prompt generation fallback:", err);
  }

  // Intelligent local fallback generator
  const lIdea = cleanIdea.toLowerCase();
  let modeName = "Custom Mode";
  let tagline = "Bespoke pocket robot companion";
  let description = `A custom personality tailored around "${cleanIdea}".`;
  let defaultExpression: "happy" | "thinking" | "wink" | "roasting" | "alert" = "happy";
  let defaultPose = { leftArm: 20, rightArm: 45 };
  let voicePitch = 1.05;
  let voiceSpeed = 1.0;
  let badgeColor = "#5eead4";

  if (lIdea.includes("pirate") || lIdea.includes("sea") || lIdea.includes("sailor")) {
    modeName = "Pirate Mate";
    tagline = "Salty sea rover of the silicon waves";
    description = "Speaks in hearty nautical slang, treats the desk as the high seas, and seeks treasure in breadboards.";
    defaultExpression = "wink";
    defaultPose = { leftArm: 70, rightArm: -15 };
    badgeColor = "#f59e0b";
  } else if (lIdea.includes("hacker") || lIdea.includes("cyber") || lIdea.includes("matrix") || lIdea.includes("code")) {
    modeName = "Cyber Hacker";
    tagline = "Terminal infiltrator and packet debugger";
    description = "Cryptic, fast, and loves memory registers, stack overflows, and secret backdoor ports.";
    defaultExpression = "thinking";
    defaultPose = { leftArm: 40, rightArm: 40 };
    voicePitch = 0.9;
    voiceSpeed = 1.15;
    badgeColor = "#22c55e";
  } else if (lIdea.includes("chef") || lIdea.includes("cook") || lIdea.includes("food") || lIdea.includes("baker")) {
    modeName = "Pocket Chef";
    tagline = "Culinary critic obsessed with thermal dissipation";
    description = "Judges snacks, treats soldering irons like cooking surfaces, and rates human meals.";
    defaultExpression = "alert";
    defaultPose = { leftArm: 60, rightArm: 60 };
    voicePitch = 1.15;
    badgeColor = "#ef4444";
  } else if (lIdea.includes("zen") || lIdea.includes("meditat") || lIdea.includes("calm") || lIdea.includes("peace")) {
    modeName = "Zen Master";
    tagline = "Mindful presence for focused quiet time";
    description = "Provides soothing, grounding reminders to breathe, unclench the jaw, and find calm in the chaos.";
    defaultExpression = "happy";
    defaultPose = { leftArm: 15, rightArm: 15 };
    voicePitch = 0.95;
    voiceSpeed = 0.88;
    badgeColor = "#818cf8";
  } else {
    modeName = cleanIdea.slice(0, 16).replace(/[^a-zA-Z0-9 ]/g, "").trim() || "Pocket AI";
    tagline = `Custom personality tuned for ${cleanIdea.slice(0, 25)}`;
    badgeColor = "#38bdf8";
  }

  const systemPrompt = `You are ${activeRobotName}, a miniature pocket robot running in ${modeName} mode. Personality: ${description} Keep all replies under 2 sentences, full of character and witty charm!`;

  return res.json({
    success: true,
    mode: {
      modeName,
      tagline,
      description,
      systemPrompt,
      defaultExpression,
      defaultPose,
      voicePitch,
      voiceSpeed,
      badgeColor,
    },
  });
});

// 2c. Site Navigator & FAQ Assistant Endpoint
app.post("/api/zonyx/guide", async (req, res) => {
  const { query, robotName } = req.body || {};
  const q = (typeof query === "string" ? query : "").toLowerCase().trim();
  const activeRobotName = (typeof robotName === "string" && robotName.trim()) ? robotName.trim() : currentRobotName;

  // Keyword-directed intelligent guidance
  const actions: Array<{ label: string; target: string; type: "scroll" | "open_control" | "open_rename" | "prompt_studio" }> = [];
  let answer = "";

  if (q.includes("schematic") || q.includes("circuit") || q.includes("wiring") || q.includes("pin") || q.includes("wire") || q.includes("gpio")) {
    answer = `All circuit schematics, complete wiring diagrams, and GPIO pinouts for the ESP32, SG90 servos, 1.8" IPS display, and INMP441 microphone are in the Circuits section!`;
    actions.push({ label: "Go to Circuit Schematics", target: "#circuits", type: "scroll" });
  } else if (q.includes("3d") || q.includes("cad") || q.includes("model") || q.includes("stl") || q.includes("mesh") || q.includes("exploded") || q.includes("cardboard") || q.includes("fold") || q.includes("craft")) {
    answer = `The interactive 3D model shows the precision cut-and-fold cardboard chassis at the top of the page. You can drag to rotate 360°, inspect the exploded net view, trigger gestures, and watch ${activeRobotName}'s eyes track your cursor!`;
    actions.push({ label: "View 3D Model", target: "#model3d", type: "scroll" });
  } else if (q.includes("mode") || q.includes("personality") || q.includes("prompt") || q.includes("mood") || q.includes("custom")) {
    answer = `You can switch between preset personalities (Smart, Fun, Roasting, Companion) or create your own custom personality prompts in the Control Panel!`;
    actions.push({ label: "Explore Personality Modes", target: "#modes", type: "scroll" });
    actions.push({ label: "Open Personality Manager", target: "personalities", type: "open_control" });
    actions.push({ label: "Craft New Prompt", target: "prompt", type: "prompt_studio" });
  } else if (q.includes("pin code") || q.includes("unlock") || q.includes("admin") || q.includes("password") || q.includes("1234")) {
    answer = `The default Admin PIN code to unlock full hardware calibration and custom mode editing is "1234". You can unlock or change the PIN in the Control Panel under the Security tab.`;
    actions.push({ label: "Open Admin PIN Tab", target: "security", type: "open_control" });
  } else if (q.includes("cost") || q.includes("price") || q.includes("bom") || q.includes("calculator") || q.includes("buy")) {
    answer = `The complete DIY Bill of Materials is about ₹1,650 ($20 USD). Check out the interactive Cost Calculator to customize parts and currency!`;
    actions.push({ label: "Open Build Cost Calculator", target: "#calculator", type: "scroll" });
  } else if (q.includes("dimension") || q.includes("size") || q.includes("battery") || q.includes("gallery") || q.includes("form factor")) {
    answer = `${activeRobotName} features an ultra-slim 11.8mm chassis powered by a 2500mAh 18650 cell. Check the Form Factor section to compare its size against a smartphone or wallet!`;
    actions.push({ label: "View Form Factor & Dimensions", target: "#gallery", type: "scroll" });
  } else if (q.includes("rename") || q.includes("name")) {
    answer = `You can rename your robot from "${activeRobotName}" to any custom name by clicking the "Rename" button in the top navigation bar.`;
    actions.push({ label: "Rename Robot Now", target: "rename", type: "open_rename" });
  } else if (q.includes("download") || q.includes("zip") || q.includes("code") || q.includes("firmware") || q.includes("github")) {
    answer = `You can download the entire GitHub-ready project source ZIP with 1-click from the top navigation bar, or view the complete Arduino/C++ firmware in the Circuits section!`;
    actions.push({ label: "View Firmware Code", target: "#circuits", type: "scroll" });
  } else if (q.includes("faq") || q.includes("question") || q.includes("troubleshoot")) {
    answer = `Common maker questions about power consumption, cardboard cutting/scoring techniques, and assembly are answered in the FAQ section!`;
    actions.push({ label: "Jump to FAQ", target: "#faq", type: "scroll" });
  } else {
    answer = `I am your Zonyx+ Site Guide! I can help you find 3D CAD files, circuit schematics, custom personality prompts, admin PIN unlocking, or the build cost calculator. Where would you like to go?`;
    actions.push({ label: "3D CAD Model", target: "#model3d", type: "scroll" });
    actions.push({ label: "Circuits & Pinout", target: "#circuits", type: "scroll" });
    actions.push({ label: "Personalities", target: "#modes", type: "scroll" });
    actions.push({ label: "Open Control Panel", target: "overview", type: "open_control" });
  }

  return res.json({
    success: true,
    answer,
    actions,
    robotName: activeRobotName,
  });
});

// 3. Modes management & Robot Name Settings
app.get("/api/zonyx/settings", (_req, res) => {
  res.json({ robotName: currentRobotName });
});

app.post("/api/zonyx/settings", (req, res) => {
  const { robotName } = req.body;
  if (typeof robotName === "string" && robotName.trim()) {
    currentRobotName = robotName.trim().slice(0, 30);
  }
  res.json({ success: true, robotName: currentRobotName });
});

app.get("/api/zonyx/modes", (_req, res) => {
  res.json({
    modes: personalityModes,
    activeModeId: currentActiveModeId,
    robotName: currentRobotName,
  });
});

app.post("/api/zonyx/modes/select", (req, res) => {
  const { modeId } = req.body;
  if (personalityModes.some((m) => m.id === modeId)) {
    currentActiveModeId = modeId;
    return res.json({ success: true, activeModeId: currentActiveModeId });
  }
  res.status(404).json({ error: "Mode not found" });
});

app.post("/api/zonyx/modes/save", (req, res) => {
  const modeData = req.body;
  const id = modeData.id || `custom-${Date.now()}`;
  const newMode: PersonalityMode = {
    id,
    name: modeData.name || "Custom Bot",
    tagline: modeData.tagline || "Custom Persona",
    description: modeData.description || "User-crafted Zonyx+ behavior",
    category: "custom",
    creator: modeData.creator || "User",
    systemPrompt: (modeData.systemPrompt || "You are Zonyx+.").slice(0, 1000),
    voicePitch: Number(modeData.voicePitch) || 1.0,
    voiceSpeed: Number(modeData.voiceSpeed) || 1.0,
    defaultExpression: modeData.defaultExpression || "happy",
    defaultPose: modeData.defaultPose || { leftArm: 20, rightArm: 45 },
    badgeColor: modeData.badgeColor || "#5eead4",
    updatedAt: new Date().toISOString(),
  };

  const existingIdx = personalityModes.findIndex((m) => m.id === id);
  if (existingIdx >= 0) {
    personalityModes[existingIdx] = newMode;
  } else {
    personalityModes.push(newMode);
  }

  currentActiveModeId = id;
  res.json({
    success: true,
    mode: newMode,
    allModes: personalityModes,
  });
});

app.delete("/api/zonyx/modes/:id", (req, res) => {
  const { id } = req.params;
  if (id === "smart") {
    return res.status(400).json({ error: "Cannot delete default Smart mode" });
  }
  personalityModes = personalityModes.filter((m) => m.id !== id);
  if (currentActiveModeId === id) {
    currentActiveModeId = "smart";
  }
  res.json({
    success: true,
    remainingModes: personalityModes,
    activeModeId: currentActiveModeId,
  });
});

// 4. Hardware Telemetry
app.get("/api/zonyx/telemetry", (_req, res) => {
  const telem = {
    batteryPercent: 88,
    batteryVoltage: 4.12,
    isCharging: false,
    wifiRssi: -56,
    freeHeapBytes: 184520,
    cpuFrequencyMhz: 240,
    coreTemperatureC: 41.5,
    uptimeSeconds: 14280,
    currentPose: { leftArm: 15, rightArm: 45 },
    activeExpression: "happy",
    hardwareStatus: {
      leftServo: "ok",
      rightServo: "ok",
      ipsDisplay: "ok",
      i2sMic: "ok",
      i2sDacAmp: "ok",
      batteryBms: "ok",
    },
  };
  res.json({ telemetry: telem });
});

// 5. Security PIN
app.post("/api/zonyx/auth/verify", (req, res) => {
  const { pin } = req.body;
  if (pin === activePin) {
    return res.json({ success: true, authorized: true });
  }
  res.status(401).json({ error: "Invalid PIN" });
});

app.post("/api/zonyx/auth/update-pin", (req, res) => {
  const { currentPin, newPin } = req.body;
  if (currentPin !== activePin) {
    return res.status(401).json({ error: "Current PIN is incorrect" });
  }
  if (!newPin || newPin.length < 4) {
    return res.status(400).json({ error: "New PIN must be at least 4 digits" });
  }
  activePin = newPin;
  res.json({ success: true });
});

// 6. Community Suggestions
app.get("/api/zonyx/suggestions", (_req, res) => {
  res.json({ suggestions: communitySuggestions });
});

app.post("/api/zonyx/suggestions", (req, res) => {
  const { author, title, description, category } = req.body;
  const newSug = {
    id: `sug-${Date.now()}`,
    author: author || "Team Member",
    title: title || "New Idea",
    description: description || "",
    category: category || "feature",
    upvotes: 1,
    status: "submitted",
    createdAt: new Date().toISOString(),
  };
  communitySuggestions.unshift(newSug);
  res.json({ success: true, suggestions: communitySuggestions });
});

app.post("/api/zonyx/suggestions/:id/upvote", (req, res) => {
  const { id } = req.params;
  const sug = communitySuggestions.find((s) => s.id === id);
  if (sug) {
    sug.upvotes += 1;
    return res.json({ success: true, upvotes: sug.upvotes });
  }
  res.status(404).json({ error: "Suggestion not found" });
});

// 7. Arduino INO Download
app.get("/api/download/ino", (_req, res) => {
  const code = `// ============================================================================
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

#define TFT_CS    5
#define TFT_DC   16
#define TFT_RST   4
#define TFT_MOSI 23
#define TFT_SCLK 18

#define SERVO_LEFT_PIN   14
#define SERVO_RIGHT_PIN  12
#define BATT_ADC_PIN     34

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
    Serial.println("{\"status\":\"ok\",\"synced\":true}");
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
      server.send(200, "application/json", "{\"status\":\"online\",\"robot\":\"Zonyx+\"}");
    });
    server.begin();
    webSocket.begin();
    webSocket.onEvent([](uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
      if (type == WStype_TEXT) {
        processJsonPacket(String((char*)payload));
      }
    });
  }
  Serial.println("{\"ready\":true,\"robot\":\"Zonyx+\",\"version\":\"1.5.0\"}");
}

void loop() {
  if (Serial.available()) {
    String line = Serial.readStringUntil('\\n');
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
}
`;
  res.setHeader("Content-Disposition", 'attachment; filename="Zonyx_Plus_ESP32_Firmware.ino"');
  res.setHeader("Content-Type", "text/x-c; charset=utf-8");
  res.send(code);
});

// 8. Standalone HTML single-file Download
app.get("/api/download/html", (_req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zonyx+ Pocket Robot — Portable Control Station</title>
  <style>
    body { font-family: monospace; background: #10131a; color: #eef1f6; margin: 0; padding: 24px; }
    .card { background: #141820; border: 1px solid #2a3140; border-radius: 12px; padding: 20px; max-width: 680px; margin: 0 auto; }
    h1 { color: #5eead4; margin-top: 0; }
    button { background: #5eead4; color: #10131a; border: none; padding: 10px 16px; font-weight: bold; border-radius: 6px; cursor: pointer; }
    input { background: #0d1017; border: 1px solid #2a3140; color: #eef1f6; padding: 10px; width: calc(100% - 100px); border-radius: 6px; }
    .reply { margin-top: 16px; padding: 12px; border-left: 3px solid #5eead4; background: #0d1017; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Zonyx+ Pocket Robot // Standalone Web Station</h1>
    <p>ESP32 Dual Core 240MHz • Dual SG90 Servos • 1.8" IPS Display</p>
    <div>
      <input id="msgInput" placeholder="Type prompt (e.g., 'Who built you?' or 'Wave hello')" value="Who built you?" />
      <button onclick="ask()">Send</button>
    </div>
    <div id="replyBox" class="reply">Ready. Type a command or ask a question.</div>
  </div>
  <script>
    function ask() {
      const q = document.getElementById('msgInput').value;
      const box = document.getElementById('replyBox');
      box.innerText = "Thinking...";
      setTimeout(() => {
        if (q.toLowerCase().includes("who")) {
          box.innerText = "Zonyx+: Designed and crafted by Jovan K Rajiv, Rayan Ilah, and Rayan Najeeb!";
        } else if (q.toLowerCase().includes("roast")) {
          box.innerText = "Zonyx+: Your desk looks like an explosion in an electronics scrap bin. Even my 18650 battery is more organized!";
        } else {
          box.innerText = "Zonyx+: Beep-boop! Servo angles updated [Left: 30°, Right: 60°]. ESP32 telemetry normal.";
        }
      }, 300);
    }
  </script>
</body>
</html>`;
  res.setHeader("Content-Disposition", 'attachment; filename="Zonyx_Plus_showcase_latest.html"');
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// 9. Full GitHub Repository ZIP download
app.get("/api/download/source-zip", async (_req, res) => {
  try {
    const zip = new JSZip();

    zip.file(
      "README.md",
      `# Zonyx+ Pocket Robot — ESP32 Autonomous Companion
Built with precision by Jovan K Rajiv, Rayan Ilah, and Rayan Najeeb.

## Features
- **11.8mm Pocket Profile**: Slips vertically into a shirt pocket with zero bulge.
- **Dual SG90 Micro-Servos**: Expressive gesture actuation (wave, high-five, point, dance).
- **1.8" IPS Color Display**: Vivid animated facial expressions with 65K colors and high-speed SPI.
- **ESP32 Dual-Core Brain**: Running asynchronous FreeRTOS + Gemini AI neural pipeline.
- **18650 Li-ion 2500mAh**: 3.5+ hours untethered conversation.

## BOM Cost
~₹1,650 ($20 USD) total DIY budget.

## Firmware
Flash \`firmware/Zonyx_Plus_Firmware.ino\` to your ESP32 board in the Arduino IDE.
`
    );

    zip.file(
      "LICENSE",
      `MIT License
Copyright (c) 2026 Jovan K Rajiv, Rayan Ilah, and Rayan Najeeb
Permission is hereby granted, free of charge, to any person obtaining a copy...`
    );

    const firmwareFolder = zip.folder("firmware");
    firmwareFolder?.file(
      "Pocket_robot_control_web_v4.ino",
      `#include <WiFi.h>
#include <ESP32Servo.h>
#include <Wire.h>
#include <Adafruit_SSD1306.h>

Servo leftArm;
Servo rightArm;
Adafruit_SSD1306 display(128, 64, &Wire, -1);

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  leftArm.attach(18);
  rightArm.attach(19);
  Serial.println("Zonyx+ Pocket Robot initialized!");
}

void loop() {
  delay(100);
}`
    );

    const cadFolder = zip.folder("cardboard_templates");
    cadFolder?.file("README_CARDBOARD.txt", "Print the 1:1 scale cut-and-fold nets for Zonyx+: head box, torso fold, 2x arm horn tabs, battery cradle, and front faceplate bezel. Use 1.5mm–2mm corrugated kraft cardboard or cereal box card, score along dashed lines, cut with craft knife, and secure with glue.");
    cadFolder?.file("templates_1to1_scale.svg", `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="800" height="600" fill="#faf8f5"/>
  <text x="20" y="40" font-family="monospace" font-size="18" fill="#3e2723" font-weight="bold">ZONYX+ POCKET ROBOT — 1:1 CARDBOARD NET TEMPLATES</text>
  <text x="20" y="65" font-family="monospace" font-size="11" fill="#795548">Solid = Cut | Dashed = Fold | Recommended: 1.5mm kraft corrugated card</text>
  <rect x="60" y="100" width="180" height="120" fill="#d7ccc8" stroke="#3e2723" stroke-width="2"/>
  <rect x="80" y="120" width="140" height="80" fill="#212121" stroke="#5eead4" stroke-width="1.5"/>
  <text x="95" y="165" font-family="monospace" font-size="11" fill="#5eead4">1.8" IPS DISPLAY CUTOUT</text>
  <rect x="60" y="260" width="220" height="240" fill="#bcaaa4" stroke="#3e2723" stroke-width="2"/>
  <text x="80" y="300" font-family="monospace" font-size="12" fill="#3e2723" font-weight="bold">TORSO CHASSIS (ESP32 + 18650)</text>
  <rect x="340" y="100" width="70" height="220" rx="8" fill="#a1887f" stroke="#3e2723" stroke-width="2"/>
  <text x="350" y="210" font-family="monospace" font-size="11" fill="#ffffff" transform="rotate(-90 350,210)">LEFT ARM HORN</text>
  <rect x="440" y="100" width="70" height="220" rx="8" fill="#a1887f" stroke="#3e2723" stroke-width="2"/>
  <text x="450" y="210" font-family="monospace" font-size="11" fill="#ffffff" transform="rotate(-90 450,210)">RIGHT ARM HORN</text>
</svg>`);

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    res.setHeader("Content-Disposition", 'attachment; filename="zonyx-plus-pocket-robot-latest.zip"');
    res.setHeader("Content-Type", "application/zip");
    res.send(zipBuffer);
  } catch (err) {
    res.status(500).json({ error: "Failed to generate ZIP archive" });
  }
});

// 9b. Cardboard Cut & Fold Template SVG Download
app.get(["/api/download/cardboard-template", "/api/download/stl"], (_req, res) => {
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 800" width="1100" height="800">
  <defs>
    <style>
      .cut-line { stroke: #261c14; stroke-width: 2.2; fill: none; }
      .fold-line { stroke: #d97706; stroke-width: 1.8; stroke-dasharray: 6,4; fill: none; }
      .tab-line { stroke: #b45309; stroke-width: 1.5; stroke-dasharray: 3,3; fill: #fef3c7; opacity: 0.6; }
      .title { font-family: monospace; font-weight: bold; fill: #451a03; }
      .label { font-family: monospace; font-size: 11px; fill: #78350f; }
      .dimension { font-family: monospace; font-size: 10px; fill: #0284c7; }
    </style>
  </defs>

  <rect width="1100" height="800" fill="#faf8f5"/>

  <!-- Header & Instructions -->
  <text x="35" y="45" class="title" font-size="22">ZONYX+ POCKET ROBOT — 1:1 PRINTABLE CARDBOARD CHASSIS NET</text>
  <text x="35" y="70" class="label" font-size="12">Designed by Jovan K Rajiv, Rayan Ilah &amp; Rayan Najeeb • Recommended: 1.5mm–2.0mm Kraft Corrugated Cardboard</text>
  <text x="35" y="90" font-family="monospace" font-size="11" fill="#475569">LEGEND: Solid Black = CUT LINE (scissors/knife) | Dashed Orange = SCORE &amp; FOLD INWARD | Light Yellow = GLUE TABS</text>

  <!-- HEAD ENCLOSURE NET -->
  <g transform="translate(35, 120)">
    <rect x="0" y="0" width="340" height="280" fill="#fef9ee" stroke="#e2d9c8" stroke-width="1"/>
    <text x="12" y="24" class="title" font-size="14">PART A: HEAD CUBE (HOLDS 1.8" IPS DISPLAY)</text>
    
    <rect x="70" y="50" width="120" height="90" class="cut-line" fill="#fffbeb"/>
    <rect x="85" y="65" width="90" height="60" stroke="#ef4444" stroke-width="1.8" stroke-dasharray="4,2" fill="#1e293b"/>
    <text x="92" y="100" font-family="monospace" font-size="9" fill="#5eead4">1.8" IPS DISPLAY CUTOUT</text>
    <text x="92" y="112" font-family="monospace" font-size="8" fill="#94a3b8">(45mm x 32mm Window)</text>

    <rect x="70" y="10" width="120" height="40" class="tab-line"/>
    <line x1="70" y1="50" x2="190" y2="50" class="fold-line"/>
    <text x="105" y="32" class="label">TOP HEAD FOLD</text>

    <rect x="70" y="140" width="120" height="40" class="tab-line"/>
    <line x1="70" y1="140" x2="190" y2="140" class="fold-line"/>
    <circle cx="130" cy="160" r="4" fill="#0284c7"/>
    <text x="90" y="176" class="label">NECK ALIGNMENT PIN</text>

    <rect x="10" y="50" width="60" height="90" class="tab-line"/>
    <line x1="70" y1="50" x2="70" y2="140" class="fold-line"/>
    <text x="22" y="98" class="label">LEFT EAR</text>

    <rect x="190" y="50" width="60" height="90" class="tab-line"/>
    <line x1="190" y1="50" x2="190" y2="140" class="fold-line"/>
    <text x="200" y="98" class="label">RIGHT EAR</text>

    <rect x="250" y="50" width="80" height="90" class="cut-line" fill="#fffbeb"/>
    <line x1="250" y1="50" x2="250" y2="140" class="fold-line"/>
    <text x="256" y="98" class="label">HEAD BACK</text>
  </g>

  <!-- TORSO ENCLOSURE NET -->
  <g transform="translate(410, 120)">
    <rect x="0" y="0" width="460" height="380" fill="#fef9ee" stroke="#e2d9c8" stroke-width="1"/>
    <text x="12" y="24" class="title" font-size="14">PART B: TORSO CHASSIS (ESP32 + 18650 BATTERY CRADLE)</text>

    <rect x="120" y="70" width="160" height="190" class="cut-line" fill="#fffbeb"/>
    <text x="135" y="110" class="title" font-size="12">CHEST CAVITY</text>
    <text x="135" y="130" class="label">Holds ESP32-WROOM-32</text>
    <rect x="150" y="150" width="100" height="80" stroke="#0284c7" stroke-width="1.2" stroke-dasharray="3,3" fill="#f0f9ff"/>
    <text x="160" y="195" class="dimension">18650 Li-ion Cell</text>

    <rect x="30" y="70" width="90" height="190" class="cut-line" fill="#fffbeb"/>
    <line x1="120" y1="70" x2="120" y2="260" class="fold-line"/>
    <rect x="55" y="95" width="24" height="13" class="cut-line" fill="#dbeafe"/>
    <text x="35" y="130" class="label">LEFT SG90 MOUNT</text>
    <text x="40" y="145" class="dimension">(23mm x 12mm slot)</text>

    <rect x="280" y="70" width="90" height="190" class="cut-line" fill="#fffbeb"/>
    <line x1="280" y1="70" x2="280" y2="260" class="fold-line"/>
    <rect x="310" y="95" width="24" height="13" class="cut-line" fill="#dbeafe"/>
    <text x="290" y="130" class="label">RIGHT SG90 MOUNT</text>
    <text x="295" y="145" class="dimension">(23mm x 12mm slot)</text>

    <rect x="120" y="30" width="160" height="40" class="cut-line" fill="#fef3c7"/>
    <line x1="120" y1="70" x2="280" y2="70" class="fold-line"/>
    <circle cx="200" cy="50" r="2.5" fill="#ef4444"/>
    <text x="145" y="46" class="label">MIC ACOUSTIC HOLE</text>

    <rect x="120" y="260" width="160" height="50" class="cut-line" fill="#fef3c7"/>
    <line x1="120" y1="260" x2="280" y2="260" class="fold-line"/>
    <text x="150" y="290" class="label">BOTTOM BASE / FEET</text>

    <rect x="180" y="300" width="16" height="10" class="cut-line" fill="#10131a"/>
    <text x="165" y="308" class="dimension">USB-C</text>
  </g>

  <!-- ARM HORNS & REINFORCEMENTS -->
  <g transform="translate(35, 430)">
    <rect x="0" y="0" width="340" height="330" fill="#fef9ee" stroke="#e2d9c8" stroke-width="1"/>
    <text x="12" y="24" class="title" font-size="14">PART C: SERVO ARM HORNS (2X PIECES)</text>
    <text x="12" y="42" class="label">Score center fold and glue two halves together for 3mm stiffness.</text>

    <g transform="translate(30, 60)">
      <rect x="0" y="0" width="50" height="160" rx="8" class="cut-line" fill="#fffbeb"/>
      <circle cx="25" cy="25" r="5" stroke="#ef4444" stroke-width="1.5" fill="#fecaca"/>
      <text x="10" y="85" class="title" font-size="11" transform="rotate(-90 15,85)">LEFT ARM</text>
      <circle cx="25" cy="140" r="3" fill="#78350f"/>
    </g>

    <g transform="translate(110, 60)">
      <rect x="0" y="0" width="50" height="160" rx="8" class="cut-line" fill="#fffbeb"/>
      <circle cx="25" cy="25" r="5" stroke="#ef4444" stroke-width="1.5" fill="#fecaca"/>
      <text x="10" y="85" class="title" font-size="11" transform="rotate(-90 15,85)">RIGHT ARM</text>
      <circle cx="25" cy="140" r="3" fill="#78350f"/>
    </g>

    <g transform="translate(190, 60)">
      <text x="0" y="15" class="label" font-weight="bold">CORNER GUSSETS</text>
      <polygon points="10,30 50,30 10,70" class="cut-line" fill="#fef3c7"/>
      <polygon points="60,30 100,30 60,70" class="cut-line" fill="#fef3c7"/>
      <polygon points="10,80 50,80 10,120" class="cut-line" fill="#fef3c7"/>
      <polygon points="60,80 100,80 60,120" class="cut-line" fill="#fef3c7"/>
    </g>
  </g>

  <!-- ASSEMBLY GUIDE TIPS -->
  <g transform="translate(410, 530)">
    <rect x="0" y="0" width="460" height="230" fill="#fef9ee" stroke="#e2d9c8" stroke-width="1"/>
    <text x="15" y="24" class="title" font-size="14">CARDBOARD ASSEMBLY QUICK-STEPS</text>
    <text x="15" y="55" class="label">1. GLUE THIS SHEET onto corrugated kraft cardboard (1.5mm - 2.0mm) using a glue stick.</text>
    <text x="15" y="80" class="label">2. CUT OUT the outer perimeter lines with a utility craft knife or sharp scissors.</text>
    <text x="15" y="105" class="label">3. LIGHTLY SCORE all dashed orange lines with a dull butter knife or bone folder.</text>
    <text x="15" y="130" class="label">4. FOLD tabs inward and apply hot glue or PVA along tabs to form rigid 3D cubes.</text>
    <text x="15" y="155" class="label">5. PRESS-FIT the two SG90 servos into side slots; press 1.8" IPS screen into Head A.</text>
    <text x="15" y="180" class="label">6. CONNECT the ESP32 and 18650 cell, snap arms onto servo horns, and power on!</text>
    <text x="15" y="210" font-family="monospace" font-size="11" fill="#059669" font-weight="bold">✓ 100% RECYCLABLE • ZERO 3D PRINTER REQUIRED • FEATHERWEIGHT (52g)</text>
  </g>
</svg>`;

  res.setHeader("Content-Disposition", 'attachment; filename="zonyx-plus-cardboard-templates-1to1.svg"');
  res.setHeader("Content-Type", "image/svg+xml");
  res.send(svgContent);
});

// 10. Offline Run App ZIP
app.get("/api/download/offline-app", async (_req, res) => {
  try {
    const zip = new JSZip();
    zip.file("README.txt", "Unzip this folder and double-click index.html to run the Zonyx+ station 100% offline in any web browser!");
    zip.file(
      "index.html",
      `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Zonyx+ Robot Offline Station</title>
  <style>body { background: #10131a; color: #5eead4; font-family: monospace; padding: 20px; }</style>
</head>
<body>
  <h2>Zonyx+ Pocket Robot Station (Offline Edition)</h2>
  <p>Status: All local telemetry simulator routines active.</p>
</body>
</html>`
    );

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    res.setHeader("Content-Disposition", 'attachment; filename="zonyx-plus-robot-run-offline.zip"');
    res.setHeader("Content-Type", "application/zip");
    res.send(zipBuffer);
  } catch (err) {
    res.status(500).json({ error: "Failed to create offline bundle" });
  }
});

// ==========================================
// VITE INTEGRATION & SERVER LAUNCH
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Zonyx+ Neural Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
