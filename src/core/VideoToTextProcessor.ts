import { VideoDetector } from "./VideoDetector";
import { AudioExtractor } from "./AudioExtractor";
import { SpeechProcessor } from "./SpeechProcessor";
import { DetectedVideo } from "../types/platforms";
import { TranscriptionResult, SpeechConfig } from "../types/speech";
import { AudioChunk, AudioExtractionConfig } from "../types/audio";
import { createComponentLogger } from "../utils/logger";

const logger = createComponentLogger("VideoToTextProcessor");

export interface VideoToTextConfig {
  audioConfig?: Partial<AudioExtractionConfig>;
  speechConfig?: Partial<SpeechConfig>;
  enableRealTimeTranscription?: boolean;
  autoDetectLanguage?: boolean;
  bufferDuration?: number; // milliseconds
}

export interface ProcessorStats {
  videosDetected: number;
  audioStreamsActive: number;
  transcriptionSessions: number;
  totalTranscriptions: number;
  isActive: boolean;
  currentPlatform: string | null;
  lastTranscriptionTime: number;
}

export interface ProcessorEvent {
  type:
    | "video-detected"
    | "audio-started"
    | "transcription-ready"
    | "error"
    | "status-change";
  data?: any;
  timestamp: number;
}

export class VideoToTextProcessor {
  private videoDetector!: VideoDetector;
  private audioExtractor!: AudioExtractor;
  private speechProcessor!: SpeechProcessor;

  private activeVideoSources: Map<string, string> = new Map(); // videoId -> audioSourceId
  private currentTranscripts: Map<string, TranscriptionResult[]> = new Map(); // sessionId -> transcripts
  private isProcessing = false;

  private config: VideoToTextConfig = {
    enableRealTimeTranscription: true,
    autoDetectLanguage: false,
    bufferDuration: 1000,
  };

  private stats: ProcessorStats = {
    videosDetected: 0,
    audioStreamsActive: 0,
    transcriptionSessions: 0,
    totalTranscriptions: 0,
    isActive: false,
    currentPlatform: null,
    lastTranscriptionTime: 0,
  };

  private eventListeners: {
    onTranscription?: (result: TranscriptionResult) => void;
    onVideoDetected?: (video: DetectedVideo) => void;
    onAudioStarted?: (videoId: string, audioSourceId: string) => void;
    onError?: (error: Error, context?: string) => void;
    onStatusChange?: (stats: ProcessorStats) => void;
  } = {};

  constructor(config?: VideoToTextConfig) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    logger.info("Initializing VideoToTextProcessor");
    this.initializeComponents();
    this.setupEventHandlers();
  }

  private initializeComponents(): void {
    // Initialize video detector
    this.videoDetector = new VideoDetector();

    // Initialize audio extractor with configuration
    this.audioExtractor = new AudioExtractor(this.config.audioConfig);

    // Initialize speech processor with configuration
    this.speechProcessor = new SpeechProcessor(this.config.speechConfig);

    logger.info("All components initialized successfully");
  }

  private setupEventHandlers(): void {
    // Video detection events
    this.videoDetector.addEventListener(
      "videoDetected",
      (video: DetectedVideo) => {
        this.handleVideoDetected(video);
      }
    );

    this.videoDetector.addEventListener("videoRemoved", (videoId: string) => {
      this.handleVideoRemoved(videoId);
    });

    this.videoDetector.addEventListener(
      "platformDetected",
      (platform: string) => {
        this.stats.currentPlatform = platform;
        this.notifyStatusChange();
      }
    );

    // Audio extraction events
    this.audioExtractor.addEventListener("streamStart", (sourceId: string) => {
      logger.info("Audio stream started", { sourceId });
      this.stats.audioStreamsActive++;
      this.notifyStatusChange();
    });

    this.audioExtractor.addEventListener("streamEnd", (sourceId: string) => {
      logger.info("Audio stream ended", { sourceId });
      this.stats.audioStreamsActive = Math.max(
        0,
        this.stats.audioStreamsActive - 1
      );
      this.notifyStatusChange();
    });

    this.audioExtractor.addEventListener("audioChunk", (chunk: AudioChunk) => {
      this.handleAudioChunk(chunk);
    });

    this.audioExtractor.addEventListener(
      "error",
      (error: Error, sourceId?: string) => {
        logger.error("Audio extraction error", error, { sourceId });
        this.eventListeners.onError?.(error, `audio-extraction: ${sourceId}`);
      }
    );

    // Speech recognition events
    this.speechProcessor.addEventListener(
      "transcript",
      (result: TranscriptionResult) => {
        this.handleTranscriptionResult(result);
      }
    );

    this.speechProcessor.addEventListener("start", (sessionId: string) => {
      logger.info("Speech recognition session started", { sessionId });
      this.stats.transcriptionSessions++;
      this.notifyStatusChange();
    });

    this.speechProcessor.addEventListener("end", (sessionId: string) => {
      logger.info("Speech recognition session ended", { sessionId });
      this.stats.transcriptionSessions = Math.max(
        0,
        this.stats.transcriptionSessions - 1
      );
      this.notifyStatusChange();
    });

    this.speechProcessor.addEventListener("error", (error: Error) => {
      logger.error("Speech recognition error", error);
      this.eventListeners.onError?.(error, "speech-recognition");
    });
  }

  private async handleVideoDetected(video: DetectedVideo): Promise<void> {
    logger.info("Processing detected video", {
      platform: video.platform,
      hasAudio: video.hasAudio,
      isMainVideo: video.isMainVideo,
    });

    this.stats.videosDetected++;
    this.eventListeners.onVideoDetected?.(video);

    // Only process videos with audio
    if (!video.hasAudio) {
      logger.debug("Skipping video without audio");
      return;
    }

    try {
      // Extract audio from video
      const audioSourceId = await this.audioExtractor.extractAudioFromVideo(
        video
      );
      if (!audioSourceId) {
        logger.warn("Failed to extract audio from video");
        return;
      }

      // Map video to audio source
      const videoId = this.generateVideoId(video);
      this.activeVideoSources.set(videoId, audioSourceId);

      logger.info("Audio extraction successful", { videoId, audioSourceId });
      this.eventListeners.onAudioStarted?.(videoId, audioSourceId);

      // Start speech recognition if enabled
      if (this.config.enableRealTimeTranscription) {
        await this.speechProcessor.startRecognition();
      }
    } catch (error) {
      logger.error("Failed to process detected video", error as Error);
      this.eventListeners.onError?.(error as Error, "video-processing");
    }
  }

  private handleVideoRemoved(videoId: string): void {
    logger.info("Video removed, cleaning up audio extraction", { videoId });

    const audioSourceId = this.activeVideoSources.get(videoId);
    if (audioSourceId) {
      this.audioExtractor.stopExtraction(audioSourceId);
      this.activeVideoSources.delete(videoId);
    }
  }

  private handleAudioChunk(chunk: AudioChunk): void {
    // Forward audio chunk to speech processor
    if (this.speechProcessor.isRecognitionActive()) {
      this.speechProcessor.processAudioChunk(chunk);
    }
  }

  private handleTranscriptionResult(result: TranscriptionResult): void {
    logger.debug("Transcription result received", {
      text: result.text.substring(0, 50) + "...",
      confidence: result.confidence,
      isFinal: result.isFinal,
      sessionId: result.sessionId,
    });

    // Store transcript
    if (!this.currentTranscripts.has(result.sessionId)) {
      this.currentTranscripts.set(result.sessionId, []);
    }
    this.currentTranscripts.get(result.sessionId)!.push(result);

    this.stats.totalTranscriptions++;
    this.stats.lastTranscriptionTime = result.timestamp;

    // Notify listeners
    this.eventListeners.onTranscription?.(result);
    this.notifyStatusChange();
  }

  private generateVideoId(video: DetectedVideo): string {
    const rect = video.element.getBoundingClientRect();
    return `${video.platform}_${Math.round(rect.left)}_${Math.round(
      rect.top
    )}_${video.element.videoWidth}x${video.element.videoHeight}`;
  }

  private notifyStatusChange(): void {
    this.eventListeners.onStatusChange?.(this.getStats());
  }

  // Public API
  public async start(): Promise<void> {
    if (this.isProcessing) {
      logger.warn("VideoToTextProcessor is already running");
      return;
    }

    logger.info("Starting VideoToTextProcessor");
    this.isProcessing = true;
    this.stats.isActive = true;
    this.notifyStatusChange();

    // Video detection starts automatically in constructor
    // Audio extraction and speech recognition start when videos are detected
  }

  public stop(): void {
    if (!this.isProcessing) {
      logger.warn("VideoToTextProcessor is not running");
      return;
    }

    logger.info("Stopping VideoToTextProcessor");

    // Stop all audio extractions
    for (const audioSourceId of this.activeVideoSources.values()) {
      this.audioExtractor.stopExtraction(audioSourceId);
    }
    this.activeVideoSources.clear();

    // Stop speech recognition
    this.speechProcessor.stopRecognition();

    this.isProcessing = false;
    this.stats.isActive = false;
    this.notifyStatusChange();
  }

  public getDetectedVideos(): DetectedVideo[] {
    return this.videoDetector.getDetectedVideos();
  }

  public getMainVideo(): DetectedVideo | null {
    return this.videoDetector.getMainVideo();
  }

  public getCurrentTranscripts(sessionId?: string): TranscriptionResult[] {
    if (sessionId) {
      return this.currentTranscripts.get(sessionId) || [];
    }

    // Return all transcripts from all sessions
    const allTranscripts: TranscriptionResult[] = [];
    for (const transcripts of this.currentTranscripts.values()) {
      allTranscripts.push(...transcripts);
    }

    return allTranscripts.sort((a, b) => a.timestamp - b.timestamp);
  }

  public getFinalTranscript(sessionId?: string): string {
    const transcripts = this.getCurrentTranscripts(sessionId);
    return transcripts
      .filter((t) => t.isFinal)
      .map((t) => t.text)
      .join(" ");
  }

  public getStats(): ProcessorStats {
    return { ...this.stats };
  }

  public isActive(): boolean {
    return this.stats.isActive;
  }

  public updateConfig(newConfig: Partial<VideoToTextConfig>): void {
    logger.info("Updating processor configuration", newConfig);

    this.config = { ...this.config, ...newConfig };

    // Update component configurations
    if (newConfig.speechConfig) {
      this.speechProcessor.updateConfig(newConfig.speechConfig);
    }
  }

  public addEventListener(
    event: string,
    callback: (...args: any[]) => void
  ): void {
    switch (event) {
      case "transcription":
        this.eventListeners.onTranscription = callback;
        break;
      case "videoDetected":
        this.eventListeners.onVideoDetected = callback;
        break;
      case "audioStarted":
        this.eventListeners.onAudioStarted = callback;
        break;
      case "error":
        this.eventListeners.onError = callback;
        break;
      case "statusChange":
        this.eventListeners.onStatusChange = callback;
        break;
    }
  }

  public destroy(): void {
    logger.info("Destroying VideoToTextProcessor");

    this.stop();

    // Destroy all components
    this.videoDetector.destroy();
    this.audioExtractor.destroy();
    this.speechProcessor.destroy();

    // Clear data
    this.activeVideoSources.clear();
    this.currentTranscripts.clear();
    this.eventListeners = {};
  }
}
