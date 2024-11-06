export interface BarData {
  Time: number;
  Open: number;
  High: number;
  Low: number;
  Close: number;
  TickVolume: number;
}

export interface ChunkData {
  ChunkStart: number;
  Bars: BarData[];
}
