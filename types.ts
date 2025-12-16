export interface Shot {
  id: number;
  startTime: number;
  endTime: number;
  duration: number;
  thumbnail: string; // Base64 or Object URL
  dominantColor: string; // Hex
}

export interface FrameData {
  time: number;
  hue: number;
  saturation: number;
  brightness: number;
  hex: string;
}

export interface PolarPoint {
  time: number;
  hue: number;
  saturation: number;
  color: string;
}

export interface PaletteItem {
  color: string;
  thumbnail: string;
}

export interface AnalysisData {
  fileName: string;
  shots: Shot[];
  frames: FrameData[];
  duration: number;
  asl: number; // Average Shot Length
  msl: number; // Median Shot Length
  cuttingDensity: { time: number; density: number }[]; // Density over time
  palette: PaletteItem[]; // Key extracted colors with thumbnails
  polarData: PolarPoint[]; // 100 segments for radar/polar chart
}

export enum ViewMode {
  UPLOAD = 'UPLOAD',
  RHYTHM = 'RHYTHM',
  VISUAL = 'VISUAL',
  FINGERPRINT = 'FINGERPRINT'
}

export type Language = 'en' | 'zh';

export interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}