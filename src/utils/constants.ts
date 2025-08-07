// Extension Constants
export const EXTENSION_ID = "meeting-video-to-text";
export const EXTENSION_NAME = "Meeting Video to Text";
export const VERSION = "1.0.0";

// DOM Element Constants
export const DOM_ELEMENTS = {
  // Extension UI Elements
  CONTROL_PANEL_ID: "meeting-translator-control-panel",
  TRANSCRIPT_OVERLAY_ID: "meeting-translator-transcript-overlay",
  SETTINGS_PANEL_ID: "meeting-translator-settings-panel",
  NOTIFICATION_CONTAINER_ID: "meeting-translator-notifications",

  // Video and Audio Elements
  VIDEO_SELECTOR: "video",
  AUDIO_SELECTOR: "audio",
  MEDIA_SELECTOR: "video, audio",

  // Platform-specific selectors
  MEET_VIDEO_SELECTOR: "video[autoplay]",
  ZOOM_VIDEO_SELECTOR: "video",
  TEAMS_VIDEO_SELECTOR: 'video[class*="video"]',

  // Common video containers
  VIDEO_CONTAINER_SELECTORS: [
    "[data-video-container]",
    ".video-container",
    ".video-wrapper",
    ".media-container",
  ],
} as const;

// CSS Class Names
export const CSS_CLASSES = {
  CONTAINER: "mvtt-container",
  PANEL: "mvtt-panel",
  OVERLAY: "mvtt-overlay",
  BUTTON: "mvtt-button",
  TEXT: "mvtt-text",
  TRANSCRIPT: "mvtt-transcript",
  TRANSCRIPT_LINE: "mvtt-transcript-line",
  TRANSCRIPT_INTERIM: "mvtt-transcript-interim",
  TRANSCRIPT_FINAL: "mvtt-transcript-final",
  STATUS_INDICATOR: "mvtt-status",
  CONTROL_GROUP: "mvtt-control-group",
  DRAGGABLE: "mvtt-draggable",
  RESIZABLE: "mvtt-resizable",
  MINIMIZED: "mvtt-minimized",
  MAXIMIZED: "mvtt-maximized",
  HIDDEN: "mvtt-hidden",
  VISIBLE: "mvtt-visible",
  ACTIVE: "mvtt-active",
  INACTIVE: "mvtt-inactive",
  ERROR: "mvtt-error",
  SUCCESS: "mvtt-success",
  WARNING: "mvtt-warning",
  INFO: "mvtt-info",
};

// Z-Index Values
export const Z_INDEX = {
  BASE: 10000,
  OVERLAY: 10001,
  CONTROL_PANEL: 10002,
  SETTINGS_PANEL: 10003,
  MODAL: 10004,
  TOOLTIP: 10005,
};

// Default UI Positions
export const DEFAULT_POSITIONS = {
  CONTROL_PANEL: { x: 20, y: 20, width: 200, height: 150 },
  TRANSCRIPT_OVERLAY: { x: 20, y: 200, width: 400, height: 300 },
  STATUS_INDICATOR: { x: 20, y: 100, width: 100, height: 30 },
};

// Animation Durations (ms)
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  FADE_IN: 200,
  FADE_OUT: 150,
  SLIDE_IN: 250,
  SLIDE_OUT: 200,
};

// Storage Keys
export const STORAGE_KEYS = {
  SETTINGS: "mvtt-settings",
  TRANSCRIPT_HISTORY: "mvtt-transcript-history",
  USER_PREFERENCES: "mvtt-user-preferences",
  PLATFORM_CONFIG: "mvtt-platform-config",
  UI_STATE: "mvtt-ui-state",
  AUDIO_SETTINGS: "mvtt-audio-settings",
  SPEECH_SETTINGS: "mvtt-speech-settings",
};

// Event Names
export const EVENTS = {
  VIDEO_DETECTED: "mvtt:video-detected",
  AUDIO_EXTRACTED: "mvtt:audio-extracted",
  SPEECH_RESULT: "mvtt:speech-result",
  TRANSCRIPTION_START: "mvtt:transcription-start",
  TRANSCRIPTION_STOP: "mvtt:transcription-stop",
  ERROR_OCCURRED: "mvtt:error",
  SETTINGS_CHANGED: "mvtt:settings-changed",
  UI_STATE_CHANGED: "mvtt:ui-state-changed",
  PLATFORM_DETECTED: "mvtt:platform-detected",
  MEETING_STATE_CHANGED: "mvtt:meeting-state-changed",
};

// Audio Processing Constants
export const AUDIO_CONFIG = {
  SAMPLE_RATE: 16000,
  CHANNEL_COUNT: 1,
  BIT_DEPTH: 16,
  CHUNK_SIZE: 4096,
  BUFFER_SIZE: 8192,
  MIN_FREQUENCY: 80, // Hz
  MAX_FREQUENCY: 8000, // Hz
  NOISE_THRESHOLD: 0.01,
  VOICE_THRESHOLD: 0.05,
};

// Speech Recognition Constants
export const SPEECH_CONFIG = {
  LANGUAGE: "en-US",
  MAX_ALTERNATIVES: 3,
  CONFIDENCE_THRESHOLD: 0.6,
  INTERIM_RESULTS: true,
  CONTINUOUS: true,
  MAX_DURATION: 60000, // 60 seconds
  RESTART_INTERVAL: 30000, // 30 seconds
};

// Performance Limits
export const PERFORMANCE_LIMITS = {
  MAX_MEMORY_MB: 50,
  MAX_CPU_PERCENT: 5,
  MAX_LATENCY_MS: 100,
  MAX_TRANSCRIPT_LINES: 1000,
  MAX_HISTORY_ENTRIES: 100,
  CLEANUP_INTERVAL: 30000, // 30 seconds
};

// Error Codes
export const ERROR_CODES = {
  VIDEO_NOT_FOUND: "VIDEO_NOT_FOUND",
  AUDIO_EXTRACTION_FAILED: "AUDIO_EXTRACTION_FAILED",
  SPEECH_RECOGNITION_FAILED: "SPEECH_RECOGNITION_FAILED",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  PLATFORM_NOT_SUPPORTED: "PLATFORM_NOT_SUPPORTED",
  NETWORK_ERROR: "NETWORK_ERROR",
  INITIALIZATION_FAILED: "INITIALIZATION_FAILED",
  AUDIO_CONTEXT_ERROR: "AUDIO_CONTEXT_ERROR",
  MEDIA_STREAM_ERROR: "MEDIA_STREAM_ERROR",
  DOM_ERROR: "DOM_ERROR",
};

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
  TOGGLE_TRANSCRIPTION: "Alt+T",
  TOGGLE_OVERLAY: "Alt+O",
  CLEAR_TRANSCRIPT: "Alt+C",
  EXPORT_TRANSCRIPT: "Alt+E",
  TOGGLE_CONTROL_PANEL: "Alt+P",
  TOGGLE_SETTINGS: "Alt+S",
};

// Platform-specific selectors
export const PLATFORM_SELECTORS = {
  GOOGLE_MEET: {
    VIDEO: "video[autoplay], video[data-meeting-video]",
    PARTICIPANT: "[data-participant-id]",
    MUTE_BUTTON: "[data-is-muted]",
    MEETING_CONTAINER: "[data-allocation-index]",
  },
  ZOOM: {
    VIDEO: 'video[id*="video"], video.video-element',
    PARTICIPANT: '[class*="participant"]',
    MUTE_BUTTON: '[aria-label*="mute"]',
    MEETING_CONTAINER: '[id*="video-container"]',
  },
  TEAMS: {
    VIDEO: 'video[id*="video"], [data-tid*="video"] video',
    PARTICIPANT: '[data-tid*="participant"]',
    MUTE_BUTTON: '[data-tid*="microphone"]',
    MEETING_CONTAINER: '[data-tid*="video"]',
  },
};
