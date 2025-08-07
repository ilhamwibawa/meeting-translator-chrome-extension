import { createComponentLogger } from "../utils/logger";
import { DOM_ELEMENTS, CSS_CLASSES } from "../utils/constants";

const logger = createComponentLogger("SettingsPanel");

export interface ExtensionSettings {
  // Audio Settings
  audioQuality: "low" | "medium" | "high";
  audioSource: "element" | "stream" | "tab";
  noiseReduction: boolean;
  autoGainControl: boolean;

  // Speech Recognition Settings
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  confidenceThreshold: number;

  // UI Settings
  controlPanelPosition:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left";
  transcriptPosition: "top" | "bottom" | "left" | "right" | "center";
  theme: "light" | "dark" | "auto";
  fontSize: "small" | "medium" | "large";

  // Transcript Settings
  showTimestamps: boolean;
  showConfidence: boolean;
  showSpeakerId: boolean;
  maxTranscriptEntries: number;
  autoScroll: boolean;
  autoExport: boolean;

  // Platform Settings
  enabledPlatforms: string[];
  autoDetection: boolean;

  // Advanced Settings
  debugMode: boolean;
  performanceMode: boolean;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  // Audio Settings
  audioQuality: "medium",
  audioSource: "element",
  noiseReduction: true,
  autoGainControl: true,

  // Speech Recognition Settings
  language: "en-US",
  continuous: true,
  interimResults: true,
  maxAlternatives: 1,
  confidenceThreshold: 0.5,

  // UI Settings
  controlPanelPosition: "top-right",
  transcriptPosition: "bottom",
  theme: "auto",
  fontSize: "medium",

  // Transcript Settings
  showTimestamps: true,
  showConfidence: false,
  showSpeakerId: false,
  maxTranscriptEntries: 50,
  autoScroll: true,
  autoExport: false,

  // Platform Settings
  enabledPlatforms: ["meet", "zoom", "teams", "generic"],
  autoDetection: true,

  // Advanced Settings
  debugMode: false,
  performanceMode: false,
};

export class SettingsPanel {
  private element: HTMLElement | null = null;
  private isVisible = false;
  private settings: ExtensionSettings = { ...DEFAULT_SETTINGS };

  private eventListeners: {
    onSettingsChange?: (settings: ExtensionSettings) => void;
    onClose?: () => void;
    onReset?: () => void;
    onImport?: (settings: ExtensionSettings) => void;
    onExport?: (settings: ExtensionSettings) => void;
  } = {};

  constructor(initialSettings?: Partial<ExtensionSettings>) {
    if (initialSettings) {
      this.settings = { ...this.settings, ...initialSettings };
    }
    this.initialize();
  }

  private initialize(): void {
    logger.info("Initializing SettingsPanel");
    this.createSettingsElement();
    this.attachEventListeners();
    this.loadSettings();
    this.injectIntoPage();
    logger.info("SettingsPanel initialized successfully");
  }

  private createSettingsElement(): void {
    this.element = document.createElement("div");
    this.element.id = DOM_ELEMENTS.SETTINGS_PANEL_ID;
    this.element.className = `${CSS_CLASSES.CONTAINER} settings-modal`;
    this.element.style.display = "none";

    this.element.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">
            <span class="title-icon">⚙️</span>
            Extension Settings
          </h2>
          <button class="modal-close-btn">×</button>
        </div>

        <div class="modal-body">
          <div class="settings-container">
            <!-- Audio Settings Tab -->
            <div class="settings-section" data-section="audio">
              <h3 class="section-title">🎵 Audio Settings</h3>

              <div class="setting-group">
                <label class="setting-label">Audio Quality</label>
                <select class="setting-input" data-setting="audioQuality">
                  <option value="low">Low (8kHz)</option>
                  <option value="medium">Medium (16kHz)</option>
                  <option value="high">High (44kHz)</option>
                </select>
              </div>

              <div class="setting-group">
                <label class="setting-label">Audio Source</label>
                <select class="setting-input" data-setting="audioSource">
                  <option value="element">Video Element</option>
                  <option value="stream">Media Stream</option>
                  <option value="tab">Tab Capture</option>
                </select>
              </div>

              <div class="setting-group">
                <label class="setting-label">
                  <input type="checkbox" class="setting-checkbox" data-setting="noiseReduction">
                  <span class="checkbox-label">Noise Reduction</span>
                </label>
              </div>

              <div class="setting-group">
                <label class="setting-label">
                  <input type="checkbox" class="setting-checkbox" data-setting="autoGainControl">
                  <span class="checkbox-label">Auto Gain Control</span>
                </label>
              </div>
            </div>

            <!-- Speech Recognition Settings -->
            <div class="settings-section" data-section="speech">
              <h3 class="section-title">🎤 Speech Recognition</h3>

              <div class="setting-group">
                <label class="setting-label">Language</label>
                <select class="setting-input" data-setting="language">
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="es-ES">Spanish</option>
                  <option value="fr-FR">French</option>
                  <option value="de-DE">German</option>
                  <option value="it-IT">Italian</option>
                  <option value="pt-BR">Portuguese</option>
                  <option value="zh-CN">Chinese (Simplified)</option>
                  <option value="ja-JP">Japanese</option>
                  <option value="ko-KR">Korean</option>
                </select>
              </div>

              <div class="setting-group">
                <label class="setting-label">
                  <input type="checkbox" class="setting-checkbox" data-setting="continuous">
                  <span class="checkbox-label">Continuous Recognition</span>
                </label>
              </div>

              <div class="setting-group">
                <label class="setting-label">
                  <input type="checkbox" class="setting-checkbox" data-setting="interimResults">
                  <span class="checkbox-label">Show Interim Results</span>
                </label>
              </div>

              <div class="setting-group">
                <label class="setting-label">Confidence Threshold</label>
                <input type="range" class="setting-range" data-setting="confidenceThreshold"
                       min="0" max="1" step="0.1" value="0.5">
                <span class="range-value">50%</span>
              </div>
            </div>

            <!-- UI Settings -->
            <div class="settings-section" data-section="ui">
              <h3 class="section-title">🎨 User Interface</h3>

              <div class="setting-group">
                <label class="setting-label">Control Panel Position</label>
                <select class="setting-input" data-setting="controlPanelPosition">
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </div>

              <div class="setting-group">
                <label class="setting-label">Transcript Position</label>
                <select class="setting-input" data-setting="transcriptPosition">
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="center">Center</option>
                </select>
              </div>

              <div class="setting-group">
                <label class="setting-label">Theme</label>
                <select class="setting-input" data-setting="theme">
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>

              <div class="setting-group">
                <label class="setting-label">Font Size</label>
                <select class="setting-input" data-setting="fontSize">
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </div>

            <!-- Transcript Settings -->
            <div class="settings-section" data-section="transcript">
              <h3 class="section-title">📝 Transcript</h3>

              <div class="setting-group">
                <label class="setting-label">
                  <input type="checkbox" class="setting-checkbox" data-setting="showTimestamps">
                  <span class="checkbox-label">Show Timestamps</span>
                </label>
              </div>

              <div class="setting-group">
                <label class="setting-label">
                  <input type="checkbox" class="setting-checkbox" data-setting="showConfidence">
                  <span class="checkbox-label">Show Confidence Scores</span>
                </label>
              </div>

              <div class="setting-group">
                <label class="setting-label">
                  <input type="checkbox" class="setting-checkbox" data-setting="showSpeakerId">
                  <span class="checkbox-label">Show Speaker IDs</span>
                </label>
              </div>

              <div class="setting-group">
                <label class="setting-label">
                  <input type="checkbox" class="setting-checkbox" data-setting="autoScroll">
                  <span class="checkbox-label">Auto Scroll</span>
                </label>
              </div>

              <div class="setting-group">
                <label class="setting-label">Max Entries</label>
                <input type="number" class="setting-input" data-setting="maxTranscriptEntries"
                       min="10" max="500" value="50">
              </div>
            </div>

            <!-- Platform Settings -->
            <div class="settings-section" data-section="platforms">
              <h3 class="section-title">🌐 Platforms</h3>

              <div class="setting-group">
                <label class="setting-label">
                  <input type="checkbox" class="setting-checkbox" data-setting="autoDetection">
                  <span class="checkbox-label">Auto Detection</span>
                </label>
              </div>

              <div class="setting-group platform-toggles">
                <label class="platform-label">Enabled Platforms:</label>
                <div class="platform-checkboxes">
                  <label class="platform-checkbox">
                    <input type="checkbox" data-platform="meet" checked>
                    <span>Google Meet</span>
                  </label>
                  <label class="platform-checkbox">
                    <input type="checkbox" data-platform="zoom" checked>
                    <span>Zoom</span>
                  </label>
                  <label class="platform-checkbox">
                    <input type="checkbox" data-platform="teams" checked>
                    <span>Microsoft Teams</span>
                  </label>
                  <label class="platform-checkbox">
                    <input type="checkbox" data-platform="generic" checked>
                    <span>Generic Videos</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Advanced Settings -->
            <div class="settings-section" data-section="advanced">
              <h3 class="section-title">🔧 Advanced</h3>

              <div class="setting-group">
                <label class="setting-label">
                  <input type="checkbox" class="setting-checkbox" data-setting="debugMode">
                  <span class="checkbox-label">Debug Mode</span>
                </label>
              </div>

              <div class="setting-group">
                <label class="setting-label">
                  <input type="checkbox" class="setting-checkbox" data-setting="performanceMode">
                  <span class="checkbox-label">Performance Mode</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="footer-left">
            <button class="settings-btn secondary-btn import-btn">Import</button>
            <button class="settings-btn secondary-btn export-btn">Export</button>
            <button class="settings-btn danger-btn reset-btn">Reset</button>
          </div>
          <div class="footer-right">
            <button class="settings-btn secondary-btn cancel-btn">Cancel</button>
            <button class="settings-btn primary-btn save-btn">Save</button>
          </div>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    if (!this.element) return;

    // Close buttons
    const closeBtn = this.element.querySelector(".modal-close-btn");
    const cancelBtn = this.element.querySelector(".cancel-btn");
    const backdrop = this.element.querySelector(".modal-backdrop");

    [closeBtn, cancelBtn, backdrop].forEach((btn) => {
      btn?.addEventListener("click", () => this.hide());
    });

    // Save button
    const saveBtn = this.element.querySelector(".save-btn");
    saveBtn?.addEventListener("click", () => this.saveSettings());

    // Reset button
    const resetBtn = this.element.querySelector(".reset-btn");
    resetBtn?.addEventListener("click", () => this.resetSettings());

    // Import/Export buttons
    const importBtn = this.element.querySelector(".import-btn");
    const exportBtn = this.element.querySelector(".export-btn");

    importBtn?.addEventListener("click", () => this.importSettings());
    exportBtn?.addEventListener("click", () => this.exportSettings());

    // Setting inputs
    this.attachSettingListeners();
    this.attachPlatformListeners();
  }

  private attachSettingListeners(): void {
    if (!this.element) return;

    // Range inputs with value display
    const rangeInputs = this.element.querySelectorAll(
      ".setting-range"
    ) as NodeListOf<HTMLInputElement>;
    rangeInputs.forEach((input) => {
      const updateValue = () => {
        const valueSpan = input.parentElement?.querySelector(
          ".range-value"
        ) as HTMLElement;
        if (valueSpan) {
          const value = parseFloat(input.value);
          valueSpan.textContent = `${Math.round(value * 100)}%`;
        }
      };

      input.addEventListener("input", updateValue);
      updateValue(); // Initial update
    });
  }

  private attachPlatformListeners(): void {
    if (!this.element) return;

    const platformCheckboxes = this.element.querySelectorAll(
      "[data-platform]"
    ) as NodeListOf<HTMLInputElement>;
    platformCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        this.updateEnabledPlatforms();
      });
    });
  }

  private updateEnabledPlatforms(): void {
    if (!this.element) return;

    const enabledPlatforms: string[] = [];
    const checkboxes = this.element.querySelectorAll(
      "[data-platform]"
    ) as NodeListOf<HTMLInputElement>;

    checkboxes.forEach((checkbox) => {
      if (checkbox.checked) {
        enabledPlatforms.push(checkbox.dataset.platform!);
      }
    });

    this.settings.enabledPlatforms = enabledPlatforms;
  }

  private loadSettings(): void {
    if (!this.element) return;

    // Load regular settings
    Object.keys(this.settings).forEach((key) => {
      if (key === "enabledPlatforms") return; // Handle separately

      const setting = key as keyof ExtensionSettings;
      const input = this.element!.querySelector(`[data-setting="${key}"]`) as
        | HTMLInputElement
        | HTMLSelectElement;

      if (input) {
        const value = this.settings[setting];

        if (input.type === "checkbox") {
          (input as HTMLInputElement).checked = Boolean(value);
        } else if (input.type === "range") {
          input.value = String(value);
          // Update range display
          const valueSpan = input.parentElement?.querySelector(
            ".range-value"
          ) as HTMLElement;
          if (valueSpan && typeof value === "number") {
            valueSpan.textContent = `${Math.round(value * 100)}%`;
          }
        } else {
          input.value = String(value);
        }
      }
    });

    // Load platform settings
    const platformCheckboxes = this.element.querySelectorAll(
      "[data-platform]"
    ) as NodeListOf<HTMLInputElement>;
    platformCheckboxes.forEach((checkbox) => {
      const platform = checkbox.dataset.platform!;
      checkbox.checked = this.settings.enabledPlatforms.includes(platform);
    });
  }

  private saveSettings(): void {
    if (!this.element) return;

    const newSettings = { ...this.settings };

    // Save regular settings
    Object.keys(newSettings).forEach((key) => {
      if (key === "enabledPlatforms") return; // Handle separately

      const setting = key as keyof ExtensionSettings;
      const input = this.element!.querySelector(`[data-setting="${key}"]`) as
        | HTMLInputElement
        | HTMLSelectElement;

      if (input) {
        if (input.type === "checkbox") {
          (newSettings as any)[setting] = (input as HTMLInputElement).checked;
        } else if (input.type === "number") {
          (newSettings as any)[setting] = parseInt(input.value);
        } else if (input.type === "range") {
          (newSettings as any)[setting] = parseFloat(input.value);
        } else {
          (newSettings as any)[setting] = input.value;
        }
      }
    });

    // Save platform settings
    this.updateEnabledPlatforms();
    newSettings.enabledPlatforms = [...this.settings.enabledPlatforms];

    this.settings = newSettings;
    this.eventListeners.onSettingsChange?.(this.settings);
    this.persistSettings();
    this.hide();

    logger.info("Settings saved:", this.settings);
  }

  private resetSettings(): void {
    if (confirm("Are you sure you want to reset all settings to default?")) {
      this.settings = { ...DEFAULT_SETTINGS };
      this.loadSettings();
      this.eventListeners.onReset?.();
      logger.info("Settings reset to default");
    }
  }

  private importSettings(): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          this.settings = { ...DEFAULT_SETTINGS, ...imported };
          this.loadSettings();
          this.eventListeners.onImport?.(this.settings);
          this.showNotification("Settings imported successfully");
          logger.info("Settings imported:", this.settings);
        } catch (error) {
          this.showNotification("Failed to import settings");
          logger.error("Import failed:", error as Error);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  private exportSettings(): void {
    const dataStr = JSON.stringify(this.settings, null, 2);
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `meeting-translator-settings-${timestamp}.json`;

    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
    this.eventListeners.onExport?.(this.settings);
    this.showNotification("Settings exported");
  }

  private persistSettings(): void {
    try {
      localStorage.setItem(
        "meeting-translator-settings",
        JSON.stringify(this.settings)
      );
    } catch (error) {
      logger.error("Failed to persist settings:", error as Error);
    }
  }

  private loadPersistedSettings(): ExtensionSettings {
    try {
      const stored = localStorage.getItem("meeting-translator-settings");
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      logger.error("Failed to load persisted settings:", error as Error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  private injectIntoPage(): void {
    if (!this.element) return;

    // Remove existing settings panel if any
    const existing = document.getElementById(DOM_ELEMENTS.SETTINGS_PANEL_ID);
    if (existing) {
      existing.remove();
    }

    document.body.appendChild(this.element);
  }

  private showNotification(message: string): void {
    const notification = document.createElement("div");
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      z-index: 1000002;
      font-family: Arial, sans-serif;
    `;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  // Public API
  public show(): void {
    if (this.element) {
      this.loadSettings(); // Refresh from current state
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

  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  public getSettings(): ExtensionSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<ExtensionSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.loadSettings();
    this.persistSettings();
  }

  public addEventListener(
    event: string,
    callback: (...args: any[]) => void
  ): void {
    switch (event) {
      case "settingsChange":
        this.eventListeners.onSettingsChange = callback;
        break;
      case "close":
        this.eventListeners.onClose = callback;
        break;
      case "reset":
        this.eventListeners.onReset = callback;
        break;
      case "import":
        this.eventListeners.onImport = callback;
        break;
      case "export":
        this.eventListeners.onExport = callback;
        break;
    }
  }

  public destroy(): void {
    logger.info("Destroying SettingsPanel");

    if (this.element) {
      this.element.remove();
      this.element = null;
    }

    this.eventListeners = {};
  }
}
