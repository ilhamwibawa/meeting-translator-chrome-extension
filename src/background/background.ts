/// <reference types="chrome"/>
import { createComponentLogger } from "../utils/logger";

const logger = createComponentLogger("BackgroundScript");

class BackgroundService {
  constructor() {
    this.initialize();
  }

  private initialize(): void {
    logger.info("Initializing background service");

    // Set up extension event listeners
    this.setupRuntimeListeners();
    this.setupTabListeners();
    this.setupActionListeners();

    logger.info("Background service initialized");
  }

  private setupRuntimeListeners(): void {
    // Handle extension installation/startup
    chrome.runtime.onInstalled.addListener((details) => {
      logger.info("Extension installed/updated:", { reason: details.reason });

      if (details.reason === "install") {
        this.handleFirstInstall();
      } else if (details.reason === "update") {
        this.handleUpdate(details.previousVersion);
      }
    });

    // Handle extension startup
    chrome.runtime.onStartup.addListener(() => {
      logger.info("Extension started");
    });

    // Handle messages from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  private setupTabListeners(): void {
    // Monitor tab updates for supported meeting platforms
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === "complete" && tab.url) {
        this.handleTabUpdate(tabId, tab);
      }
    });

    // Handle tab removal
    chrome.tabs.onRemoved.addListener((tabId) => {
      logger.debug("Tab removed:", { tabId });
    });
  }

  private setupActionListeners(): void {
    // Handle extension icon click
    chrome.action.onClicked.addListener((tab) => {
      logger.info("Extension icon clicked:", { tabId: tab.id });
      this.toggleExtension(tab);
    });
  }

  private handleFirstInstall(): void {
    logger.info("Handling first installation");

    // Set default settings
    chrome.storage.sync.set({
      "mvtt-settings": {
        autoStart: true,
        showOverlay: true,
        language: "en-US",
        theme: "auto",
      },
    });

    // Show welcome/setup page
    chrome.tabs.create({
      url: chrome.runtime.getURL("welcome.html"),
    });
  }

  private handleUpdate(previousVersion?: string): void {
    logger.info("Handling extension update:", { previousVersion });

    // Handle version-specific updates
    if (previousVersion) {
      // Migration logic can be added here
    }
  }

  private async handleTabUpdate(
    tabId: number,
    tab: chrome.tabs.Tab
  ): Promise<void> {
    if (!tab.url) return;

    const supportedDomains = [
      "meet.google.com",
      "zoom.us",
      "teams.microsoft.com",
    ];

    const isSupported = supportedDomains.some((domain) =>
      tab.url!.includes(domain)
    );

    if (isSupported) {
      logger.debug("Supported meeting platform detected:", {
        tabId,
        url: tab.url,
      });

      try {
        // Update extension icon to show it's active
        await chrome.action.setIcon({
          tabId,
          path: {
            "16": "icons/icon16.png",
            "48": "icons/icon48.png",
            "128": "icons/icon128.png",
          },
        });

        await chrome.action.setBadgeText({
          tabId,
          text: "ON",
        });

        await chrome.action.setBadgeBackgroundColor({
          tabId,
          color: "#28a745",
        });
      } catch (error) {
        logger.warn(
          "Failed to update extension icon",
          undefined,
          error as Error
        );
      }
    }
  }

  private async handleMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    logger.debug("Received message:", {
      type: message.type,
      sender: sender.tab?.id,
    });

    try {
      switch (message.type) {
        case "GET_SETTINGS": {
          const settings = await this.getSettings();
          sendResponse({ success: true, data: settings });
          break;
        }

        case "SAVE_SETTINGS": {
          await this.saveSettings(message.data);
          sendResponse({ success: true });
          break;
        }

        case "REQUEST_PERMISSIONS": {
          const granted = await this.requestPermissions(message.permissions);
          sendResponse({ success: true, granted });
          break;
        }

        case "GET_TAB_CAPTURE_STREAM": {
          const stream = await this.getTabCaptureStream(sender.tab?.id);
          sendResponse({ success: true, streamId: stream });
          break;
        }

        case "LOG_ERROR": {
          logger.error(
            "Error from content script",
            new Error(message.error),
            message.data
          );
          sendResponse({ success: true });
          break;
        }

        default:
          logger.warn("Unknown message type:", { type: message.type });
          sendResponse({ success: false, error: "Unknown message type" });
      }
    } catch (error) {
      logger.error("Error handling message", error as Error, {
        messageType: message.type,
      });
      sendResponse({ success: false, error: (error as Error).message });
    }
  }

  private async getSettings(): Promise<any> {
    const result = await chrome.storage.sync.get("mvtt-settings");
    return result["mvtt-settings"] || {};
  }

  private async saveSettings(settings: any): Promise<void> {
    await chrome.storage.sync.set({ "mvtt-settings": settings });
    logger.info("Settings saved");
  }

  private async requestPermissions(permissions: string[]): Promise<boolean> {
    try {
      const granted = await chrome.permissions.request({
        permissions,
      });
      logger.info("Permission request result:", { permissions, granted });
      return granted;
    } catch (error) {
      logger.error("Failed to request permissions", error as Error);
      return false;
    }
  }

  private async getTabCaptureStream(tabId?: number): Promise<string | null> {
    if (!tabId) {
      logger.warn("No tab ID provided for capture stream");
      return null;
    }

    try {
      const streamId = await new Promise<string>((resolve, reject) => {
        chrome.tabCapture.capture(
          {
            audio: true,
            video: false,
          },
          (stream) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (stream) {
              resolve(stream.id);
            } else {
              reject(new Error("No stream returned"));
            }
          }
        );
      });

      logger.info("Tab capture stream created:", { tabId, streamId });
      return streamId;
    } catch (error) {
      logger.error("Failed to create tab capture stream", error as Error);
      return null;
    }
  }

  private async toggleExtension(tab: chrome.tabs.Tab): Promise<void> {
    if (!tab.id) return;

    try {
      // Send message to content script to toggle
      await chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_EXTENSION",
      });
    } catch (error) {
      logger.warn("Failed to toggle extension", undefined, error as Error);

      // Try to inject content script if not already present
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["dist/content/content.js"],
        });

        logger.info("Content script injected");
      } catch (injectError) {
        logger.error("Failed to inject content script", injectError as Error);
      }
    }
  }
}

// Initialize background service
new BackgroundService();
