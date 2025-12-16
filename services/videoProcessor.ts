import { AnalysisData, FrameData, Shot, PolarPoint, PaletteItem } from '../types';

// --- Worker Script as a Blob ---
const workerScript = `
  // Helper to convert RGB to Hex
  const rgbToHex = (r, g, b) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  // Helper to convert RGB to HSL/HSV parts
  const rgbToHsb = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;

    if (max === min) {
      h = 0;
    } else {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, b: v * 100 };
  };

  self.onmessage = (e) => {
    const { imageData, width, height } = e.data;
    const data = new Uint8Array(imageData); // TypedArray from transfer
    const pixelCount = width * height;
    
    // Init Histogram Bins (16 bins)
    const currentHistogram = {
        r: new Array(16).fill(0),
        g: new Array(16).fill(0),
        b: new Array(16).fill(0)
    };
    const binSize = 16; 

    // Init 3x3 Zonal Data (Structure Detection)
    // 9 zones, each tracks rSum, gSum, bSum, count
    const zones = Array(9).fill(0).map(() => ({ r: 0, g: 0, b: 0, count: 0 }));
    const zoneW = width / 3;
    const zoneH = height / 3;

    // Init Sums for Average
    let rSum = 0, gSum = 0, bSum = 0;
    
    // Loop stride = 4 (every pixel). 
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        
        // Pixel Index
        const pIdx = i / 4;
        const x = pIdx % width;
        const y = Math.floor(pIdx / width);

        // 1. Accumulate for Average
        rSum += r;
        gSum += g;
        bSum += b;

        // 2. Populate Histogram
        currentHistogram.r[Math.floor(r / binSize)]++;
        currentHistogram.g[Math.floor(g / binSize)]++;
        currentHistogram.b[Math.floor(b / binSize)]++;

        // 3. Populate Zonal Data
        const col = Math.floor(x / zoneW);
        const row = Math.floor(y / zoneH);
        const zIdx = Math.min(row, 2) * 3 + Math.min(col, 2); // Clamp to be safe
        
        const z = zones[zIdx];
        z.r += r;
        z.g += g;
        z.b += b;
        z.count++;
    }

    const rAvg = Math.floor(rSum / pixelCount);
    const gAvg = Math.floor(gSum / pixelCount);
    const bAvg = Math.floor(bSum / pixelCount);
    const hexColor = rgbToHex(rAvg, gAvg, bAvg);
    const hsb = rgbToHsb(rAvg, gAvg, bAvg);

    // Normalize Zones
    const structure = zones.map(z => ({
        r: z.count ? Math.floor(z.r / z.count) : 0,
        g: z.count ? Math.floor(z.g / z.count) : 0,
        b: z.count ? Math.floor(z.b / z.count) : 0
    }));

    self.postMessage({
        histogram: currentHistogram,
        structure,
        hexColor,
        hsb,
        rAvg, gAvg, bAvg
    });
  };
`;

interface Histogram {
  r: number[];
  g: number[];
  b: number[];
}

interface RGB {
    r: number;
    g: number;
    b: number;
}

const calculateHistogramDiff = (h1: Histogram, h2: Histogram, totalPixels: number) => {
  let diff = 0;
  for (let i = 0; i < 16; i++) {
    diff += Math.abs(h1.r[i] - h2.r[i]);
    diff += Math.abs(h1.g[i] - h2.g[i]);
    diff += Math.abs(h1.b[i] - h2.b[i]);
  }
  return diff / (totalPixels * 6);
};

const calculateStructureDiff = (s1: RGB[], s2: RGB[]) => {
    let diff = 0;
    for (let i = 0; i < 9; i++) {
        diff += Math.abs(s1[i].r - s2[i].r);
        diff += Math.abs(s1[i].g - s2[i].g);
        diff += Math.abs(s1[i].b - s2[i].b);
    }
    // Max diff per channel is 255. Total max is 9 * 3 * 255.
    return diff / (9 * 3 * 255);
};

export const processVideo = async (
    file: File, 
    onProgress: (progress: number) => void, 
    signal?: AbortSignal,
    fileSize: number = 0,
    edlCuts?: number[] // Optional external cuts
): Promise<AnalysisData> => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    // Create Worker
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      worker.terminate();
      reject(new Error("Could not get canvas context"));
      return;
    }
    
    // Normalize EDL cuts (ensure starts at 0 and sorted)
    let normalizedEdlCuts: number[] = [];
    let isEdlMode = false;
    
    if (edlCuts && edlCuts.length > 0) {
        isEdlMode = true;
        // Ensure 0 is there and sorted
        normalizedEdlCuts = [...edlCuts].sort((a,b) => a-b);
        if (normalizedEdlCuts[0] > 0.1) {
            normalizedEdlCuts.unshift(0);
        }
        // Ensure we have an endpoint (duration will be added later if needed)
    }

    video.onloadeddata = async () => {
      const duration = video.duration;
      
      const width = 64; 
      const height = 36;
      const pixelCount = width * height;
      canvas.width = width;
      canvas.height = height;

      const shots: Shot[] = [];
      const frames: FrameData[] = [];
      let lastShotTime = 0;
      
      // Shot Detection State (Auto Mode)
      let prevHistogram: Histogram | null = null;
      let prevHsb: { h: number, s: number, b: number } | null = null;
      let prevStructure: RGB[] | null = null;
      
      let currentShotBest = {
        saturation: -1,
        color: '#000000',
        thumbnail: ''
      };

      let activeShotColor = '#000000';
      
      // ADAPTIVE SAMPLING STRATEGY
      let sampleRate = 0.5; 
      const GB = 1024 * 1024 * 1024;
      if (fileSize > 10 * GB) {
         sampleRate = 1.0;
      } else if (fileSize > 2 * GB) {
         sampleRate = 1.0;
      } else if (fileSize > 0.5 * GB) {
         sampleRate = 0.5;
      }

      let currentTime = 0;
      let shotCounter = 1;
      
      // EDL Mode State
      let currentEdlShotIndex = 0;

      const processStep = async () => {
        if (signal?.aborted) {
            worker.terminate();
            URL.revokeObjectURL(video.src);
            reject(new DOMException("Aborted", "AbortError"));
            return;
        }

        if (isEdlMode) {
             // --- EDL MODE (FAST) ---
             if (currentEdlShotIndex >= normalizedEdlCuts.length) {
                 // Finish
                 worker.terminate();
                 finishProcessing();
                 return;
             }

             const startTime = normalizedEdlCuts[currentEdlShotIndex];
             // Determine end time (next cut or duration)
             let endTime = duration;
             if (currentEdlShotIndex < normalizedEdlCuts.length - 1) {
                 endTime = normalizedEdlCuts[currentEdlShotIndex + 1];
             }
             
             // Sanity check
             if (startTime >= duration) {
                 worker.terminate();
                 finishProcessing();
                 return;
             }
             if (endTime > duration) endTime = duration;
             
             // Skip extremely short shots (< 0.1s) to avoid seeking errors
             if (endTime - startTime < 0.1) {
                 currentEdlShotIndex++;
                 processStep(); // Recurse
                 return;
             }

             // Seek to MIDDLE of shot for representative color
             const midPoint = startTime + (endTime - startTime) / 2;
             video.currentTime = midPoint;
             // We will wait for onseeked
             
        } else {
             // --- AUTO MODE (LINEAR SCAN) ---
             if (currentTime >= duration) {
                // Finish up last shot
                if (lastShotTime < duration) {
                    shots.push({
                        id: shotCounter,
                        startTime: lastShotTime,
                        endTime: duration,
                        duration: duration - lastShotTime,
                        thumbnail: currentShotBest.thumbnail || (shots.length > 0 ? shots[shots.length-1].thumbnail : ''), 
                        dominantColor: activeShotColor || '#000000'
                    });
                }
                worker.terminate();
                finishProcessing();
                return;
             }
             video.currentTime = currentTime;
        }
      };

      video.onseeked = async () => {
        if (signal?.aborted) {
            worker.terminate();
            URL.revokeObjectURL(video.src);
            reject(new DOMException("Aborted", "AbortError"));
            return;
        }

        // Draw to canvas
        ctx.drawImage(video, 0, 0, width, height);
        
        // Get raw data
        const frame = ctx.getImageData(0, 0, width, height);
        const imageData = frame.data.buffer; // ArrayBuffer

        // Offload to Worker
        worker.postMessage({
            imageData: imageData, // Transferable
            width,
            height
        }, [imageData]);
      };

      worker.onmessage = (e) => {
         const { histogram, structure, hexColor, hsb, rAvg, gAvg, bAvg } = e.data;
         
         if (isEdlMode) {
             // --- EDL MODE LOGIC ---
             const startTime = normalizedEdlCuts[currentEdlShotIndex];
             let endTime = duration;
             if (currentEdlShotIndex < normalizedEdlCuts.length - 1) {
                 endTime = normalizedEdlCuts[currentEdlShotIndex + 1];
             }
             if (endTime > duration) endTime = duration;

             // 1. Create Shot
             const thumb = canvas.toDataURL('image/jpeg', 0.5);
             shots.push({
                 id: currentEdlShotIndex + 1,
                 startTime: startTime,
                 endTime: endTime,
                 duration: endTime - startTime,
                 thumbnail: thumb,
                 dominantColor: hexColor
             });

             // 2. Backfill Frames (for Visual Charts)
             // Generate 1 frame per second (or per 0.5s) to keep charts working
             // We just duplicate the current middle-frame data across the shot duration
             const frameInterval = 1.0; 
             for (let t = startTime; t < endTime; t += frameInterval) {
                 frames.push({
                     time: t,
                     hue: hsb.h,
                     saturation: hsb.s,
                     brightness: hsb.b,
                     hex: hexColor
                 });
             }
             
             // Progress Update (Based on shot count vs total shots estimation or time)
             // Since we don't know total shots in advance strictly (unless we use edl length),
             // using time is safer.
             const progress = Math.min(100, Math.round((endTime / duration) * 100));
             onProgress(progress);

             // Next Shot
             currentEdlShotIndex++;
             
             // Use setImmediate or setTimeout(0) to avoid stack overflow and allow UI updates, 
             // but requestAnimationFrame is throttled to screen refresh rate (60fps), which is too slow for fast analysis.
             // We want to process as fast as possible.
             setTimeout(processStep, 0);

         } else {
             // --- AUTO MODE LOGIC ---
             
             // 1. Shot Boundary Detection
             let isCut = false;

             if (prevHistogram && prevHsb && prevStructure) {
                const histDiff = calculateHistogramDiff(prevHistogram, histogram, pixelCount);
                const structDiff = calculateStructureDiff(prevStructure, structure);
                
                // DYNAMIC THRESHOLD STRATEGY
                const timeSinceLastCut = currentTime - lastShotTime;
                
                // 1. Base Thresholds
                let histThreshold = 0.30;
                let structThreshold = 0.25; 

                // 2. Debounce 
                if (timeSinceLastCut < 1.5) {
                    histThreshold = 0.45;
                    structThreshold = 0.40;
                }

                // 3. Dark Scene Protection
                if (prevHsb.b < 15 && hsb.b < 15) {
                    if (histDiff < 0.6 && structDiff < 0.6) {
                        histThreshold = 0.6; 
                        structThreshold = 0.6;
                    }
                }

                // 4. Combine Logic
                if (histDiff > histThreshold || structDiff > structThreshold) { 
                    isCut = true;
                }
             }
    
             prevHistogram = histogram;
             prevHsb = hsb;
             prevStructure = structure;
    
             if (isCut) {
                 shots.push({
                     id: shotCounter,
                     startTime: lastShotTime,
                     endTime: currentTime,
                     duration: currentTime - lastShotTime,
                     thumbnail: currentShotBest.thumbnail || '',
                     dominantColor: activeShotColor
                 });
                 
                 shotCounter++;
                 lastShotTime = currentTime;
                 
                 // Reset Best Frame
                 currentShotBest = { saturation: -1, color: '#000000', thumbnail: '' };
             }
    
             // 2. Best Frame Tracking
             if (hsb.s > currentShotBest.saturation || currentShotBest.saturation === -1) {
                 currentShotBest = {
                     saturation: hsb.s,
                     color: hexColor,
                     thumbnail: canvas.toDataURL('image/jpeg', 0.5) 
                 };
                 activeShotColor = hexColor;
             }
    
             // 3. Record Frame Data
             frames.push({
                 time: currentTime,
                 hue: hsb.h,
                 saturation: hsb.s,
                 brightness: hsb.b,
                 hex: hexColor
             });
    
             // Next Step
             onProgress(Math.min(100, Math.round((currentTime / duration) * 100)));
             currentTime += sampleRate;
             
             requestAnimationFrame(processStep);
         }
      };

      const finishProcessing = () => {
        URL.revokeObjectURL(video.src);
        
        // Calculate Stats
        const totalDur = duration;
        const shotCount = shots.length;
        const asl = shotCount > 0 ? totalDur / shotCount : 0;
        
        const sortedShots = [...shots].sort((a, b) => a.duration - b.duration);
        const msl = sortedShots.length > 0 
          ? sortedShots[Math.floor(sortedShots.length/2)].duration 
          : 0;

        // Cutting Density
        const cuttingDensity = [];
        const windowSize = 20; // seconds
        const stepSize = 2; // seconds
        
        for (let t = 0; t < duration; t += stepSize) {
             const windowStart = Math.max(0, t - windowSize / 2);
             const windowEnd = Math.min(duration, t + windowSize / 2);
             const actualWindow = windowEnd - windowStart;
             
             const cutsInWindow = shots.filter(s => s.endTime > windowStart && s.endTime < windowEnd).length;
             
             // Normalize to Cuts Per Minute
             const density = (cutsInWindow / actualWindow) * 60;
             
             cuttingDensity.push({
                 time: t,
                 density: density 
             });
        }

        // Palette
        const palette: PaletteItem[] = shots
           .filter(s => s.duration > 1)
           .sort((a, b) => b.duration - a.duration) 
           .slice(0, 10)
           .map(s => ({ color: s.dominantColor, thumbnail: s.thumbnail }));

        // Polar Data
        const polarData = frames.map(f => ({
            time: f.time,
            hue: f.hue,
            saturation: f.saturation,
            color: f.hex
        }));

        resolve({
            fileName: file.name,
            shots,
            frames,
            duration,
            asl,
            msl,
            cuttingDensity,
            palette,
            polarData
        });
      };

      // Start
      processStep();
    };

    video.onerror = () => {
        worker.terminate();
        reject(new Error("Error loading video"));
    };
  });
};
