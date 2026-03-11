export interface Project {
  title: string;
  description: string;
  tags: string[];
  icon: string;
  github?: string;
}

export const projects: Project[] = [
  {
    title: "Local AI Inference Stack",
    description: "On-device LLM inference with quantized models and intelligent routing",
    tags: ["M4 Mac Mini", "llama.cpp", "Qwen", "Ollama"],
    icon: "brain",
  },
  {
    title: "News Ingestion Pipeline",
    description: "Automated RSS aggregation with LLM-powered summarization",
    tags: ["RSS", "LLM", "FastAPI", "Self-hosted"],
    icon: "newspaper",
  },
  {
    title: "Haast RAW Photo Editor",
    description: "Custom RAW image processor with real-time preview and batch workflows",
    tags: ["rawpy", "numpy", "Dear PyGui"],
    icon: "camera",
  },
  {
    title: "iMessage + Claude",
    description: "Bridging Apple's messaging to Claude API via automation scripts",
    tags: ["AppleScript", "Claude API", "Real-time"],
    icon: "message",
  },
  {
    title: "Party Game Engine",
    description: "Jackbox-style multiplayer party games with real-time synchronization",
    tags: ["WebSockets", "Node.js", "React"],
    icon: "gamepad",
  },
  {
    title: "Dr.Drink Cocktail Maker",
    description: "Bluetooth-controlled automated cocktail dispenser with embedded firmware",
    tags: ["ESP32-S3", "Adafruit", "BLE"],
    icon: "cocktail",
  },
  {
    title: "NAS Rebuild",
    description: "Home storage server architecture from Helios 64 to ROCK 5B migration",
    tags: ["Helios 64", "ROCK 5B", "Storage"],
    icon: "server",
  },
  {
    title: "IBM Model M Wireless",
    description: "Converting a vintage mechanical keyboard to Bluetooth with custom firmware",
    tags: ["nice!nano v2", "ZMK", "Bluetooth"],
    icon: "keyboard",
  },
];
