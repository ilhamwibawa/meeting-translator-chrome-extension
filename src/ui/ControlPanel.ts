import {
  VideoToTextProcessor,
  ProcessorStats,
} from "../core/VideoToTextProcessor";
import { TranscriptionResult } from "../types/speech";
import { createComponentLogger } from "../utils/logger";
import { DOM_ELEMENTS, CSS_CLASSES } from "../utils/constants";

const logger = createComponentLogger("ControlPanel");

export interface ControlPanelConfig {
  position: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  draggable: boolean;
  minimizable: boolean;
  autoHide: boolean;
  theme: "light" | "dark" | "auto";
}

export class ControlPanel {
  private element: HTMLElement | null = null;
  private processor: VideoToTextProcessor | null = null;
  private isVisible = true;
  private isMinimized = false;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };

  private config: ControlPanelConfig = {
    position: "top-right",
    draggable: true,
    minimizable: true,
    autoHide: false,
    theme: "auto",
  };

  private eventListeners: {
    onStartRecording?: () => void;
    onStopRecording?: () => void;
    onToggleTranscript?: () => void;
    onSettings?: () => void;
    onMinimize?: () => void;
    onClose?: () => void;
  } = {};

  constructor(
    processor: VideoToTextProcessor,
    config?: Partial<ControlPanelConfig>
  ) {
    this.processor = processor;
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.initialize();
  }

  private initialize(): void {
    logger.info("Initializing ControlPanel");
    this.createPanelElement();
    this.attachEventListeners();
    this.applyPosition();
    this.injectIntoPage();
    logger.info("ControlPanel initialized successfully");
  }

  private createPanelElement(): void {
    // Main control panel container
    this.element = document.createElement("div");
    this.element.id = DOM_ELEMENTS.CONTROL_PANEL_ID;
    this.element.className = `${CSS_CLASSES.CONTAINER} ${CSS_CLASSES.PANEL}`;

    // Apply theme
    this.element.setAttribute("data-theme", this.config.theme);

    if (this.config.draggable) {
      this.element.classList.add(CSS_CLASSES.DRAGGABLE);
    }

    this.element.innerHTML = `
      <div class="${CSS_CLASSES.PANEL}-header" ${
      this.config.draggable ? 'data-drag-handle="true"' : ""
    }>
        <div class="${CSS_CLASSES.PANEL}-title">
          <span class="title-icon">🎥</span>
          <span class="title-text">Meeting Translator</span>
        </div>
        <div class="${CSS_CLASSES.PANEL}-header-controls">
          ${
            this.config.minimizable
              ? `<button class="header-btn minimize-btn" title="Minimize">−</button>`
              : ""
          }
          <button class="header-btn close-btn" title="Close">×</button>
        </div>
      </div>

      <div class="${CSS_CLASSES.PANEL}-content" ${
      this.isMinimized ? 'style="display: none;"' : ""
    }>
        <!-- Status Section -->
        <div class="${CSS_CLASSES.PANEL}-section status-section">
          <div class="status-indicator">
            <span class="status-dot" data-status="inactive"></span>
            <span class="status-text">Ready</span>
          </div>
          <div class="platform-info">
            <span class="platform-label">Platform:</span>
            <span class="platform-value">Unknown</span>
          </div>
        </div>

        <!-- Main Controls -->
        <div class="${CSS_CLASSES.PANEL}-section controls-section">
          <button class="control-btn primary-btn start-btn" disabled>
            <span class="btn-icon">▶️</span>
            <span class="btn-text">Start Recording</span>
          </button>
          <button class="control-btn secondary-btn stop-btn" disabled style="display: none;">
            <span class="btn-icon">⏹️</span>
            <span class="btn-text">Stop Recording</span>
          </button>
        </div>

        <!-- Feature Controls -->
        <div class="${CSS_CLASSES.PANEL}-section features-section">
          <button class="feature-btn transcript-btn" title="Toggle Transcript Overlay">
            <span class="btn-icon">📝</span>
            <span class="btn-text">Transcript</span>
          </button>
          <button class="feature-btn settings-btn" title="Settings">
            <span class="btn-icon">⚙️</span>
            <span class="btn-text">Settings</span>
          </button>
          <button class="feature-btn export-btn" title="Export Transcript" disabled>
            <span class="btn-icon">💾</span>
            <span class="btn-text">Export</span>
          </button>
        </div>

        <!-- Stats Section -->
        <div class="${
          CSS_CLASSES.PANEL
        }-section stats-section" style="display: none;">
          <div class="stat-item">
            <span class="stat-label">Videos:</span>
            <span class="stat-value videos-count">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Audio:</span>
            <span class="stat-value audio-count">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Transcripts:</span>
            <span class="stat-value transcript-count">0</span>
          </div>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    if (!this.element) return;

    // Header controls
    const minimizeBtn = this.element.querySelector(".minimize-btn");
    const closeBtn = this.element.querySelector(".close-btn");

    if (minimizeBtn) {
      minimizeBtn.addEventListener("click", () => this.toggleMinimized());
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.hide());
    }

    // Main controls
    const startBtn = this.element.querySelector(
      ".start-btn"
    ) as HTMLButtonElement;
    const stopBtn = this.element.querySelector(
      ".stop-btn"
    ) as HTMLButtonElement;

    if (startBtn) {
      startBtn.addEventListener("click", () => this.handleStartRecording());
    }

    if (stopBtn) {
      stopBtn.addEventListener("click", () => this.handleStopRecording());
    }

    // Feature controls
    const transcriptBtn = this.element.querySelector(".transcript-btn");
    const settingsBtn = this.element.querySelector(".settings-btn");
    const exportBtn = this.element.querySelector(".export-btn");

    if (transcriptBtn) {
      transcriptBtn.addEventListener("click", () =>
        this.eventListeners.onToggleTranscript?.()
      );
    }

    if (settingsBtn) {
      settingsBtn.addEventListener("click", () =>
        this.eventListeners.onSettings?.()
      );
    }

    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.handleExport());
    }

    // Dragging functionality
    if (this.config.draggable) {
      this.setupDragging();
    }

    // Processor event listeners
    if (this.processor) {
      this.processor.addEventListener(
        "statusChange",
        (stats: ProcessorStats) => {
          this.updateStats(stats);
        }
      );

      this.processor.addEventListener("videoDetected", () => {
        this.updateStatus("ready", "Video Detected");
        this.enableStartButton();
      });

      this.processor.addEventListener(
        "transcription",
        (result: TranscriptionResult) => {
          if (result.isFinal) {
            this.incrementTranscriptCount();
          }
        }
      );
    }
  }

  private setupDragging(): void {
    if (!this.element) return;

    const header = this.element.querySelector(
      '[data-drag-handle="true"]'
    ) as HTMLElement;
    if (!header) return;

    header.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      const rect = this.element!.getBoundingClientRect();
      this.dragOffset.x = e.clientX - rect.left;
      this.dragOffset.y = e.clientY - rect.top;

      header.style.cursor = "grabbing";
      document.addEventListener("mousemove", this.handleDrag);
      document.addEventListener("mouseup", this.handleDragEnd);
    });
  }

  private handleDrag = (e: MouseEvent): void => {
    if (!this.isDragging || !this.element) return;

    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;

    // Keep within viewport bounds
    const maxX = window.innerWidth - this.element.offsetWidth;
    const maxY = window.innerHeight - this.element.offsetHeight;

    const boundedX = Math.max(0, Math.min(x, maxX));
    const boundedY = Math.max(0, Math.min(y, maxY));

    this.element.style.left = `${boundedX}px`;
    this.element.style.top = `${boundedY}px`;
    this.element.style.right = "auto";
    this.element.style.bottom = "auto";
  };

  private handleDragEnd = (): void => {
    this.isDragging = false;
    const header = this.element?.querySelector(
      '[data-drag-handle="true"]'
    ) as HTMLElement;
    if (header) {
      header.style.cursor = "grab";
    }
    document.removeEventListener("mousemove", this.handleDrag);
    document.removeEventListener("mouseup", this.handleDragEnd);
  };

  private applyPosition(): void {
    if (!this.element) return;

    const positions = {
      "top-right": { top: "20px", right: "20px" },
      "top-left": { top: "20px", left: "20px" },
      "bottom-right": { bottom: "20px", right: "20px" },
      "bottom-left": { bottom: "20px", left: "20px" },
    };

    const pos = positions[this.config.position];
    Object.assign(this.element.style, {
      position: "fixed",
      zIndex: "999999",
      ...pos,
    });
  }

  private injectIntoPage(): void {
    if (!this.element) return;

    // Remove existing panel if any
    const existing = document.getElementById(DOM_ELEMENTS.CONTROL_PANEL_ID);
    if (existing) {
      existing.remove();
    }

    document.body.appendChild(this.element);
  }

  private handleStartRecording(): void {
    logger.info("Start recording requested");
    this.updateStatus("recording", "Recording...");
    this.showStopButton();
    this.eventListeners.onStartRecording?.();
  }

  private handleStopRecording(): void {
    logger.info("Stop recording requested");
    this.updateStatus("ready", "Ready");
    this.showStartButton();
    this.eventListeners.onStopRecording?.();
  }

  private handleExport(): void {
    if (!this.processor) return;

    const transcripts = this.processor.getCurrentTranscripts();
    const text = transcripts
      .filter((t) => t.isFinal)
      .map((t) => t.text)
      .join("\n");

    if (text.trim()) {
      this.downloadTranscript(text);
    } else {
      this.showNotification("No transcripts to export");
    }
  }

  private downloadTranscript(text: string): void {
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `meeting-transcript-${timestamp}.txt`;

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
    this.showNotification("Transcript exported");
  }

  private showNotification(message: string): void {
    // Simple notification - could be enhanced with a proper notification system
    const notification = document.createElement("div");
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #4CAF50;
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      z-index: 1000000;
      font-family: Arial, sans-serif;
    `;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  // Public API
  public show(): void {
    if (this.element) {
      this.element.style.display = "block";
      this.isVisible = true;
    }
  }

  public hide(): void {
    if (this.element) {
      this.element.style.display = "none";
      this.isVisible = false;
    }
    this.eventListeners.onClose?.();
  }

  public toggleMinimized(): void {
    const content = this.element?.querySelector(
      `.${CSS_CLASSES.PANEL}-content`
    ) as HTMLElement;
    const minimizeBtn = this.element?.querySelector(
      ".minimize-btn"
    ) as HTMLElement;

    if (content && minimizeBtn) {
      this.isMinimized = !this.isMinimized;
      content.style.display = this.isMinimized ? "none" : "block";
      minimizeBtn.textContent = this.isMinimized ? "+" : "−";
      minimizeBtn.title = this.isMinimized ? "Restore" : "Minimize";
    }

    this.eventListeners.onMinimize?.();
  }

  public updateStatus(
    status: "inactive" | "ready" | "recording" | "error",
    text: string
  ): void {
    if (!this.element) return;

    const statusDot = this.element.querySelector(".status-dot") as HTMLElement;
    const statusText = this.element.querySelector(
      ".status-text"
    ) as HTMLElement;

    if (statusDot) {
      statusDot.setAttribute("data-status", status);
    }

    if (statusText) {
      statusText.textContent = text;
    }
  }

  public updateStats(stats: ProcessorStats): void {
    if (!this.element) return;

    const videosCount = this.element.querySelector(
      ".videos-count"
    ) as HTMLElement;
    const audioCount = this.element.querySelector(
      ".audio-count"
    ) as HTMLElement;
    const transcriptCount = this.element.querySelector(
      ".transcript-count"
    ) as HTMLElement;
    const platformValue = this.element.querySelector(
      ".platform-value"
    ) as HTMLElement;

    if (videosCount) videosCount.textContent = stats.videosDetected.toString();
    if (audioCount)
      audioCount.textContent = stats.audioStreamsActive.toString();
    if (transcriptCount)
      transcriptCount.textContent = stats.totalTranscriptions.toString();
    if (platformValue)
      platformValue.textContent = stats.currentPlatform || "Unknown";

    // Show stats section if recording
    const statsSection = this.element.querySelector(
      ".stats-section"
    ) as HTMLElement;
    if (statsSection) {
      statsSection.style.display = stats.isActive ? "block" : "none";
    }

    // Enable export if there are transcriptions
    const exportBtn = this.element.querySelector(
      ".export-btn"
    ) as HTMLButtonElement;
    if (exportBtn) {
      exportBtn.disabled = stats.totalTranscriptions === 0;
    }
  }

  private enableStartButton(): void {
    const startBtn = this.element?.querySelector(
      ".start-btn"
    ) as HTMLButtonElement;
    if (startBtn) {
      startBtn.disabled = false;
    }
  }

  private showStopButton(): void {
    const startBtn = this.element?.querySelector(".start-btn") as HTMLElement;
    const stopBtn = this.element?.querySelector(".stop-btn") as HTMLElement;

    if (startBtn) startBtn.style.display = "none";
    if (stopBtn) {
      stopBtn.style.display = "block";
      (stopBtn as HTMLButtonElement).disabled = false;
    }
  }

  private showStartButton(): void {
    const startBtn = this.element?.querySelector(".start-btn") as HTMLElement;
    const stopBtn = this.element?.querySelector(".stop-btn") as HTMLElement;

    if (stopBtn) stopBtn.style.display = "none";
    if (startBtn) {
      startBtn.style.display = "block";
      (startBtn as HTMLButtonElement).disabled = false;
    }
  }

  private incrementTranscriptCount(): void {
    const transcriptCount = this.element?.querySelector(
      ".transcript-count"
    ) as HTMLElement;
    if (transcriptCount) {
      const current = parseInt(transcriptCount.textContent || "0");
      transcriptCount.textContent = (current + 1).toString();
    }
  }

  public addEventListener(
    event: string,
    callback: (...args: any[]) => void
  ): void {
    switch (event) {
      case "startRecording":
        this.eventListeners.onStartRecording = callback;
        break;
      case "stopRecording":
        this.eventListeners.onStopRecording = callback;
        break;
      case "toggleTranscript":
        this.eventListeners.onToggleTranscript = callback;
        break;
      case "settings":
        this.eventListeners.onSettings = callback;
        break;
      case "minimize":
        this.eventListeners.onMinimize = callback;
        break;
      case "close":
        this.eventListeners.onClose = callback;
        break;
    }
  }

  public destroy(): void {
    logger.info("Destroying ControlPanel");

    if (this.element) {
      this.element.remove();
      this.element = null;
    }

    this.eventListeners = {};
    document.removeEventListener("mousemove", this.handleDrag);
    document.removeEventListener("mouseup", this.handleDragEnd);
  }
}
