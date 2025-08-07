export interface AudioSourceInfo {
  source: AudioNode;
  stream?: MediaStream;
  tracks?: MediaStreamTrack[];
  method: "mediastream" | "element" | "capture";
  quality: AudioQuality;
  isActive: boolean;
  sourceId: string;
}

export interface AudioQuality {
  sampleRate: number;
  channelCount: number;
  bitDepth: number;
  bitrate?: number;
  codec?: string;
}

export interface AudioProcessorOptions {
  chunkSize: number;
  overlap: number;
  enableNoiseReduction: boolean;
  enableEchoCancellation: boolean;
  enableAutoGainControl: boolean;
  bufferSize: number;
  windowSize: number;
}

export interface AudioChunk {
  data: Float32Array;
  timestamp: number;
  sampleRate: number;
  channelCount: number;
  duration: number;
}

export interface AudioExtractionConfig {
  preferredMethod: "mediastream" | "element" | "capture" | "auto";
  fallbackMethods: Array<"mediastream" | "element" | "capture">;
  minQuality: AudioQuality;
  maxLatency: number; // milliseconds
}

export interface AudioAnalysis {
  volume: number;
  frequency: number;
  hasVoice: boolean;
  noiseLevel: number;
  clarity: number;
}

export interface AudioExtractorStats {
  totalChunks: number;
  droppedChunks: number;
  averageLatency: number;
  currentQuality: AudioQuality;
  isActive: boolean;
  lastProcessedTime: number;
}

export type AudioExtractionMethod = "mediastream" | "element" | "capture";

export interface AudioStreamEvent {
  type: "chunk" | "start" | "stop" | "error" | "quality-change";
  data?: AudioChunk | AudioQuality | Error;
  timestamp: number;
}
