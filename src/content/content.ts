import { VideoToTextProcessor } from "../core/VideoToTextProcessor";
import { UIManager } from "../ui/UIManager";
import { injectStyles } from "../utils/dom";
import { createComponentLogger } from "../utils/logger";

const logger = createComponentLogger("ContentScript");

class MeetingTranslatorExtension {
  private processor: VideoToTextProcessor | null = null;
  private uiManager: UIManager | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      logger.info("🚀 Initializing Meeting Translator Extension");
      logger.info("📍 Current URL:", window.location.href);
      logger.info("🎯 Document ready state:", document.readyState);

      // Wait for DOM to be ready
      if (document.readyState === "loading") {
        logger.info("⏳ Waiting for DOM to load...");
        await new Promise((resolve) => {
          document.addEventListener("DOMContentLoaded", resolve, {
            once: true,
          });
        });
      }

      // Inject CSS styles first
      await this.injectStyles();

      logger.info("🔧 Creating VideoToTextProcessor...");
      // Initialize the main processor
      this.processor = new VideoToTextProcessor({
        enableRealTimeTranscription: true,
        audioConfig: {
          preferredMethod: "auto",
          maxLatency: 100,
        },
        speechConfig: {
          language: "en-US",
          continuous: true,
          interimResults: true,
          confidenceThreshold: 0.7,
        },
      });

      // Create UI manager
      logger.info("� Creating UI Manager...");
      this.uiManager = new UIManager(this.processor, {
        autoStart: false,
        showOnInit: true,
        persistSettings: true,
      });

      this.isInitialized = true;
      logger.info("✅ Meeting Translator Extension initialized successfully");
    } catch (error) {
      logger.error("❌ Failed to initialize extension", error as Error);
      this.showErrorNotification("Extension failed to initialize");
    }
  }

  private async injectStyles(): Promise<void> {
    try {
      // Import and inject the CSS styles
      const stylesUrl = chrome.runtime.getURL("src/ui/styles.css");
      await injectStyles(stylesUrl);
      logger.info("📄 Styles injected successfully");
    } catch (error) {
      logger.error("Failed to inject styles:", error as Error);
    }
  }

  private showErrorNotification(message: string): void {
    const notification = document.createElement("div");
    notification.textContent = `Meeting Translator: ${message}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 1000000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
  }

  public destroy(): void {
    logger.info("🔄 Destroying Meeting Translator Extension");

    if (this.uiManager) {
      this.uiManager.destroy();
      this.uiManager = null;
    }

    if (this.processor) {
      this.processor.destroy();
      this.processor = null;
    }

    this.isInitialized = false;
    logger.info("🏁 Extension destroyed");
  }

  public getStatus(): any {
    return {
      isInitialized: this.isInitialized,
      isRecording: this.uiManager?.isRecording() || false,
      processorActive: this.processor?.isActive() || false,
      transcriptCount: this.uiManager?.getTranscriptCount() || 0,
      audioQuality: this.uiManager?.getAudioQuality() || "Unknown",
    };
  }

  public toggleRecording(): boolean {
    if (!this.uiManager) return false;

    if (this.uiManager.isRecording()) {
      this.uiManager.stopRecording();
    } else {
      this.uiManager.startRecording();
    }
    return true;
  }

  public showUI(): boolean {
    if (!this.uiManager) return false;
    this.uiManager.show();
    return true;
  }

  public showSettings(): boolean {
    if (!this.uiManager) return false;
    this.uiManager.showSettings();
    return true;
  }

  public exportTranscripts(): boolean {
    if (!this.uiManager) return false;
    this.uiManager.exportTranscripts();
    return true;
  }

  public clearTranscripts(): boolean {
    if (!this.uiManager) return false;
    this.uiManager.clearTranscripts();
    return true;
  }

  public getTranscripts(): any[] {
    return this.uiManager?.getTranscripts() || [];
  }

  public getLastTranscript(): string | null {
    const transcripts = this.getTranscripts();
    return transcripts.length > 0
      ? transcripts[transcripts.length - 1].text
      : null;
  }
}

// Global extension instance
let extension: MeetingTranslatorExtension | null = null;

// Initialize when DOM is ready
function initializeExtension(): void {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeExtension);
    return;
  }

  if (extension) {
    logger.warn("Extension already initialized");
    return;
  }

  extension = new MeetingTranslatorExtension();
}

// Clean up on page unload
window.addEventListener("beforeunload", () => {
  if (extension) {
    extension.destroy();
    extension = null;
  }
});

// Message listener for extension commands
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.info("Message received:", message);

  switch (message.action) {
    case "toggle-extension":
      if (extension) {
        const success = extension.toggleRecording();
        sendResponse({ success });
      } else {
        sendResponse({ success: false, error: "Extension not initialized" });
      }
      break;

    case "show-ui":
      if (extension) {
        const success = extension.showUI();
        sendResponse({ success });
      } else {
        sendResponse({ success: false, error: "UI not available" });
      }
      break;

    case "show-settings":
      if (extension) {
        const success = extension.showSettings();
        sendResponse({ success });
      } else {
        sendResponse({ success: false, error: "Settings not available" });
      }
      break;

    case "export-transcripts":
      if (extension) {
        const transcripts = extension.getTranscripts();
        if (transcripts && transcripts.length > 0) {
          const success = extension.exportTranscripts();
          sendResponse({ success });
        } else {
          sendResponse({ success: false, error: "No transcripts to export" });
        }
      } else {
        sendResponse({ success: false, error: "Export not available" });
      }
      break;

    case "clear-transcripts":
      if (extension) {
        const success = extension.clearTranscripts();
        sendResponse({ success });
      } else {
        sendResponse({ success: false, error: "Clear not available" });
      }
      break;

    case "get-last-transcript":
      if (extension) {
        const lastTranscript = extension.getLastTranscript();
        sendResponse({
          success: true,
          data: lastTranscript,
        });
      } else {
        sendResponse({ success: false, error: "Transcripts not available" });
      }
      break;

    case "get-status":
      sendResponse({
        success: true,
        data: extension?.getStatus() || {
          isInitialized: false,
          isRecording: false,
          processorActive: false,
          transcriptCount: 0,
          audioQuality: "Unknown",
        },
      });
      break;

    default:
      sendResponse({ success: false, error: "Unknown action" });
  }
});

// Handle navigation in SPAs
let currentUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    logger.info("Navigation detected, reinitializing extension");

    if (extension) {
      extension.destroy();
      extension = null;
    }

    // Small delay to let the new page load
    setTimeout(() => {
      extension = new MeetingTranslatorExtension();
    }, 1000);
  }
});

urlObserver.observe(document, { subtree: true, childList: true });

// Start initialization
initializeExtension();

// Export for testing purposes
export { MeetingTranslatorExtension };
