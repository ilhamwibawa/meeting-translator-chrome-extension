export interface PlatformConfig {
  name: string;
  videoSelectors: string[];
  containerSelectors: string[];
  indicators: {
    inMeeting?: string;
    participants?: string;
    muteButton?: string;
    cameraButton?: string;
  };
  audioSelectors?: string[];
  meetingStates: {
    waiting?: string;
    inCall?: string;
    ended?: string;
  };
}

export interface DetectedVideo {
  element: HTMLVideoElement;
  selector: string;
  platform: string;
  hasAudio: boolean;
  metadata: VideoMetadata;
  isMainVideo: boolean;
  participantId?: string;
}

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  volume: number;
  isPlaying: boolean;
  isVisible: boolean;
  hasAudioTrack: boolean;
  srcObject: MediaStream | null;
}

export interface PlatformDetectionResult {
  platform: string;
  config: PlatformConfig;
  confidence: number;
  detectedElements: HTMLElement[];
}

export interface MeetingState {
  isInMeeting: boolean;
  participantCount: number;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  meetingId?: string;
  roomName?: string;
}

export type SupportedPlatform =
  | "google-meet"
  | "zoom"
  | "microsoft-teams"
  | "generic";
