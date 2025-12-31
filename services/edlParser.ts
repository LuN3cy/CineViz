export const parseEDL = async (file: File): Promise<number[]> => {
  const text = await file.text();
  const lines = text.split(/\r?\n/);
  const cuts: number[] = [];
  let firstTimecode: number | null = null;

  // 1. Detect FPS from file content or high frame numbers
  let fps = 24; 
  
  // Look for FCM line
  for (const line of lines) {
    if (line.includes('FCM:')) {
      if (line.includes('NON-DROP FRAME')) fps = 24; // Could be 25 or 30 too, but 24 is safe default
      if (line.includes('DROP FRAME')) fps = 29.97;
    }
  }

  // Scan for max frame number to refine FPS
  let maxFrame = 0;
  const tcRegex = /(\d{2})[:;](\d{2})[:;](\d{2})[:;](\d{2})/g;
  let tcMatch;
  while ((tcMatch = tcRegex.exec(text)) !== null) {
    const f = parseInt(tcMatch[4], 10);
    if (f > maxFrame) maxFrame = f;
  }
  
  if (maxFrame >= 50) fps = 60;
  else if (maxFrame >= 30) fps = 50; // or 48? 50 is common
  else if (maxFrame >= 25) fps = 30;
  else if (maxFrame >= 24) fps = 25; // if we see 24, it must be at least 25fps (0-24)
  
  console.log(`Detected likely FPS: ${fps} (Max frame seen: ${maxFrame})`);

  // Helper to parse timecode HH:MM:SS:FF or HH:MM:SS;FF to seconds
  const parseTimecode = (tc: string, currentFps: number): number => {
    const parts = tc.trim().split(/[:;]/);
    if (parts.length !== 4) return -1;
    
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parseInt(parts[2], 10);
    const f = parseInt(parts[3], 10);
    
    return h * 3600 + m * 60 + s + (f / currentFps);
  };

  // Robust Regex for EDL event line
  // Supports:
  // 001  AX       V     C        01:00:00:00 01:00:04:10 01:00:00:00 01:00:04:10
  // 001  CLIP_NAME V1    C        00:00:01:00 00:00:02:00 01:00:00:00 01:00:01:00
  // 001  AX       V     D  030   00:00:01:00 00:00:02:00 01:00:00:00 01:00:01:00
  const eventRegex = /^(\d+)\s+(.*?)\s+(\w+)\s+(\w+)\s+(?:\d{3}\s+)?(\d{2}[:;]\d{2}[:;]\d{2}[:;]\d{2})\s+(\d{2}[:;]\d{2}[:;]\d{2}[:;]\d{2})\s+(\d{2}[:;]\d{2}[:;]\d{2}[:;]\d{2})\s+(\d{2}[:;]\d{2}[:;]\d{2}[:;]\d{2})/;

  let matchedLines = 0;
  for (const line of lines) {
    const match = line.trim().match(eventRegex);
    if (match) {
      matchedLines++;
      // match[7] is Record In
      // match[8] is Record Out
      
      const recordIn = parseTimecode(match[7], fps);
      const recordOut = parseTimecode(match[8], fps);
      
      if (recordIn !== -1) {
        if (firstTimecode === null) {
          firstTimecode = recordIn;
        }
        
        // Normalize relative to start
        const normalizedIn = recordIn - firstTimecode;
        const normalizedOut = recordOut - firstTimecode;
        
        // Add Record In as a cut point
        if (cuts.length === 0 || Math.abs(cuts[cuts.length - 1] - normalizedIn) > 0.001) {
           cuts.push(normalizedIn);
        }
        
        // Also track Record Out for the very last shot
        // (Usually Record Out of current line == Record In of next line)
        if (Math.abs(cuts[cuts.length - 1] - normalizedOut) > 0.001) {
            // We don't push yet, but we'll sort and dedup at the end
            cuts.push(normalizedOut);
        }
      }
    }
  }
  
  console.log(`EDL Parser: Matched ${matchedLines} event lines. Total unique cuts: ${cuts.length}`);
  
  // Sort and final deduplication (extremely tight threshold to preserve short shots)
  const uniqueCuts = Array.from(new Set(cuts.sort((a, b) => a - b)))
    .filter((val, idx, arr) => idx === 0 || Math.abs(val - arr[idx - 1]) > 0.001);

  return uniqueCuts;
};
