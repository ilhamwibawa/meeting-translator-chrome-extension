import {
  AudioSourceInfo,
  AudioChunk,
  AudioQuality,
  AudioExtractionConfig,
  AudioExtractorStats,
  AudioExtractionMethod,
} from "../types/audio";
import { DetectedVideo } from "../types/platforms";
import { createComponentLogger } from "../utils/logger";
import { AUDIO_CONFIG } from "../utils/constants";

const logger = createComponentLogger("AudioExtractor");

export class AudioExtractor {
  private audioContext: AudioContext | null = null;
  private activeStreams: Map<string, AudioSourceInfo> = new Map();
  private processors: Map<string, ScriptProcessorNode> = new Map();
  private isInitialized = false;
  private stats: AudioExtractorStats = {
    totalChunks: 0,
    droppedChunks: 0,
    averageLatency: 0,
    currentQuality: {
      sampleRate: AUDIO_CONFIG.SAMPLE_RATE,
      channelCount: AUDIO_CONFIG.CHANNEL_COUNT,
      bitDepth: AUDIO_CONFIG.BIT_DEPTH,
    },
    isActive: false,
    lastProcessedTime: 0,
  };

  private config: AudioExtractionConfig = {
    preferredMethod: "auto",
    fallbackMethods: ["mediastream", "element", "capture"],
    minQuality: {
      sampleRate: 8000,
      channelCount: 1,
      bitDepth: 16,
    },
    maxLatency: 100,
  };

  private eventListeners: {
    onAudioChunk?: (chunk: AudioChunk) => void;
    onStreamStart?: (sourceId: string, quality: AudioQuality) => void;
    onStreamEnd?: (sourceId: string) => void;
    onError?: (error: Error, sourceId?: string) => void;
    onQualityChange?: (quality: AudioQuality, sourceId: string) => void;
  } = {};

  constructor(config?: Partial<AudioExtractionConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.initialize();
  }

  private async initialize(): Promise<void> {
    logger.info("Initializing AudioExtractor");

    try {
      // Initialize Web Audio API context
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      // Handle browser autoplay policy
      if (this.audioContext.state === "suspended") {
        logger.info("AudioContext suspended, will resume on user interaction");
        document.addEventListener("click", this.resumeAudioContext.bind(this), {
          once: true,
        });
        document.addEventListener(
          "keydown",
          this.resumeAudioContext.bind(this),
          { once: true }
        );
      }

      this.isInitialized = true;
      this.stats.isActive = true;
      logger.info("AudioExtractor initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize AudioExtractor", error as Error);
      this.eventListeners.onError?.(error as Error);
    }
  }

  private async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume();
        logger.info("AudioContext resumed");
      } catch (error) {
        logger.error("Failed to resume AudioContext", error as Error);
      }
    }
  }

  public async extractAudioFromVideo(
    video: DetectedVideo
  ): Promise<string | null> {
    if (!this.isInitialized || !this.audioContext) {
      logger.error("AudioExtractor not initialized");
      return null;
    }

    const sourceId = `video_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    logger.info("Starting audio extraction from video", {
      sourceId,
      platform: video.platform,
    });

    try {
      // Try different extraction methods based on configuration
      const methods = this.getExtractionMethods();

      for (const method of methods) {
        try {
          const audioSource = await this.extractWithMethod(
            video,
            method,
            sourceId
          );
          if (audioSource) {
            this.activeStreams.set(sourceId, audioSource);
            this.startAudioProcessing(audioSource, sourceId);
            return sourceId;
          }
        } catch (error) {
          logger.warn(
            `Audio extraction method ${method} failed`,
            undefined,
            error as Error
          );
          continue;
        }
      }

      throw new Error("All audio extraction methods failed");
    } catch (error) {
      logger.error("Failed to extract audio from video", error as Error);
      this.eventListeners.onError?.(error as Error, sourceId);
      return null;
    }
  }

  private getExtractionMethods(): AudioExtractionMethod[] {
    if (this.config.preferredMethod === "auto") {
      return this.config.fallbackMethods;
    }
    return [
      this.config.preferredMethod,
      ...this.config.fallbackMethods.filter(
        (m) => m !== this.config.preferredMethod
      ),
    ];
  }

  private async extractWithMethod(
    video: DetectedVideo,
    method: AudioExtractionMethod,
    sourceId: string
  ): Promise<AudioSourceInfo | null> {
    logger.debug(`Attempting audio extraction with method: ${method}`, {
      sourceId,
    });

    switch (method) {
      case "mediastream":
        return this.extractFromMediaStream(video, sourceId);

      case "element":
        return this.extractFromVideoElement(video, sourceId);

      case "capture":
        return this.extractFromTabCapture(video, sourceId);

      default:
        throw new Error(`Unknown extraction method: ${method}`);
    }
  }

  private async extractFromMediaStream(
    video: DetectedVideo,
    sourceId: string
  ): Promise<AudioSourceInfo | null> {
    if (
      !video.metadata.srcObject ||
      !(video.metadata.srcObject instanceof MediaStream)
    ) {
      throw new Error("Video does not have MediaStream source");
    }

    const stream = video.metadata.srcObject;
    const audioTracks = stream.getAudioTracks();

    if (audioTracks.length === 0) {
      throw new Error("MediaStream has no audio tracks");
    }

    if (!this.audioContext) {
      throw new Error("AudioContext not available");
    }

    // Create audio source from MediaStream
    const audioSource = this.audioContext.createMediaStreamSource(stream);

    // Analyze audio quality
    const quality = this.analyzeAudioQuality(stream);

    return {
      source: audioSource,
      stream,
      tracks: audioTracks,
      method: "mediastream",
      quality,
      isActive: true,
      sourceId,
    };
  }

  private async extractFromVideoElement(
    video: DetectedVideo,
    sourceId: string
  ): Promise<AudioSourceInfo | null> {
    if (!this.audioContext) {
      throw new Error("AudioContext not available");
    }

    try {
      // Check if video has CORS restrictions
      const videoElement = video.element;
      if (
        videoElement.crossOrigin === null &&
        videoElement.src &&
        !this.isSameOrigin(videoElement.src)
      ) {
        logger.warn(
          "Video may have CORS restrictions for: " + videoElement.src
        );
      }

      // Create audio source from video element
      const audioSource = this.audioContext.createMediaElementSource(
        video.element
      );

      // Get quality from video element
      const quality: AudioQuality = {
        sampleRate: this.audioContext.sampleRate,
        channelCount: 2, // Assume stereo for video elements
        bitDepth: 16,
      };

      logger.info("Audio source created from video element", {
        sourceId,
        quality,
      });

      return {
        source: audioSource,
        method: "element",
        quality,
        isActive: true,
        sourceId,
      };
    } catch (error) {
      logger.error("Failed to create MediaElementSource", error as Error, {
        sourceId,
      });
      throw error;
    }
  }

  private isSameOrigin(url: string): boolean {
    try {
      const videoUrl = new URL(url);
      return videoUrl.origin === window.location.origin;
    } catch {
      return false;
    }
  }

  private async extractFromTabCapture(
    _video: DetectedVideo,
    _sourceId: string
  ): Promise<AudioSourceInfo | null> {
    // This method requires background script integration
    // For now, we'll throw an error and implement it when we have proper tab capture
    throw new Error(
      "Tab capture method not yet implemented - requires background script integration"
    );
  }

  private analyzeAudioQuality(stream: MediaStream): AudioQuality {
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      return this.config.minQuality;
    }

    const track = audioTracks[0];
    if (!track) {
      return this.config.minQuality;
    }

    const settings = track.getSettings();

    return {
      sampleRate: settings.sampleRate || AUDIO_CONFIG.SAMPLE_RATE,
      channelCount: settings.channelCount || AUDIO_CONFIG.CHANNEL_COUNT,
      bitDepth: AUDIO_CONFIG.BIT_DEPTH, // Not available in getSettings()
    };
  }

  private startAudioProcessing(
    audioSource: AudioSourceInfo,
    sourceId: string
  ): void {
    if (!this.audioContext) {
      logger.error("Cannot start audio processing: AudioContext not available");
      return;
    }

    logger.info("Starting audio processing", {
      sourceId,
      method: audioSource.method,
    });

    try {
      // Create script processor for audio analysis and chunking
      const processor = this.audioContext.createScriptProcessor(
        AUDIO_CONFIG.BUFFER_SIZE,
        audioSource.quality.channelCount,
        audioSource.quality.channelCount
      );

      // Connect audio graph: source -> processor -> destination
      audioSource.source.connect(processor);
      processor.connect(this.audioContext.destination);

      // Handle audio data
      processor.onaudioprocess = (event) => {
        this.processAudioBuffer(event, audioSource, sourceId);
      };

      this.processors.set(sourceId, processor);

      // Notify listeners
      this.eventListeners.onStreamStart?.(sourceId, audioSource.quality);
    } catch (error) {
      logger.error("Failed to start audio processing", error as Error, {
        sourceId,
      });
      this.eventListeners.onError?.(error as Error, sourceId);
    }
  }

  private processAudioBuffer(
    event: AudioProcessingEvent,
    audioSource: AudioSourceInfo,
    sourceId: string
  ): void {
    try {
      const inputBuffer = event.inputBuffer;
      const channelCount = inputBuffer.numberOfChannels;
      const sampleRate = inputBuffer.sampleRate;
      const frameCount = inputBuffer.length;

      // Mix down to mono if needed
      let audioData: Float32Array;

      if (channelCount === 1) {
        audioData = inputBuffer.getChannelData(0);
      } else {
        // Mix stereo to mono
        audioData = new Float32Array(frameCount);
        const leftChannel = inputBuffer.getChannelData(0);
        const rightChannel = inputBuffer.getChannelData(1);

        for (let i = 0; i < frameCount; i++) {
          const leftSample = leftChannel[i] || 0;
          const rightSample = rightChannel[i] || 0;
          audioData[i] = (leftSample + rightSample) / 2;
        }
      }

      // Create audio chunk
      const chunk: AudioChunk = {
        data: audioData,
        timestamp: Date.now(),
        sampleRate,
        channelCount: 1, // We always output mono
        duration: (frameCount / sampleRate) * 1000, // Duration in milliseconds
      };

      // Update statistics
      this.updateStats(chunk);

      // Send to listeners
      this.eventListeners.onAudioChunk?.(chunk);
    } catch (error) {
      logger.error("Error processing audio buffer", error as Error, {
        sourceId,
      });
      this.stats.droppedChunks++;
    }
  }

  private updateStats(chunk: AudioChunk): void {
    this.stats.totalChunks++;
    this.stats.lastProcessedTime = chunk.timestamp;

    // Calculate average latency
    const currentLatency = Date.now() - chunk.timestamp;
    this.stats.averageLatency =
      (this.stats.averageLatency + currentLatency) / 2;
  }

  public stopExtraction(sourceId: string): void {
    logger.info("Stopping audio extraction", { sourceId });

    try {
      // Clean up processor
      const processor = this.processors.get(sourceId);
      if (processor) {
        processor.disconnect();
        this.processors.delete(sourceId);
      }

      // Clean up stream
      const audioSource = this.activeStreams.get(sourceId);
      if (audioSource) {
        audioSource.source.disconnect();
        audioSource.isActive = false;

        // Stop tracks if available
        if (audioSource.tracks) {
          audioSource.tracks.forEach((track) => track.stop());
        }

        this.activeStreams.delete(sourceId);
      }

      this.eventListeners.onStreamEnd?.(sourceId);
    } catch (error) {
      logger.error("Error stopping audio extraction", error as Error, {
        sourceId,
      });
    }
  }

  public getActiveStreams(): string[] {
    return Array.from(this.activeStreams.keys());
  }

  public getStats(): AudioExtractorStats {
    return { ...this.stats };
  }

  public addEventListener(
    event: string,
    callback: (...args: any[]) => void
  ): void {
    switch (event) {
      case "audioChunk":
        this.eventListeners.onAudioChunk = callback;
        break;
      case "streamStart":
        this.eventListeners.onStreamStart = callback;
        break;
      case "streamEnd":
        this.eventListeners.onStreamEnd = callback;
        break;
      case "error":
        this.eventListeners.onError = callback;
        break;
      case "qualityChange":
        this.eventListeners.onQualityChange = callback;
        break;
    }
  }

  public destroy(): void {
    logger.info("Destroying AudioExtractor");

    // Stop all active extractions
    for (const sourceId of this.activeStreams.keys()) {
      this.stopExtraction(sourceId);
    }

    // Clean up audio context
    if (this.audioContext) {
      this.audioContext.close().catch((error) => {
        logger.warn("Error closing AudioContext", undefined, error as Error);
      });
      this.audioContext = null;
    }

    this.isInitialized = false;
    this.stats.isActive = false;
    this.eventListeners = {};
  }
}
