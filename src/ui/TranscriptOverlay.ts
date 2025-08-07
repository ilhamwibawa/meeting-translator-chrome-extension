import { TranscriptionResult } from "../types/speech";
import { createComponentLogger } from "../utils/logger";
import { DOM_ELEMENTS, CSS_CLASSES } from "../utils/constants";

const logger = createComponentLogger("TranscriptOverlay");

export interface TranscriptEntry {
  id: string;
  text: string;
  timestamp: Date;
  confidence: number;
  isFinal: boolean;
  speaker?: string;
}

export interface TranscriptOverlayConfig {
  position: "top" | "bottom" | "left" | "right" | "center";
  maxEntries: number;
  autoScroll: boolean;
  showConfidence: boolean;
  showTimestamp: boolean;
  showSpeaker: boolean;
  fadeOutDelay: number; // ms
  theme: "light" | "dark" | "transparent";
  fontSize: "small" | "medium" | "large";
}

export class TranscriptOverlay {
  private element: HTMLElement | null = null;
  private isVisible = false;
  private transcripts: TranscriptEntry[] = [];
  private currentInterimId: string | null = null;

  private config: TranscriptOverlayConfig = {
    position: "bottom",
    maxEntries: 50,
    autoScroll: true,
    showConfidence: false,
    showTimestamp: true,
    showSpeaker: false,
    fadeOutDelay: 10000, // 10 seconds
    theme: "dark",
    fontSize: "medium",
  };

  private eventListeners: {
    onClose?: () => void;
    onClear?: () => void;
    onExport?: () => void;
    onToggleSettings?: () => void;
  } = {};

  constructor(config?: Partial<TranscriptOverlayConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.initialize();
  }

  private initialize(): void {
    logger.info("Initializing TranscriptOverlay");
    this.createOverlayElement();
    this.attachEventListeners();
    this.applyPosition();
    this.injectIntoPage();
    logger.info("TranscriptOverlay initialized successfully");
  }

  private createOverlayElement(): void {
    this.element = document.createElement("div");
    this.element.id = DOM_ELEMENTS.TRANSCRIPT_OVERLAY_ID;
    this.element.className = `${CSS_CLASSES.OVERLAY} ${CSS_CLASSES.TRANSCRIPT}`;

    // Apply theme and font size
    this.element.setAttribute("data-theme", this.config.theme);
    this.element.setAttribute("data-font-size", this.config.fontSize);

    this.element.innerHTML = `
      <div class="${CSS_CLASSES.OVERLAY}-header">
        <div class="header-left">
          <span class="overlay-icon">📝</span>
          <span class="overlay-title">Live Transcript</span>
          <span class="transcript-count">0</span>
        </div>
        <div class="header-controls">
          <button class="overlay-btn settings-btn" title="Settings">⚙️</button>
          <button class="overlay-btn clear-btn" title="Clear Transcript">🗑️</button>
          <button class="overlay-btn export-btn" title="Export">💾</button>
          <button class="overlay-btn close-btn" title="Close">×</button>
        </div>
      </div>

      <div class="${CSS_CLASSES.OVERLAY}-content">
        <div class="transcript-container" data-auto-scroll="${
          this.config.autoScroll
        }">
          <div class="transcript-list"></div>
          <div class="transcript-placeholder">
            <span class="placeholder-icon">🎤</span>
            <span class="placeholder-text">Waiting for speech...</span>
          </div>
        </div>
      </div>

      <div class="${CSS_CLASSES.OVERLAY}-footer">
        <div class="status-info">
          <span class="status-text">Ready</span>
          <span class="confidence-indicator" style="display: ${
            this.config.showConfidence ? "inline" : "none"
          }">
            Confidence: <span class="confidence-value">--</span>%
          </span>
        </div>
        <div class="controls-info">
          <span class="control-hint">Drag to resize • Double-click to minimize</span>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    if (!this.element) return;

    // Header controls
    const settingsBtn = this.element.querySelector(".settings-btn");
    const clearBtn = this.element.querySelector(".clear-btn");
    const exportBtn = this.element.querySelector(".export-btn");
    const closeBtn = this.element.querySelector(".close-btn");

    if (settingsBtn) {
      settingsBtn.addEventListener("click", () =>
        this.eventListeners.onToggleSettings?.()
      );
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => this.clearTranscriptsInternal());
    }

    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.exportTranscripts());
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.hide());
    }

    // Double-click to minimize
    const header = this.element.querySelector(`.${CSS_CLASSES.OVERLAY}-header`);
    if (header) {
      header.addEventListener("dblclick", () => this.toggleMinimized());
    }

    // Auto-hide on outside click (optional)
    document.addEventListener("click", (e) => {
      if (
        this.isVisible &&
        this.element &&
        !this.element.contains(e.target as Node)
      ) {
        // Only hide if configured for auto-hide (could be added to config)
        // this.hide();
      }
    });
  }

  private applyPosition(): void {
    if (!this.element) return;

    const positions = {
      top: {
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "80%",
        maxWidth: "800px",
      },
      bottom: {
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "80%",
        maxWidth: "800px",
      },
      left: {
        left: "20px",
        top: "50%",
        transform: "translateY(-50%)",
        width: "300px",
        height: "60%",
      },
      right: {
        right: "20px",
        top: "50%",
        transform: "translateY(-50%)",
        width: "300px",
        height: "60%",
      },
      center: {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "60%",
        height: "50%",
        maxWidth: "600px",
      },
    };

    const pos = positions[this.config.position];
    Object.assign(this.element.style, {
      position: "fixed",
      zIndex: "999998", // Lower than control panel
      backgroundColor: "var(--overlay-bg)",
      border: "1px solid var(--overlay-border)",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
      backdropFilter: "blur(10px)",
      ...pos,
    });
  }

  private injectIntoPage(): void {
    if (!this.element) return;

    // Remove existing overlay if any
    const existing = document.getElementById(
      DOM_ELEMENTS.TRANSCRIPT_OVERLAY_ID
    );
    if (existing) {
      existing.remove();
    }

    document.body.appendChild(this.element);
  }

  public addTranscription(result: TranscriptionResult): void {
    logger.debug("Adding transcription:", result);

    if (result.isFinal) {
      this.addFinalTranscript(result);
    } else {
      this.updateInterimTranscript(result);
    }

    this.updateUI();
  }

  private addFinalTranscript(result: TranscriptionResult): void {
    // Remove any interim transcript
    if (this.currentInterimId) {
      this.removeTranscript(this.currentInterimId);
      this.currentInterimId = null;
    }

    const entry: TranscriptEntry = {
      id: this.generateId(),
      text: result.text,
      timestamp: new Date(),
      confidence: result.confidence,
      isFinal: true,
      ...(result.speakerId && { speaker: result.speakerId }),
    };

    this.transcripts.push(entry);

    // Limit entries
    if (this.transcripts.length > this.config.maxEntries) {
      this.transcripts = this.transcripts.slice(-this.config.maxEntries);
    }

    this.renderTranscript(entry);
    this.scheduleAutoScroll();
  }

  private updateInterimTranscript(result: TranscriptionResult): void {
    if (this.currentInterimId) {
      this.removeTranscript(this.currentInterimId);
    }

    this.currentInterimId = this.generateId();
    const entry: TranscriptEntry = {
      id: this.currentInterimId,
      text: result.text,
      timestamp: new Date(),
      confidence: result.confidence,
      isFinal: false,
      ...(result.speakerId && { speaker: result.speakerId }),
    };

    this.renderTranscript(entry);
    this.scheduleAutoScroll();
  }

  private renderTranscript(entry: TranscriptEntry): void {
    if (!this.element) return;

    const transcriptList = this.element.querySelector(
      ".transcript-list"
    ) as HTMLElement;
    const placeholder = this.element.querySelector(
      ".transcript-placeholder"
    ) as HTMLElement;

    if (!transcriptList) return;

    // Hide placeholder
    if (placeholder) {
      placeholder.style.display = "none";
    }

    const transcriptElement = document.createElement("div");
    transcriptElement.className = `transcript-entry ${
      entry.isFinal ? "final" : "interim"
    }`;
    transcriptElement.setAttribute("data-id", entry.id);

    const timestamp = this.config.showTimestamp
      ? `<span class="timestamp">${this.formatTimestamp(
          entry.timestamp
        )}</span>`
      : "";

    const speaker =
      this.config.showSpeaker && entry.speaker
        ? `<span class="speaker">${entry.speaker}:</span>`
        : "";

    const confidence = this.config.showConfidence
      ? `<span class="confidence" data-confidence="${Math.round(
          entry.confidence * 100
        )}">
           ${Math.round(entry.confidence * 100)}%
         </span>`
      : "";

    transcriptElement.innerHTML = `
      <div class="entry-header">
        ${timestamp}
        ${speaker}
        ${confidence}
      </div>
      <div class="entry-text">${this.escapeHtml(entry.text)}</div>
    `;

    transcriptList.appendChild(transcriptElement);

    // Schedule fade out for interim transcripts
    if (!entry.isFinal && this.config.fadeOutDelay > 0) {
      setTimeout(() => {
        this.removeTranscript(entry.id);
      }, this.config.fadeOutDelay);
    }
  }

  private removeTranscript(id: string): void {
    if (!this.element) return;

    const element = this.element.querySelector(`[data-id="${id}"]`);
    if (element) {
      element.remove();
    }
  }

  private scheduleAutoScroll(): void {
    if (!this.config.autoScroll || !this.element) return;

    setTimeout(() => {
      const container = this.element?.querySelector(
        ".transcript-container"
      ) as HTMLElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  }

  private updateUI(): void {
    if (!this.element) return;

    const finalCount = this.transcripts.filter((t) => t.isFinal).length;
    const countElement = this.element.querySelector(
      ".transcript-count"
    ) as HTMLElement;

    if (countElement) {
      countElement.textContent = finalCount.toString();
    }

    // Update status
    const statusText = this.element.querySelector(
      ".status-text"
    ) as HTMLElement;
    if (statusText) {
      statusText.textContent = finalCount > 0 ? "Recording" : "Ready";
    }

    // Show/hide placeholder
    const placeholder = this.element.querySelector(
      ".transcript-placeholder"
    ) as HTMLElement;
    const hasAnyTranscripts =
      this.transcripts.length > 0 || this.currentInterimId;

    if (placeholder) {
      placeholder.style.display = hasAnyTranscripts ? "none" : "flex";
    }
  }

  public clearTranscripts(): void {
    this.clearTranscriptsInternal();
    this.eventListeners.onClear?.();
  }

  private clearTranscriptsInternal(): void {
    logger.info("Clearing all transcripts");

    this.transcripts = [];
    this.currentInterimId = null;

    if (this.element) {
      const transcriptList = this.element.querySelector(
        ".transcript-list"
      ) as HTMLElement;
      if (transcriptList) {
        transcriptList.innerHTML = "";
      }
    }

    this.updateUI();
    this.eventListeners.onClear?.();
  }

  private exportTranscripts(): void {
    logger.info("Exporting transcripts");

    const finalTranscripts = this.transcripts.filter((t) => t.isFinal);
    if (finalTranscripts.length === 0) {
      this.showNotification("No final transcripts to export");
      return;
    }

    const text = finalTranscripts
      .map((entry) => {
        const timestamp = this.config.showTimestamp
          ? `[${this.formatTimestamp(entry.timestamp)}] `
          : "";
        const speaker =
          this.config.showSpeaker && entry.speaker ? `${entry.speaker}: ` : "";
        const confidence = this.config.showConfidence
          ? ` (${Math.round(entry.confidence * 100)}%)`
          : "";

        return `${timestamp}${speaker}${entry.text}${confidence}`;
      })
      .join("\n\n");

    this.downloadTranscript(text);
    this.eventListeners.onExport?.();
  }

  private downloadTranscript(text: string): void {
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `live-transcript-${timestamp}.txt`;

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
    const notification = document.createElement("div");
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 50px;
      left: 50%;
      transform: translateX(-50%);
      background: #2196F3;
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      z-index: 1000001;
      font-family: Arial, sans-serif;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  private toggleMinimized(): void {
    if (!this.element) return;

    const content = this.element.querySelector(
      `.${CSS_CLASSES.OVERLAY}-content`
    ) as HTMLElement;
    const footer = this.element.querySelector(
      `.${CSS_CLASSES.OVERLAY}-footer`
    ) as HTMLElement;

    const isMinimized = content.style.display === "none";

    content.style.display = isMinimized ? "block" : "none";
    footer.style.display = isMinimized ? "block" : "none";
  }

  // Utility methods
  private generateId(): string {
    return `transcript-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  private formatTimestamp(date: Date): string {
    return date.toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Public API
  public show(): void {
    if (this.element) {
      this.element.style.display = "block";
      this.isVisible = true;
      this.scheduleAutoScroll();
    }
  }

  public hide(): void {
    if (this.element) {
      this.element.style.display = "none";
      this.isVisible = false;
    }
    this.eventListeners.onClose?.();
  }

  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  public updateConfig(newConfig: Partial<TranscriptOverlayConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (this.element) {
      this.element.setAttribute("data-theme", this.config.theme);
      this.element.setAttribute("data-font-size", this.config.fontSize);

      // Update auto-scroll
      const container = this.element.querySelector(
        ".transcript-container"
      ) as HTMLElement;
      if (container) {
        container.setAttribute(
          "data-auto-scroll",
          this.config.autoScroll.toString()
        );
      }

      // Update confidence display
      const confidenceIndicator = this.element.querySelector(
        ".confidence-indicator"
      ) as HTMLElement;
      if (confidenceIndicator) {
        confidenceIndicator.style.display = this.config.showConfidence
          ? "inline"
          : "none";
      }
    }
  }

  public getTranscripts(): TranscriptEntry[] {
    return [...this.transcripts];
  }

  public getFinalTranscripts(): TranscriptEntry[] {
    return this.transcripts.filter((t) => t.isFinal);
  }

  public addEventListener(
    event: string,
    callback: (...args: any[]) => void
  ): void {
    switch (event) {
      case "close":
        this.eventListeners.onClose = callback;
        break;
      case "clear":
        this.eventListeners.onClear = callback;
        break;
      case "export":
        this.eventListeners.onExport = callback;
        break;
      case "toggleSettings":
        this.eventListeners.onToggleSettings = callback;
        break;
    }
  }

  public destroy(): void {
    logger.info("Destroying TranscriptOverlay");

    if (this.element) {
      this.element.remove();
      this.element = null;
    }

    this.transcripts = [];
    this.currentInterimId = null;
    this.eventListeners = {};
  }
}
