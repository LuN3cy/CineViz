export const parseEDL = async (file: File): Promise<number[]> => {
  const text = await file.text();
  const lines = text.split('\n');
  const cuts: number[] = [];
  let firstTimecode: number | null = null;

  // Helper to parse timecode HH:MM:SS:FF to seconds
  const parseTimecode = (tc: string, fps: number = 24): number => {
    const parts = tc.trim().split(':');
    if (parts.length !== 4) return -1;
    
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parseInt(parts[2], 10);
    const f = parseInt(parts[3], 10);
    
    return h * 3600 + m * 60 + s + (f / fps);
  };

  // Regex for standard CMX 3600 EDL line
  // 001  AX       V     C        01:00:00:00 01:00:04:10 01:00:00:00 01:00:04:10
  // We match the last two timecodes (Record In, Record Out)
  const lineRegex = /^\d+\s+.*\s+V\s+C\s+(\d{2}:\d{2}:\d{2}:\d{2})\s+(\d{2}:\d{2}:\d{2}:\d{2})\s+(\d{2}:\d{2}:\d{2}:\d{2})\s+(\d{2}:\d{2}:\d{2}:\d{2})/;

  for (const line of lines) {
    const match = line.match(lineRegex);
    if (match) {
      // match[3] is Record In
      // match[4] is Record Out
      
      // Try to detect FPS if possible, or assume 24 (standard for film) or 30
      // For now, let's assume 24 as it's most common for movies which is the target of this feature
      // TODO: Allow FPS selection or auto-detect from high frame numbers
      const fps = 24; 

      const recordIn = parseTimecode(match[3], fps);
      
      if (recordIn !== -1) {
        if (firstTimecode === null) {
          firstTimecode = recordIn;
        }
        
        // Normalize relative to start
        const normalizedTime = recordIn - firstTimecode;
        
        // Add to cuts if not duplicate
        if (cuts.length === 0 || Math.abs(cuts[cuts.length - 1] - normalizedTime) > 0.1) {
           cuts.push(normalizedTime);
        }
      }
    }
  }
  
  return cuts.sort((a, b) => a - b);
};
