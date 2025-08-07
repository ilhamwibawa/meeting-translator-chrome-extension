// Core speech recognition interfaces
export interface TranscriptionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
  sessionId: string;
  language: SpeechLanguage;
  alternatives?: SpeechAlternative[];
  speakerId?: string;
  duration?: number;
}

export interface SpeechRecognitionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  alternatives?: SpeechAlternative[];
  timestamp: number;
  language?: string;
  speakerId?: string;
  duration?: number;
}

export interface SpeechAlternative {
  text: string;
  confidence: number;
}

// Configuration interfaces
export interface SpeechConfig {
  language: SpeechLanguage;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  confidenceThreshold: number;
  enableNoiseCancellation?: boolean;
  enableEchoCancellation?: boolean;
  enablePunctuation?: boolean;
  enableSpeakerDiarization?: boolean;
}

export interface SpeechProcessorConfig {
  continuous: boolean;
  interimResults: boolean;
  language: string;
  maxAlternatives: number;
  enableLanguageDetection: boolean;
  confidenceThreshold: number;
  enablePunctuation: boolean;
  enableSpeakerDiarization: boolean;
}

export interface SpeechRecognitionEngine {
  name: string;
  isAvailable: boolean;
  languages: string[];
  maxContinuousDuration: number;
  supportsInterimResults: boolean;
  supportsConfidence: boolean;
}

// Statistics and monitoring
export interface SpeechProcessorStats {
  totalTranscriptions: number;
  successfulTranscriptions: number;
  averageConfidence: number;
  averageLatency: number;
  currentLanguage: SpeechLanguage;
  isActive: boolean;
  errors: number;
  totalWords?: number;
  totalSentences?: number;
  recognitionTime?: number;
  errorCount?: number;
}

export interface RecognitionQuality {
  confidence: number;
  clarity: number;
  noiseLevel: number;
  signalStrength: number;
}

// Language and locale support
export type SpeechLanguage =
  | "en-US"
  | "en-GB"
  | "en-AU"
  | "en-CA"
  | "es-ES"
  | "es-MX"
  | "es-AR"
  | "fr-FR"
  | "fr-CA"
  | "de-DE"
  | "de-AT"
  | "it-IT"
  | "pt-BR"
  | "pt-PT"
  | "ru-RU"
  | "ja-JP"
  | "ko-KR"
  | "zh-CN"
  | "zh-TW"
  | "ar-SA"
  | "hi-IN"
  | "nl-NL"
  | "sv-SE"
  | "da-DK"
  | "no-NO"
  | "fi-FI";

// Event interfaces
export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export interface SpeechEvent {
  type:
    | "result"
    | "start"
    | "end"
    | "error"
    | "no-speech"
    | "audio-start"
    | "audio-end";
  data?: SpeechRecognitionResult | SpeechRecognitionError;
  timestamp: number;
}

export interface SpeechRecognitionError {
  error:
    | "no-speech"
    | "aborted"
    | "audio-capture"
    | "network"
    | "not-allowed"
    | "service-not-allowed"
    | "bad-grammar"
    | "language-not-supported";
  message: string;
  code?: number;
}

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  alternatives: Array<{
    language: string;
    confidence: number;
  }>;
}

export interface SpeakerInfo {
  id: string;
  confidence: number;
  startTime: number;
  endTime: number;
}

export type SpeechRecognitionState =
  | "idle"
  | "listening"
  | "processing"
  | "error";

export interface TranscriptionSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  isFinal: boolean;
  speaker?: SpeakerInfo;
  language?: string;
}
