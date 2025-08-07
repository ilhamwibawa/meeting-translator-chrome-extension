/**
 * Meeting Translator Extension - Popup Script
 * Handles the popup interface for controlling the extension
 */

// DOM Elements
const elements = {
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  platformInfo: document.getElementById("platformInfo"),
  platformName: document.getElementById("platformName"),
  toggleRecording: document.getElementById("toggleRecording"),
  recordIcon: document.getElementById("recordIcon"),
  recordingText: document.getElementById("recordingText"),
  showUI: document.getElementById("showUI"),
  openSettings: document.getElementById("openSettings"),
  statsSection: document.getElementById("statsSection"),
  sessionTime: document.getElementById("sessionTime"),
  transcriptCount: document.getElementById("transcriptCount"),
  audioQuality: document.getElementById("audioQuality"),
  exportTranscripts: document.getElementById("exportTranscripts"),
  clearTranscripts: document.getElementById("clearTranscripts"),
  copyLastTranscript: document.getElementById("copyLastTranscript"),
  showHelp: document.getElementById("showHelp"),
};

// State management
const extensionState = {
  isRecording: false,
  isInitialized: false,
  platform: null,
  sessionStartTime: null,
  transcriptCount: 0,
  audioQuality: "Unknown",
};

// Initialize popup
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🎨 Meeting Translator Popup - Initializing...");

  try {
    await initializePopup();
    setupEventListeners();
    startStatusUpdates();
    console.log("✅ Popup initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize popup:", error);
    showError("Failed to initialize popup");
  }
});

/**
 * Initialize popup state and UI
 */
async function initializePopup() {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) {
    throw new Error("No active tab found");
  }

  // Check if we're on a supported platform
  const platform = detectPlatform(tab.url);
  if (platform) {
    extensionState.platform = platform;
    updatePlatformInfo(platform);
    markPlatformAsActive(platform);
  }

  // Get extension status from content script
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "get-status",
    });
    if (response && response.success) {
      updateExtensionState(response.data);
    } else {
      updateStatus("error", "Extension not loaded on this page");
    }
  } catch (error) {
    console.warn("Content script not available:", error);
    updateStatus("inactive", "Extension not available on this page");
  }
}

/**
 * Setup event listeners for UI interactions
 */
function setupEventListeners() {
  // Toggle recording
  elements.toggleRecording.addEventListener("click", handleToggleRecording);

  // Show UI
  elements.showUI.addEventListener("click", handleShowUI);

  // Open settings
  elements.openSettings.addEventListener("click", handleOpenSettings);

  // Export transcripts
  elements.exportTranscripts.addEventListener("click", handleExportTranscripts);

  // Clear transcripts
  elements.clearTranscripts.addEventListener("click", handleClearTranscripts);

  // Copy last transcript
  elements.copyLastTranscript.addEventListener(
    "click",
    handleCopyLastTranscript
  );

  // Show help
  elements.showHelp.addEventListener("click", handleShowHelp);

  // Platform items
  document.querySelectorAll(".platform-item").forEach((item) => {
    item.addEventListener("click", () =>
      handlePlatformClick(item.dataset.platform)
    );
  });
}

/**
 * Start periodic status updates
 */
function startStatusUpdates() {
  // Update status every 2 seconds
  setInterval(updateExtensionStatus, 2000);

  // Update session timer every second
  setInterval(updateSessionTimer, 1000);
}

/**
 * Handle toggle recording button click
 */
async function handleToggleRecording() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) {
    showError("No active tab found");
    return;
  }

  try {
    const action = extensionState.isRecording ? "stop" : "start";
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "toggle-extension",
    });

    if (response && response.success) {
      // State will be updated by the status polling
      console.log(`Recording ${action} request sent`);
    } else {
      showError(response?.error || "Failed to toggle recording");
    }
  } catch (error) {
    console.error("Failed to toggle recording:", error);
    showError("Extension not available on this page");
  }
}

/**
 * Handle show UI button click
 */
async function handleShowUI() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    await chrome.tabs.sendMessage(tab.id, { action: "show-ui" });
    window.close(); // Close popup after showing UI
  } catch (error) {
    console.error("Failed to show UI:", error);
    showError("UI not available on this page");
  }
}

/**
 * Handle open settings button click
 */
async function handleOpenSettings() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    await chrome.tabs.sendMessage(tab.id, { action: "show-settings" });
    window.close();
  } catch (error) {
    console.error("Failed to open settings:", error);
    showError("Settings not available on this page");
  }
}

/**
 * Handle export transcripts button click
 */
async function handleExportTranscripts() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "export-transcripts",
    });
    if (response && response.success) {
      showSuccess("Transcripts exported successfully");
    } else {
      showError("No transcripts to export");
    }
  } catch (error) {
    console.error("Failed to export transcripts:", error);
    showError("Export failed");
  }
}

/**
 * Handle clear transcripts button click
 */
async function handleClearTranscripts() {
  if (!confirm("Are you sure you want to clear all transcripts?")) {
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "clear-transcripts",
    });
    if (response && response.success) {
      extensionState.transcriptCount = 0;
      updateTranscriptCount(0);
      showSuccess("Transcripts cleared");
    }
  } catch (error) {
    console.error("Failed to clear transcripts:", error);
    showError("Clear failed");
  }
}

/**
 * Handle copy last transcript button click
 */
async function handleCopyLastTranscript() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "get-last-transcript",
    });
    if (response && response.success && response.data) {
      await navigator.clipboard.writeText(response.data);
      showSuccess("Transcript copied to clipboard");
    } else {
      showError("No transcript to copy");
    }
  } catch (error) {
    console.error("Failed to copy transcript:", error);
    showError("Copy failed");
  }
}

/**
 * Handle show help button click
 */
function handleShowHelp() {
  chrome.tabs.create({
    url: chrome.runtime.getURL("help.html"),
  });
}

/**
 * Handle platform item click
 */
function handlePlatformClick(platform) {
  const platformUrls = {
    "google-meet": "https://meet.google.com",
    zoom: "https://zoom.us",
    teams: "https://teams.microsoft.com",
  };

  if (platformUrls[platform]) {
    chrome.tabs.create({ url: platformUrls[platform] });
  }
}

/**
 * Update extension status from content script
 */
async function updateExtensionStatus() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) return;

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "get-status",
    });
    if (response && response.success) {
      updateExtensionState(response.data);
    }
  } catch (error) {
    // Content script not available - this is normal for non-meeting pages
    if (extensionState.isInitialized) {
      updateStatus("inactive", "Not on a meeting page");
      extensionState.isInitialized = false;
    }
  }
}

/**
 * Update extension state from response data
 */
function updateExtensionState(data) {
  if (!data) return;

  const wasRecording = extensionState.isRecording;
  extensionState.isInitialized = data.isInitialized || false;
  extensionState.isRecording = data.isRecording || false;

  // Update UI based on state
  if (extensionState.isInitialized) {
    if (extensionState.isRecording) {
      updateStatus("recording", "Recording active");

      // Start session timer if just started recording
      if (!wasRecording) {
        extensionState.sessionStartTime = Date.now();
      }
    } else {
      updateStatus("ready", "Ready to record");
    }

    elements.toggleRecording.disabled = false;
    elements.statsSection.style.display = extensionState.isRecording
      ? "grid"
      : "none";

    // Update transcript count if available
    if (data.transcriptCount !== undefined) {
      updateTranscriptCount(data.transcriptCount);
    }

    // Update audio quality if available
    if (data.audioQuality) {
      updateAudioQuality(data.audioQuality);
    }
  } else {
    updateStatus("initializing", "Initializing...");
    elements.toggleRecording.disabled = true;
    elements.statsSection.style.display = "none";
  }

  updateRecordingButton();
  updateActionButtons();
}

/**
 * Update status indicator and text
 */
function updateStatus(status, text) {
  elements.statusDot.className = `status-dot ${status}`;
  elements.statusText.textContent = text;
}

/**
 * Update platform information
 */
function updatePlatformInfo(platform) {
  const platformNames = {
    "google-meet": "Google Meet",
    zoom: "Zoom",
    teams: "Microsoft Teams",
  };

  elements.platformName.textContent = platformNames[platform] || platform;
  elements.platformInfo.style.display = "flex";
}

/**
 * Mark platform as active in the grid
 */
function markPlatformAsActive(platform) {
  document.querySelectorAll(".platform-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.platform === platform);
  });
}

/**
 * Update recording button state
 */
function updateRecordingButton() {
  if (extensionState.isRecording) {
    elements.toggleRecording.classList.add("recording");
    elements.recordingText.textContent = "Stop Recording";
    elements.recordIcon.innerHTML = `
      <rect x="6" y="6" width="12" height="12" fill="currentColor"/>
    `;
  } else {
    elements.toggleRecording.classList.remove("recording");
    elements.recordingText.textContent = "Start Recording";
    elements.recordIcon.innerHTML = `
      <circle cx="12" cy="12" r="8" fill="currentColor"/>
    `;
  }
}

/**
 * Update action buttons state
 */
function updateActionButtons() {
  const hasTranscripts = extensionState.transcriptCount > 0;
  elements.exportTranscripts.disabled = !hasTranscripts;
  elements.clearTranscripts.disabled = !hasTranscripts;
  elements.copyLastTranscript.disabled = !hasTranscripts;
}

/**
 * Update session timer
 */
function updateSessionTimer() {
  if (extensionState.sessionStartTime && extensionState.isRecording) {
    const elapsed = Date.now() - extensionState.sessionStartTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    elements.sessionTime.textContent = `${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  } else {
    elements.sessionTime.textContent = "00:00";
  }
}

/**
 * Update transcript count display
 */
function updateTranscriptCount(count) {
  extensionState.transcriptCount = count;
  elements.transcriptCount.textContent = count.toString();
}

/**
 * Update audio quality display
 */
function updateAudioQuality(quality) {
  extensionState.audioQuality = quality;
  elements.audioQuality.textContent = quality;
}

/**
 * Detect platform from URL
 */
function detectPlatform(url) {
  if (!url) return null;

  if (url.includes("meet.google.com")) return "google-meet";
  if (url.includes("zoom.us")) return "zoom";
  if (url.includes("teams.microsoft.com")) return "teams";

  return null;
}

/**
 * Show success message
 */
function showSuccess(message) {
  // Could implement a toast notification system
  console.log("✅ Success:", message);
}

/**
 * Show error message
 */
function showError(message) {
  // Could implement a toast notification system
  console.error("❌ Error:", message);

  // For now, just update status
  updateStatus("error", message);
}
