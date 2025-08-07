export interface UIPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface UITheme {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  accentColor: string;
  opacity: number;
  fontSize: number;
  fontFamily: string;
}

export interface ControlPanelState {
  isVisible: boolean;
  isMinimized: boolean;
  position: UIPosition;
  isDragging: boolean;
  isPinned: boolean;
}

export interface TranscriptOverlayState {
  isVisible: boolean;
  position: UIPosition;
  displayMode: "overlay" | "sidebar" | "popup";
  autoScroll: boolean;
  showTimestamps: boolean;
  showConfidence: boolean;
  maxLines: number;
}

export interface UISettings {
  theme: UITheme;
  controlPanel: ControlPanelState;
  transcriptOverlay: TranscriptOverlayState;
  shortcuts: KeyboardShortcuts;
  animations: AnimationSettings;
}

export interface KeyboardShortcuts {
  toggleTranscription: string;
  toggleOverlay: string;
  clearTranscript: string;
  exportTranscript: string;
  toggleControlPanel: string;
}

export interface AnimationSettings {
  enableAnimations: boolean;
  transitionDuration: number;
  fadeInDuration: number;
  slideInDuration: number;
}

export interface TranscriptDisplayItem {
  id: string;
  text: string;
  timestamp: number;
  confidence: number;
  isFinal: boolean;
  speaker?: string;
  language?: string;
  isHighlighted: boolean;
}

export interface UIComponentProps {
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
  onClick?: (event: MouseEvent) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
}

export interface StatusIndicatorState {
  isRecording: boolean;
  isProcessing: boolean;
  hasError: boolean;
  errorMessage?: string;
  connectionStatus: "connected" | "disconnected" | "connecting";
  audioLevel: number;
}

export interface ExportOptions {
  format: "txt" | "json" | "csv" | "srt";
  includeTimestamps: boolean;
  includeConfidence: boolean;
  includeSpeaker: boolean;
  filename?: string;
}

export type DisplayMode = "overlay" | "sidebar" | "popup" | "fullscreen";
export type UIComponentType =
  | "control-panel"
  | "transcript-overlay"
  | "status-indicator"
  | "settings-panel";
