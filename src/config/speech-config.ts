import {
  SpeechProcessorConfig,
  SpeechRecognitionEngine,
} from "../types/speech";

export const DEFAULT_SPEECH_CONFIG: SpeechProcessorConfig = {
  continuous: true,
  interimResults: true,
  language: "en-US",
  maxAlternatives: 3,
  enableLanguageDetection: true,
  confidenceThreshold: 0.6,
  enablePunctuation: true,
  enableSpeakerDiarization: false,
};

export const SUPPORTED_LANGUAGES = [
  { code: "en-US", name: "English (US)", region: "North America" },
  { code: "en-GB", name: "English (UK)", region: "Europe" },
  { code: "en-AU", name: "English (Australia)", region: "Oceania" },
  { code: "en-CA", name: "English (Canada)", region: "North America" },
  { code: "es-ES", name: "Spanish (Spain)", region: "Europe" },
  { code: "es-MX", name: "Spanish (Mexico)", region: "North America" },
  { code: "fr-FR", name: "French (France)", region: "Europe" },
  { code: "fr-CA", name: "French (Canada)", region: "North America" },
  { code: "de-DE", name: "German", region: "Europe" },
  { code: "it-IT", name: "Italian", region: "Europe" },
  { code: "pt-BR", name: "Portuguese (Brazil)", region: "South America" },
  { code: "pt-PT", name: "Portuguese (Portugal)", region: "Europe" },
  { code: "zh-CN", name: "Chinese (Simplified)", region: "Asia" },
  { code: "zh-TW", name: "Chinese (Traditional)", region: "Asia" },
  { code: "ja-JP", name: "Japanese", region: "Asia" },
  { code: "ko-KR", name: "Korean", region: "Asia" },
  { code: "ru-RU", name: "Russian", region: "Europe" },
  { code: "ar-SA", name: "Arabic", region: "Middle East" },
  { code: "hi-IN", name: "Hindi", region: "Asia" },
  { code: "nl-NL", name: "Dutch", region: "Europe" },
  { code: "sv-SE", name: "Swedish", region: "Europe" },
  { code: "da-DK", name: "Danish", region: "Europe" },
  { code: "no-NO", name: "Norwegian", region: "Europe" },
  { code: "fi-FI", name: "Finnish", region: "Europe" },
];

export const SPEECH_RECOGNITION_ENGINES: SpeechRecognitionEngine[] = [
  {
    name: "Web Speech API",
    isAvailable:
      typeof window !== "undefined" &&
      ("webkitSpeechRecognition" in window || "SpeechRecognition" in window),
    languages: SUPPORTED_LANGUAGES.map((lang) => lang.code),
    maxContinuousDuration: 60000, // 60 seconds
    supportsInterimResults: true,
    supportsConfidence: true,
  },
];

export const SPEECH_SETTINGS = {
  RESTART_INTERVAL: 30000, // 30 seconds - restart recognition periodically
  SILENCE_TIMEOUT: 5000, // 5 seconds of silence before considering speech ended
  MAX_INTERIM_DELAY: 1000, // 1 second max delay for interim results
  CONFIDENCE_THRESHOLD: 0.6,
  MIN_WORD_LENGTH: 2,
  MAX_SENTENCE_LENGTH: 500,
  PUNCTUATION_DELAY: 200, // ms to wait before adding punctuation
  LANGUAGE_DETECTION_INTERVAL: 10000, // 10 seconds between language detection attempts
  ERROR_RETRY_DELAY: 2000, // 2 seconds before retrying after error
  MAX_RETRY_ATTEMPTS: 3,
};

export const PUNCTUATION_RULES = {
  SENTENCE_ENDINGS: [".", "!", "?"],
  PAUSE_INDICATORS: [",", ";", ":"],
  SENTENCE_STARTERS: [
    "however",
    "therefore",
    "furthermore",
    "moreover",
    "additionally",
  ],
  QUESTION_WORDS: [
    "what",
    "when",
    "where",
    "who",
    "why",
    "how",
    "which",
    "whose",
  ],
  PAUSE_DURATION_THRESHOLD: 500, // ms
};

export const LANGUAGE_DETECTION_KEYWORDS = {
  en: ["the", "and", "is", "to", "of", "in", "it", "you", "that", "he"],
  es: ["el", "la", "de", "que", "y", "a", "en", "un", "es", "se"],
  fr: ["le", "de", "et", "à", "un", "il", "être", "et", "en", "avoir"],
  de: ["der", "die", "und", "in", "den", "von", "zu", "das", "mit", "sich"],
  it: ["il", "di", "che", "e", "la", "per", "un", "in", "con", "non"],
  pt: ["o", "de", "e", "do", "a", "em", "um", "para", "com", "não"],
  zh: ["的", "一", "是", "在", "不", "了", "有", "和", "人", "这"],
  ja: ["の", "に", "は", "を", "た", "が", "で", "て", "と", "し"],
  ko: ["의", "이", "가", "은", "는", "를", "에", "와", "과", "로"],
  ru: ["в", "и", "не", "на", "я", "с", "он", "что", "а", "то"],
};
