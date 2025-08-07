import {
  TranscriptionResult,
  SpeechConfig,
  SpeechProcessorStats,
  SpeechRecognitionEvent,
  SpeechLanguage,
} from "../types/speech";
import { AudioChunk } from "../types/audio";
import { createComponentLogger } from "../utils/logger";
import { SPEECH_CONFIG } from "../utils/constants";

const logger = createComponentLogger("SpeechProcessor");

export class SpeechProcessor {
  private recognition: SpeechRecognition | null = null;
  private isActive = false;
  private currentSession: string | null = null;
  private pendingChunks: AudioChunk[] = [];
  private stats: SpeechProcessorStats = {
    totalTranscriptions: 0,
    successfulTranscriptions: 0,
    averageConfidence: 0,
    averageLatency: 0,
    currentLanguage: SPEECH_CONFIG.LANGUAGE as SpeechLanguage,
    isActive: false,
    errors: 0,
  };

  private config: SpeechConfig = {
    language: SPEECH_CONFIG.LANGUAGE as SpeechLanguage,
    continuous: SPEECH_CONFIG.CONTINUOUS,
    interimResults: SPEECH_CONFIG.INTERIM_RESULTS,
    maxAlternatives: SPEECH_CONFIG.MAX_ALTERNATIVES,
    confidenceThreshold: SPEECH_CONFIG.CONFIDENCE_THRESHOLD,
    enableNoiseCancellation: true,
    enableEchoCancellation: true,
  };

  private eventListeners: {
    onTranscript?: (result: TranscriptionResult) => void;
    onInterimResult?: (text: string, confidence: number) => void;
    onFinalResult?: (text: string, confidence: number) => void;
    onError?: (error: Error) => void;
    onStart?: (sessionId: string) => void;
    onEnd?: (sessionId: string) => void;
  } = {};

  constructor(config?: Partial<SpeechConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.initialize();
  }

  private initialize(): void {
    logger.info("Initializing SpeechProcessor");

    try {
      // Check for Web Speech API support
      if (!this.isSpeechRecognitionSupported()) {
        throw new Error("Web Speech API not supported in this browser");
      }

      this.setupSpeechRecognition();
      logger.info("SpeechProcessor initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize SpeechProcessor", error as Error);
      this.eventListeners.onError?.(error as Error);
    }
  }

  private isSpeechRecognitionSupported(): boolean {
    return !!(
      window.SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition
    );
  }

  private setupSpeechRecognition(): void {
    // Initialize Speech Recognition API
    const SpeechRecognitionClass =
      window.SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    this.recognition = new SpeechRecognitionClass();

    if (!this.recognition) {
      throw new Error("Failed to create SpeechRecognition instance");
    }

    // Configure recognition settings
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;
    this.recognition.lang = this.config.language;

    // Set up event handlers
    this.recognition.onstart = () => {
      logger.info("Speech recognition started");
      this.isActive = true;
      this.stats.isActive = true;
      this.currentSession = this.generateSessionId();
      this.eventListeners.onStart?.(this.currentSession);
    };

    this.recognition.onend = () => {
      logger.info("Speech recognition ended");
      this.isActive = false;
      this.stats.isActive = false;
      if (this.currentSession) {
        this.eventListeners.onEnd?.(this.currentSession);
        this.currentSession = null;
      }
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      this.handleRecognitionResult(event);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.handleRecognitionError(event);
    };

    this.recognition.onnomatch = () => {
      logger.debug("No speech recognition match");
    };

    this.recognition.onspeechstart = () => {
      logger.debug("Speech started");
    };

    this.recognition.onspeechend = () => {
      logger.debug("Speech ended");
    };
  }

  private handleRecognitionResult(event: SpeechRecognitionEvent): void {
    try {
      const results = Array.from(event.results);
      const latestResult = results[results.length - 1];

      if (!latestResult) return;

      const alternative = latestResult[0];
      if (!alternative) return;

      const transcript = alternative.transcript.trim();
      const confidence = alternative.confidence || 0;
      const isFinal = latestResult.isFinal;

      logger.debug("Recognition result received", {
        transcript,
        confidence,
        isFinal,
        length: transcript.length,
      });

      // Filter out low-quality results
      if (confidence < this.config.confidenceThreshold) {
        logger.debug("Transcript below confidence threshold", {
          confidence,
          threshold: this.config.confidenceThreshold,
        });
        return;
      }

      // Update statistics
      this.updateStats(confidence, Date.now());

      // Create transcription result
      const transcriptionResult: TranscriptionResult = {
        text: transcript,
        confidence,
        isFinal,
        timestamp: Date.now(),
        sessionId: this.currentSession || "unknown",
        language: this.config.language,
        alternatives: this.extractAlternatives(latestResult),
      };

      // Notify listeners
      this.eventListeners.onTranscript?.(transcriptionResult);

      if (isFinal) {
        this.eventListeners.onFinalResult?.(transcript, confidence);
      } else {
        this.eventListeners.onInterimResult?.(transcript, confidence);
      }
    } catch (error) {
      logger.error("Error handling recognition result", error as Error);
      this.stats.errors++;
    }
  }

  private extractAlternatives(
    result: SpeechRecognitionResult
  ): Array<{ text: string; confidence: number }> {
    const alternatives: Array<{ text: string; confidence: number }> = [];

    for (let i = 0; i < result.length && i < this.config.maxAlternatives; i++) {
      const alternative = result[i];
      if (alternative) {
        alternatives.push({
          text: alternative.transcript.trim(),
          confidence: alternative.confidence || 0,
        });
      }
    }

    return alternatives;
  }

  private handleRecognitionError(event: SpeechRecognitionErrorEvent): void {
    const error = new Error(
      `Speech recognition error: ${event.error} - ${
        event.message || "Unknown error"
      }`
    );
    logger.error("Speech recognition error", error, {
      errorType: event.error,
      message: event.message,
    });

    this.stats.errors++;
    this.eventListeners.onError?.(error);

    // Handle specific error types
    switch (event.error) {
      case "no-speech":
        logger.debug("No speech detected, continuing...");
        this.restartRecognition();
        break;

      case "audio-capture":
        logger.error("Audio capture failed - check microphone permissions");
        break;

      case "not-allowed":
        logger.error("Speech recognition not allowed - check permissions");
        break;

      case "network":
        logger.warn("Network error during speech recognition");
        this.scheduleReconnect();
        break;

      default:
        logger.error("Unhandled speech recognition error", undefined, {
          error: event.error,
        });
    }
  }

  private updateStats(confidence: number, timestamp: number): void {
    this.stats.totalTranscriptions++;

    if (confidence >= this.config.confidenceThreshold) {
      this.stats.successfulTranscriptions++;
    }

    // Update average confidence
    this.stats.averageConfidence =
      (this.stats.averageConfidence * (this.stats.totalTranscriptions - 1) +
        confidence) /
      this.stats.totalTranscriptions;

    // Update average latency (simplified - would need start timestamp for real latency)
    const currentLatency = Date.now() - timestamp;
    this.stats.averageLatency =
      (this.stats.averageLatency + currentLatency) / 2;
  }

  private generateSessionId(): string {
    return `speech_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private restartRecognition(): void {
    if (!this.isActive) return;

    logger.debug("Restarting speech recognition");

    setTimeout(() => {
      if (this.recognition && this.isActive) {
        try {
          this.recognition.start();
        } catch (error) {
          logger.warn(
            "Error restarting recognition",
            undefined,
            error as Error
          );
        }
      }
    }, 100);
  }

  private scheduleReconnect(): void {
    logger.info("Scheduling speech recognition reconnect");

    setTimeout(() => {
      if (this.isActive) {
        this.startRecognition();
      }
    }, 2000);
  }

  // Public API
  public startRecognition(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error("Speech recognition not initialized"));
        return;
      }

      if (this.isActive) {
        logger.warn("Speech recognition already active");
        resolve(this.currentSession || "existing-session");
        return;
      }

      logger.info("Starting speech recognition");

      try {
        this.recognition.start();

        // Wait for session to start
        const checkSession = () => {
          if (this.currentSession) {
            resolve(this.currentSession);
          } else {
            setTimeout(checkSession, 50);
          }
        };

        setTimeout(checkSession, 50);
      } catch (error) {
        logger.error("Failed to start speech recognition", error as Error);
        reject(error);
      }
    });
  }

  public stopRecognition(): void {
    logger.info("Stopping speech recognition");

    if (this.recognition && this.isActive) {
      this.recognition.stop();
    }

    this.isActive = false;
    this.stats.isActive = false;
  }

  public processAudioChunk(chunk: AudioChunk): void {
    // For Web Speech API, we don't directly process audio chunks
    // The browser handles the audio input through getUserMedia
    // This method is here for compatibility with other speech engines

    logger.debug("Audio chunk received", {
      duration: chunk.duration,
      sampleRate: chunk.sampleRate,
      size: chunk.data.length,
    });

    this.pendingChunks.push(chunk);

    // Keep only recent chunks to avoid memory issues
    if (this.pendingChunks.length > 10) {
      this.pendingChunks.shift();
    }
  }

  public updateConfig(newConfig: Partial<SpeechConfig>): void {
    logger.info("Updating speech processor configuration", newConfig);

    this.config = { ...this.config, ...newConfig };

    // Update recognition settings if available
    if (this.recognition) {
      this.recognition.lang = this.config.language;
      this.recognition.continuous = this.config.continuous;
      this.recognition.interimResults = this.config.interimResults;
      this.recognition.maxAlternatives = this.config.maxAlternatives;
    }

    this.stats.currentLanguage = this.config.language;
  }

  public getStats(): SpeechProcessorStats {
    return { ...this.stats };
  }

  public getCurrentSession(): string | null {
    return this.currentSession;
  }

  public isRecognitionActive(): boolean {
    return this.isActive;
  }

  public addEventListener(
    event: string,
    callback: (...args: any[]) => void
  ): void {
    switch (event) {
      case "transcript":
        this.eventListeners.onTranscript = callback;
        break;
      case "interimResult":
        this.eventListeners.onInterimResult = callback;
        break;
      case "finalResult":
        this.eventListeners.onFinalResult = callback;
        break;
      case "error":
        this.eventListeners.onError = callback;
        break;
      case "start":
        this.eventListeners.onStart = callback;
        break;
      case "end":
        this.eventListeners.onEnd = callback;
        break;
    }
  }

  public destroy(): void {
    logger.info("Destroying SpeechProcessor");

    this.stopRecognition();

    if (this.recognition) {
      this.recognition.onstart = null;
      this.recognition.onend = null;
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onnomatch = null;
      this.recognition.onspeechstart = null;
      this.recognition.onspeechend = null;
      this.recognition = null;
    }

    this.pendingChunks = [];
    this.eventListeners = {};
    this.currentSession = null;
  }
}
