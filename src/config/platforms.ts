import { PlatformConfig } from "../types/platforms";

export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  "meet.google.com": {
    name: "Google Meet",
    videoSelectors: [
      "video[autoplay]",
      "video[data-meeting-video]",
      'video[src*="blob:"]',
      "video[srcObject]",
      "[data-allocation-index] video",
      "[data-self-view-wrapper] video",
    ],
    containerSelectors: [
      "[data-allocation-index]",
      "[data-self-view-wrapper]",
      "[data-participant-id]",
      "[jscontroller][data-participant-id]",
    ],
    audioSelectors: ["audio[autoplay]", 'audio[src*="blob:"]'],
    indicators: {
      inMeeting: '[data-meeting-state="in-meeting"], [data-call-started]',
      participants: "[data-participant-id]",
      muteButton:
        '[data-is-muted], [aria-label*="microphone"], [aria-label*="mute"]',
      cameraButton:
        '[data-is-camera-on], [aria-label*="camera"], [aria-label*="video"]',
    },
    meetingStates: {
      waiting: '[data-meeting-state="waiting-room"]',
      inCall: '[data-meeting-state="in-meeting"]',
      ended: '[data-meeting-state="ended"]',
    },
  },
  "zoom.us": {
    name: "Zoom",
    videoSelectors: [
      'video[id*="video"]',
      "video.video-element",
      'video[class*="video"]',
      '[id*="video-container"] video',
      ".video-preview video",
      ".video-player video",
    ],
    containerSelectors: [
      '[id*="video-container"]',
      ".video-preview",
      ".video-player",
      '[class*="participant"]',
      ".video-avatar-container",
    ],
    audioSelectors: ['audio[id*="audio"]', "audio.audio-element"],
    indicators: {
      inMeeting: '.in-meeting, [aria-label*="in meeting"]',
      participants: '[class*="participant"], .video-avatar-container',
      muteButton: '[aria-label*="mute"], [aria-label*="unmute"], .audio-btn',
      cameraButton: '[aria-label*="camera"], [aria-label*="video"], .video-btn',
    },
    meetingStates: {
      waiting: '.waiting-room, [aria-label*="waiting"]',
      inCall: '.in-meeting, [aria-label*="in meeting"]',
      ended: '.meeting-ended, [aria-label*="ended"]',
    },
  },
  "teams.microsoft.com": {
    name: "Microsoft Teams",
    videoSelectors: [
      'video[id*="video"]',
      'video[class*="video"]',
      '[data-tid*="video"] video',
      ".video-stream video",
      ".calling-video-stream video",
    ],
    containerSelectors: [
      '[data-tid*="video"]',
      ".video-stream",
      ".calling-video-stream",
      '[data-tid*="participant"]',
      ".participant-video-container",
    ],
    audioSelectors: ['audio[id*="audio"]', '[data-tid*="audio"] audio'],
    indicators: {
      inMeeting: '[data-tid*="calling"], .calling-stage',
      participants: '[data-tid*="participant"], .participant-video-container',
      muteButton: '[data-tid*="microphone"], [aria-label*="mute"]',
      cameraButton: '[data-tid*="camera"], [aria-label*="camera"]',
    },
    meetingStates: {
      waiting: '[data-tid*="lobby"], .lobby-screen',
      inCall: '[data-tid*="calling"], .calling-stage',
      ended: '[data-tid*="call-ended"], .call-ended',
    },
  },
  generic: {
    name: "Generic Video Platform",
    videoSelectors: [
      "video",
      "video[autoplay]",
      "video[src]",
      "video[srcObject]",
    ],
    containerSelectors: [
      ".video-container",
      ".video-player",
      ".media-container",
      'div[class*="video"]',
    ],
    audioSelectors: ["audio", "audio[autoplay]", "audio[src]"],
    indicators: {
      inMeeting: ".meeting, .call, .conference",
      participants: ".participant, .user, .attendee",
    },
    meetingStates: {
      waiting: ".waiting, .lobby",
      inCall: ".meeting, .call, .conference",
      ended: ".ended, .finished",
    },
  },
};

export const PLATFORM_DOMAINS = {
  "meet.google.com": "google-meet",
  "zoom.us": "zoom",
  "teams.microsoft.com": "microsoft-teams",
} as const;

export const VIDEO_QUALITY_THRESHOLDS = {
  MIN_WIDTH: 160,
  MIN_HEIGHT: 120,
  PREFERRED_WIDTH: 640,
  PREFERRED_HEIGHT: 480,
  MIN_DURATION: 1, // seconds
  MIN_VOLUME: 0.01,
};

export const DETECTION_SETTINGS = {
  MUTATION_OBSERVER_THROTTLE: 100, // ms
  VIDEO_CHECK_INTERVAL: 1000, // ms
  RETRY_INTERVAL: 2000, // ms
  MAX_RETRY_ATTEMPTS: 5,
  CONFIDENCE_THRESHOLD: 0.7,
};
