import {
  DetectedVideo,
  PlatformConfig,
  MeetingState,
  SupportedPlatform,
} from "../types/platforms";
import {
  PLATFORM_CONFIGS,
  PLATFORM_DOMAINS,
  VIDEO_QUALITY_THRESHOLDS,
  DETECTION_SETTINGS,
} from "../config/platforms";
import { DOMUtils } from "../utils/dom-utils";
import { createComponentLogger } from "../utils/logger";

const logger = createComponentLogger("VideoDetector");

export class VideoDetector {
  private detectedVideos: Map<string, DetectedVideo> = new Map();
  private currentPlatform: SupportedPlatform | null = null;
  private platformConfig: PlatformConfig | null = null;
  private mutationObserver: MutationObserver | null = null;
  private checkInterval: number | null = null;
  private retryCount = 0;

  private eventListeners: {
    onVideoDetected?: (video: DetectedVideo) => void;
    onVideoRemoved?: (videoId: string) => void;
    onPlatformDetected?: (
      platform: SupportedPlatform,
      config: PlatformConfig
    ) => void;
    onMeetingStateChanged?: (state: MeetingState) => void;
  } = {};

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    logger.info("Initializing VideoDetector");

    try {
      await this.detectPlatform();
      this.startVideoDetection();
      logger.info("VideoDetector initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize VideoDetector", error as Error);
      this.scheduleRetry();
    }
  }

  private async detectPlatform(): Promise<void> {
    const hostname = window.location.hostname;
    logger.debug("Detecting platform for hostname:", hostname);

    // Check known platforms first
    for (const [domain, platformKey] of Object.entries(PLATFORM_DOMAINS)) {
      if (hostname.includes(domain)) {
        const config = PLATFORM_CONFIGS[domain];
        if (config) {
          this.currentPlatform = platformKey as SupportedPlatform;
          this.platformConfig = config;

          logger.info("Platform detected:", {
            platform: this.currentPlatform,
            domain,
          });
          this.eventListeners.onPlatformDetected?.(
            this.currentPlatform,
            this.platformConfig
          );
          return;
        }
      }
    }

    // Fallback to generic detection
    const genericConfig = PLATFORM_CONFIGS.generic;
    if (genericConfig) {
      this.currentPlatform = "generic";
      this.platformConfig = genericConfig;

      logger.info("Using generic platform detection");
      this.eventListeners.onPlatformDetected?.(
        this.currentPlatform,
        this.platformConfig
      );
    }
  }

  private startVideoDetection(): void {
    if (!this.platformConfig) {
      logger.error("No platform config available for video detection");
      return;
    }

    logger.debug("Starting video detection");

    // Initial scan
    this.scanForVideos();

    // Set up mutation observer for dynamic content
    this.setupMutationObserver();

    // Set up periodic check
    this.checkInterval = window.setInterval(() => {
      this.scanForVideos();
    }, DETECTION_SETTINGS.VIDEO_CHECK_INTERVAL);
  }

  private setupMutationObserver(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    const debouncedScan = DOMUtils.debounce(() => {
      this.scanForVideos();
    }, DETECTION_SETTINGS.MUTATION_OBSERVER_THROTTLE);

    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldScan = false;

      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          const addedNodes = Array.from(mutation.addedNodes);
          const removedNodes = Array.from(mutation.removedNodes);

          // Check if video elements were added or removed
          const hasVideoChanges = [...addedNodes, ...removedNodes].some(
            (node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                return (
                  element.tagName === "VIDEO" || element.querySelector("video")
                );
              }
              return false;
            }
          );

          if (hasVideoChanges) {
            shouldScan = true;
            break;
          }
        }
      }

      if (shouldScan) {
        debouncedScan();
      }
    });

    this.mutationObserver.observe(document, {
      childList: true,
      subtree: true,
    });
  }

  private scanForVideos(): void {
    if (!this.platformConfig) return;

    logger.debug("🔍 Scanning for videos...");
    logger.debug("🎯 Video selectors:", this.platformConfig.videoSelectors);

    try {
      const videoElements = DOMUtils.findElements(
        this.platformConfig.videoSelectors
      );
      logger.debug("📺 Found video elements:", videoElements.length);

      const currentVideoIds = new Set<string>();

      for (const videoElement of videoElements) {
        logger.debug("🎬 Processing element: " + videoElement.tagName, {
          element: videoElement,
        });

        if (videoElement.tagName !== "VIDEO") continue;

        const video = videoElement as HTMLVideoElement;
        const videoId = this.generateVideoId(video);
        currentVideoIds.add(videoId);

        logger.debug("🆔 Video ID generated:", videoId);

        if (!this.detectedVideos.has(videoId)) {
          logger.debug("🔍 Analyzing new video...");
          const detectedVideo = this.analyzeVideo(video);
          if (detectedVideo && this.isValidVideo(detectedVideo)) {
            this.detectedVideos.set(videoId, detectedVideo);
            logger.info("🎉 New video detected:", {
              id: videoId,
              platform: detectedVideo.platform,
              hasAudio: detectedVideo.hasAudio,
              dimensions: `${detectedVideo.metadata.width}x${detectedVideo.metadata.height}`,
            });
            this.eventListeners.onVideoDetected?.(detectedVideo);
          } else {
            logger.debug("❌ Video analysis failed or invalid:", detectedVideo);
          }
        } else {
          // Update existing video metadata
          const existingVideo = this.detectedVideos.get(videoId)!;
          const updatedMetadata = this.getVideoMetadata(video);
          if (
            this.hasSignificantChange(existingVideo.metadata, updatedMetadata)
          ) {
            existingVideo.metadata = updatedMetadata;
            logger.debug("🔄 Video metadata updated:", { id: videoId });
          }
        }
      }

      // Remove videos that are no longer present
      for (const [videoId, video] of this.detectedVideos) {
        if (
          !currentVideoIds.has(videoId) ||
          !document.contains(video.element)
        ) {
          this.detectedVideos.delete(videoId);
          logger.info("🗑️ Video removed:", { id: videoId });
          this.eventListeners.onVideoRemoved?.(videoId);
        }
      }

      // Check meeting state
      this.checkMeetingState();
    } catch (error) {
      logger.error("💥 Error during video scan", error as Error);
    }
  }

  private analyzeVideo(video: HTMLVideoElement): DetectedVideo | null {
    try {
      const metadata = this.getVideoMetadata(video);
      const selector = DOMUtils.generateSelector(video);
      const isMainVideo = this.isMainVideo(video);
      const participantId = this.getParticipantId(video);

      const detectedVideo: DetectedVideo = {
        element: video,
        selector,
        platform: this.currentPlatform || "generic",
        hasAudio: metadata.hasAudioTrack,
        metadata,
        isMainVideo,
      };

      if (participantId) {
        detectedVideo.participantId = participantId;
      }

      return detectedVideo;
    } catch (error) {
      logger.warn("Failed to analyze video", undefined, error as Error);
      return null;
    }
  }

  private getVideoMetadata(video: HTMLVideoElement): DetectedVideo["metadata"] {
    return {
      width: video.videoWidth || video.clientWidth,
      height: video.videoHeight || video.clientHeight,
      duration: video.duration || 0,
      volume: video.volume,
      isPlaying: !video.paused && !video.ended && video.readyState > 2,
      isVisible: DOMUtils.isElementVisible(video),
      hasAudioTrack: this.hasAudioTrack(video),
      srcObject: video.srcObject as MediaStream | null,
    };
  }

  private hasAudioTrack(video: HTMLVideoElement): boolean {
    try {
      if (video.srcObject && video.srcObject instanceof MediaStream) {
        const audioTracks = video.srcObject.getAudioTracks();
        return (
          audioTracks.length > 0 && audioTracks.some((track) => track.enabled)
        );
      }
      return true; // Assume true for non-MediaStream sources
    } catch (error) {
      logger.debug("Could not determine audio track status", { error });
      return true;
    }
  }

  private isMainVideo(video: HTMLVideoElement): boolean {
    if (!this.platformConfig) return false;

    // Check if video is in main container
    const containers = DOMUtils.findElements(
      this.platformConfig.containerSelectors
    );
    const videoRect = video.getBoundingClientRect();

    // Consider it main video if it's large enough and visible
    const isLargeEnough =
      videoRect.width >= VIDEO_QUALITY_THRESHOLDS.PREFERRED_WIDTH &&
      videoRect.height >= VIDEO_QUALITY_THRESHOLDS.PREFERRED_HEIGHT;

    const isInMainContainer = containers.some(
      (container) =>
        (container.contains(video) && container.classList.contains("main")) ||
        container.getAttribute("data-main") === "true"
    );

    return isLargeEnough || isInMainContainer;
  }

  private getParticipantId(video: HTMLVideoElement): string | undefined {
    if (!this.platformConfig?.indicators.participants) return undefined;

    const participant = DOMUtils.findParent(
      video,
      this.platformConfig.indicators.participants
    );
    return (
      participant?.getAttribute("data-participant-id") ||
      participant?.getAttribute("data-user-id") ||
      participant?.id
    );
  }

  private isValidVideo(video: DetectedVideo): boolean {
    const { metadata } = video;

    return (
      metadata.width >= VIDEO_QUALITY_THRESHOLDS.MIN_WIDTH &&
      metadata.height >= VIDEO_QUALITY_THRESHOLDS.MIN_HEIGHT &&
      metadata.isVisible &&
      (metadata.isPlaying ||
        metadata.duration > VIDEO_QUALITY_THRESHOLDS.MIN_DURATION)
    );
  }

  private hasSignificantChange(
    oldMetadata: DetectedVideo["metadata"],
    newMetadata: DetectedVideo["metadata"]
  ): boolean {
    return (
      oldMetadata.isPlaying !== newMetadata.isPlaying ||
      oldMetadata.isVisible !== newMetadata.isVisible ||
      Math.abs(oldMetadata.volume - newMetadata.volume) > 0.1 ||
      oldMetadata.hasAudioTrack !== newMetadata.hasAudioTrack
    );
  }

  private checkMeetingState(): void {
    if (!this.platformConfig?.meetingStates) return;

    try {
      const isInMeeting = Boolean(
        this.platformConfig.meetingStates.inCall &&
          DOMUtils.findFirstElement([this.platformConfig.meetingStates.inCall])
      );

      const participantElements = this.platformConfig.indicators.participants
        ? DOMUtils.findElements([this.platformConfig.indicators.participants])
        : [];

      const meetingState: MeetingState = {
        isInMeeting,
        participantCount: participantElements.length,
        isAudioMuted: this.checkMuteState(),
        isVideoMuted: this.checkVideoMuteState(),
      };

      this.eventListeners.onMeetingStateChanged?.(meetingState);
    } catch (error) {
      logger.warn("Failed to check meeting state", undefined, error as Error);
    }
  }

  private checkMuteState(): boolean {
    if (!this.platformConfig?.indicators.muteButton) return false;

    const muteButton = DOMUtils.findFirstElement([
      this.platformConfig.indicators.muteButton,
    ]);
    if (!muteButton) return false;

    return (
      muteButton.getAttribute("aria-pressed") === "true" ||
      muteButton.getAttribute("data-is-muted") === "true" ||
      muteButton.classList.contains("muted")
    );
  }

  private checkVideoMuteState(): boolean {
    if (!this.platformConfig?.indicators.cameraButton) return false;

    const cameraButton = DOMUtils.findFirstElement([
      this.platformConfig.indicators.cameraButton,
    ]);
    if (!cameraButton) return false;

    return (
      cameraButton.getAttribute("aria-pressed") === "false" ||
      cameraButton.getAttribute("data-is-camera-on") === "false" ||
      cameraButton.classList.contains("off")
    );
  }

  private generateVideoId(video: HTMLVideoElement): string {
    // Generate unique ID based on element properties
    const src = video.src || video.currentSrc || "";
    const rect = video.getBoundingClientRect();
    const position = `${Math.round(rect.left)},${Math.round(rect.top)}`;

    return `${src}_${position}_${video.videoWidth}x${video.videoHeight}`;
  }

  private scheduleRetry(): void {
    if (this.retryCount >= DETECTION_SETTINGS.MAX_RETRY_ATTEMPTS) {
      logger.error("Max retry attempts reached for video detection");
      return;
    }

    this.retryCount++;
    const delay = DETECTION_SETTINGS.RETRY_INTERVAL * this.retryCount;

    logger.info(`Scheduling retry #${this.retryCount} in ${delay}ms`);
    setTimeout(() => this.initialize(), delay);
  }

  // Public API
  public getDetectedVideos(): DetectedVideo[] {
    return Array.from(this.detectedVideos.values());
  }

  public getMainVideo(): DetectedVideo | null {
    const videos = this.getDetectedVideos();
    return videos.find((video) => video.isMainVideo) || videos[0] || null;
  }

  public getCurrentPlatform(): SupportedPlatform | null {
    return this.currentPlatform;
  }

  public getPlatformConfig(): PlatformConfig | null {
    return this.platformConfig;
  }

  public addEventListener(
    event: string,
    callback: (...args: any[]) => void
  ): void {
    switch (event) {
      case "videoDetected":
        this.eventListeners.onVideoDetected = callback;
        break;
      case "videoRemoved":
        this.eventListeners.onVideoRemoved = callback;
        break;
      case "platformDetected":
        this.eventListeners.onPlatformDetected = callback;
        break;
      case "meetingStateChanged":
        this.eventListeners.onMeetingStateChanged = callback;
        break;
    }
  }

  public destroy(): void {
    logger.info("Destroying VideoDetector");

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.detectedVideos.clear();
    this.eventListeners = {};
  }
}
