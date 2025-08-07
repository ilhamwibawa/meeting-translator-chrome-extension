import { VideoToTextProcessor } from "../core/VideoToTextProcessor";
import { ControlPanel } from "./ControlPanel";
import { TranscriptOverlay } from "./TranscriptOverlay";
import {
  SettingsPanel,
  ExtensionSettings,
  DEFAULT_SETTINGS,
} from "./SettingsPanel";
import { createComponentLogger } from "../utils/logger";

const logger = createComponentLogger("UIManager");

export interface UIManagerConfig {
  autoStart: boolean;
  showOnInit: boolean;
  persistSettings: boolean;
}

export class UIManager {
  private processor: VideoToTextProcessor;
  private controlPanel: ControlPanel | null = null;
  private transcriptOverlay: TranscriptOverlay | null = null;
  private settingsPanel: SettingsPanel | null = null;

  private settings: ExtensionSettings = { ...DEFAULT_SETTINGS };
  private isInitialized = false;

  private config: UIManagerConfig = {
    autoStart: true,
    showOnInit: true,
    persistSettings: true,
  };

  constructor(
    processor: VideoToTextProcessor,
    config?: Partial<UIManagerConfig>
  ) {
    this.processor = processor;
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.initialize();
  }

  private async initialize(): Promise<void> {
    logger.info("Initializing UIManager");

    try {
      // Load persisted settings first
      if (this.config.persistSettings) {
        this.loadPersistedSettings();
      }

      // Create UI components
      await this.createComponents();

      // Setup event listeners
      this.setupEventListeners();

      // Apply initial settings
      this.applySettings();

      // Show UI if configured
      if (this.config.showOnInit) {
        this.showControlPanel();
      }

      this.isInitialized = true;
      logger.info("UIManager initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize UIManager:", error as Error);
      throw error;
    }
  }

  private async createComponents(): Promise<void> {
    // Create Control Panel
    this.controlPanel = new ControlPanel(this.processor, {
      position: this.settings.controlPanelPosition,
      draggable: true,
      minimizable: true,
      autoHide: false,
      theme: this.settings.theme,
    });

    // Create Transcript Overlay
    this.transcriptOverlay = new TranscriptOverlay({
      position: this.settings.transcriptPosition,
      maxEntries: this.settings.maxTranscriptEntries,
      autoScroll: this.settings.autoScroll,
      showConfidence: this.settings.showConfidence,
      showTimestamp: this.settings.showTimestamps,
      showSpeaker: this.settings.showSpeakerId,
      theme:
        this.settings.theme === "auto"
          ? "dark"
          : (this.settings.theme as "light" | "dark"),
      fontSize: this.settings.fontSize,
    });

    // Create Settings Panel
    this.settingsPanel = new SettingsPanel(this.settings);

    logger.info("UI components created");
  }

  private setupEventListeners(): void {
    if (!this.controlPanel || !this.transcriptOverlay || !this.settingsPanel) {
      throw new Error("UI components not initialized");
    }

    // Control Panel Events
    this.controlPanel.addEventListener("startRecording", () => {
      this.startRecording();
    });

    this.controlPanel.addEventListener("stopRecording", () => {
      this.stopRecording();
    });

    this.controlPanel.addEventListener("toggleTranscript", () => {
      this.toggleTranscriptOverlay();
    });

    this.controlPanel.addEventListener("settings", () => {
      this.showSettings();
    });

    this.controlPanel.addEventListener("close", () => {
      this.hideAll();
    });

    // Transcript Overlay Events
    this.transcriptOverlay.addEventListener("close", () => {
      this.hideTranscriptOverlay();
    });

    this.transcriptOverlay.addEventListener("toggleSettings", () => {
      this.showSettings();
    });

    // Settings Panel Events
    this.settingsPanel.addEventListener(
      "settingsChange",
      (newSettings: ExtensionSettings) => {
        this.updateSettings(newSettings);
      }
    );

    this.settingsPanel.addEventListener("close", () => {
      this.hideSettings();
    });

    // Processor Events
    this.processor.addEventListener("transcription", (result) => {
      this.transcriptOverlay?.addTranscription(result);
    });

    this.processor.addEventListener("videoDetected", () => {
      this.controlPanel?.updateStatus("ready", "Video Detected");
    });

    this.processor.addEventListener("statusChange", (stats) => {
      this.controlPanel?.updateStats(stats);
    });

    logger.info("Event listeners setup complete");
  }

  public async startRecording(): Promise<void> {
    try {
      logger.info("Starting recording session");

      // Update processor settings
      this.applyProcessorSettings();

      // Start the processor
      await this.processor.start();

      // Update UI
      this.controlPanel?.updateStatus("recording", "Recording...");

      // Show transcript overlay if configured
      if (this.settings.autoScroll) {
        this.showTranscriptOverlay();
      }

      logger.info("Recording session started");
    } catch (error) {
      logger.error("Failed to start recording:", error as Error);
      this.controlPanel?.updateStatus("error", "Start Failed");
      this.showErrorNotification(
        "Failed to start recording: " + (error as Error).message
      );
    }
  }

  public async stopRecording(): Promise<void> {
    try {
      logger.info("Stopping recording session");

      // Stop the processor
      await this.processor.stop();

      // Update UI
      this.controlPanel?.updateStatus("ready", "Ready");

      // Auto-export if configured
      if (this.settings.autoExport) {
        this.exportTranscripts();
      }

      logger.info("Recording session stopped");
    } catch (error) {
      logger.error("Failed to stop recording:", error as Error);
      this.showErrorNotification(
        "Failed to stop recording: " + (error as Error).message
      );
    }
  }

  private applyProcessorSettings(): void {
    // Update processor config with settings that are available in VideoToTextConfig
    this.processor.updateConfig({
      speechConfig: {
        language: this.settings.language as any, // Cast to SpeechLanguage
        continuous: this.settings.continuous,
        interimResults: this.settings.interimResults,
        maxAlternatives: this.settings.maxAlternatives,
      },
      enableRealTimeTranscription: true,
      autoDetectLanguage: false,
    });

    logger.info("Processor settings applied");
  }

  private updateSettings(newSettings: ExtensionSettings): void {
    const oldSettings = { ...this.settings };
    this.settings = { ...newSettings };

    logger.info("Settings updated:", { old: oldSettings, new: newSettings });

    // Apply settings to components
    this.applySettings();

    // Persist if configured
    if (this.config.persistSettings) {
      this.persistSettings();
    }
  }

  private applySettings(): void {
    // Update Control Panel
    if (this.controlPanel) {
      // Control panel position and theme are set during creation
      // For runtime updates, we would need to recreate or add update methods
    }

    // Update Transcript Overlay
    if (this.transcriptOverlay) {
      this.transcriptOverlay.updateConfig({
        position: this.settings.transcriptPosition,
        maxEntries: this.settings.maxTranscriptEntries,
        autoScroll: this.settings.autoScroll,
        showConfidence: this.settings.showConfidence,
        showTimestamp: this.settings.showTimestamps,
        showSpeaker: this.settings.showSpeakerId,
        theme:
          this.settings.theme === "auto"
            ? "dark"
            : (this.settings.theme as "light" | "dark"),
        fontSize: this.settings.fontSize,
      });
    }

    // Update Settings Panel
    if (this.settingsPanel) {
      this.settingsPanel.updateSettings(this.settings);
    }
  }

  public exportTranscripts(): void {
    const transcripts = this.transcriptOverlay?.getFinalTranscripts() || [];

    if (transcripts.length === 0) {
      this.showNotification("No transcripts to export");
      return;
    }

    const text = transcripts
      .map((entry) => {
        const timestamp = this.settings.showTimestamps
          ? `[${entry.timestamp.toLocaleTimeString()}] `
          : "";
        const speaker =
          this.settings.showSpeakerId && entry.speaker
            ? `${entry.speaker}: `
            : "";
        const confidence = this.settings.showConfidence
          ? ` (${Math.round(entry.confidence * 100)}%)`
          : "";

        return `${timestamp}${speaker}${entry.text}${confidence}`;
      })
      .join("\n\n");

    this.downloadFile(text, "text/plain", "meeting-transcript.txt");
    this.showNotification("Transcript exported");
  }

  private downloadFile(
    content: string,
    mimeType: string,
    filename: string
  ): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  }

  private loadPersistedSettings(): void {
    try {
      const stored = localStorage.getItem("meeting-translator-settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        this.settings = { ...DEFAULT_SETTINGS, ...parsed };
        logger.info("Settings loaded from storage");
      }
    } catch (error) {
      logger.error("Failed to load persisted settings:", error as Error);
    }
  }

  private persistSettings(): void {
    try {
      localStorage.setItem(
        "meeting-translator-settings",
        JSON.stringify(this.settings)
      );
      logger.info("Settings persisted to storage");
    } catch (error) {
      logger.error("Failed to persist settings:", error as Error);
    }
  }

  private showNotification(
    message: string,
    type: "info" | "success" | "warning" | "error" = "info"
  ): void {
    const colors = {
      info: "#2196F3",
      success: "#4CAF50",
      warning: "#FF9800",
      error: "#F44336",
    };

    const notification = document.createElement("div");
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 1000003;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: slideInRight 0.3s ease;
      max-width: 300px;
    `;

    // Add animation keyframes if not already present
    if (!document.getElementById("notification-styles")) {
      const styles = document.createElement("style");
      styles.id = "notification-styles";
      styles.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
  }

  private showErrorNotification(message: string): void {
    this.showNotification(message, "error");
  }

  // Public API
  public showControlPanel(): void {
    this.controlPanel?.show();
  }

  public hideControlPanel(): void {
    this.controlPanel?.hide();
  }

  public showTranscriptOverlay(): void {
    this.transcriptOverlay?.show();
  }

  public hideTranscriptOverlay(): void {
    this.transcriptOverlay?.hide();
  }

  public toggleTranscriptOverlay(): void {
    this.transcriptOverlay?.toggle();
  }

  public showSettings(): void {
    this.settingsPanel?.show();
  }

  public hideSettings(): void {
    this.settingsPanel?.hide();
  }

  public showAll(): void {
    this.showControlPanel();
    this.showTranscriptOverlay();
  }

  public hideAll(): void {
    this.hideControlPanel();
    this.hideTranscriptOverlay();
    this.hideSettings();
  }

  public isVisible(): boolean {
    return this.controlPanel?.show !== undefined; // Simple check
  }

  public getSettings(): ExtensionSettings {
    return { ...this.settings };
  }

  public updateUISettings(settings: Partial<ExtensionSettings>): void {
    this.updateSettings({ ...this.settings, ...settings });
  }

  public exportSettings(): void {
    const dataStr = JSON.stringify(this.settings, null, 2);
    this.downloadFile(
      dataStr,
      "application/json",
      "meeting-translator-settings.json"
    );
    this.showNotification("Settings exported");
  }

  public importSettings(settingsData: string): void {
    try {
      const imported = JSON.parse(settingsData);
      this.updateSettings({ ...DEFAULT_SETTINGS, ...imported });
      this.showNotification("Settings imported successfully");
    } catch (error) {
      this.showErrorNotification("Failed to import settings: Invalid format");
    }
  }

  public isRecording(): boolean {
    return this.processor?.isActive() || false;
  }

  public show(): void {
    this.showControlPanel();
  }

  public getTranscriptCount(): number {
    return this.getTranscripts().length;
  }

  public getAudioQuality(): string {
    // This would come from the processor's audio analysis
    return "Good";
  }

  public getTranscripts(): any[] {
    return this.transcriptOverlay?.getTranscripts() || [];
  }

  public clearTranscripts(): void {
    this.transcriptOverlay?.clearTranscripts();
    this.showNotification("Transcripts cleared");
  }

  public destroy(): void {
    logger.info("Destroying UIManager");

    try {
      // Stop recording if active
      if (this.isRecording()) {
        this.processor.stop();
      }

      // Destroy UI components
      this.controlPanel?.destroy();
      this.transcriptOverlay?.destroy();
      this.settingsPanel?.destroy();

      // Clear references
      this.controlPanel = null;
      this.transcriptOverlay = null;
      this.settingsPanel = null;

      this.isInitialized = false;
      logger.info("UIManager destroyed");
    } catch (error) {
      logger.error("Error during UIManager destruction:", error as Error);
    }
  }
}
