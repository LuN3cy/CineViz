import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { AnalysisData, Shot, Language } from '../../types';
import { Button } from '../ui/Components';
import { Download, Loader2, Copy, Check } from 'lucide-react';

interface ColorFingerprintProps {
  data: AnalysisData;
  isDark: boolean;
  lang: Language;
}

export const ColorFingerprint: React.FC<ColorFingerprintProps> = ({ data, isDark, lang }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [hoveredShot, setHoveredShot] = useState<Shot | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  useEffect(() => {
    if (!containerRef.current || !svgRef.current || !data) return;

    const draw = () => {
      const container = containerRef.current;
      if (!container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width === 0 || height === 0) return;

      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      // Ensure SVG takes full space
      svg.attr("width", "100%").attr("height", "100%");

      // Calculate radius to fit container with some padding
      const radius = Math.min(width, height) / 2 - 20;
      const center = { x: width / 2, y: height / 2 };

      const totalDuration = data.duration;
      
      const g = svg.append("g")
        .attr("transform", `translate(${center.x},${center.y})`);

      const angleScale = d3.scaleLinear()
        .domain([0, totalDuration])
        .range([0, 2 * Math.PI]);

      const maxDensity = d3.max(data.cuttingDensity, d => d.density) || 1;

      // Helper to update tooltip position safely
      const updateTooltip = (event: MouseEvent) => {
        const containerRect = container.getBoundingClientRect();
        setTooltipPos({
          x: event.clientX - containerRect.left,
          y: event.clientY - containerRect.top
        });
      };

      data.shots.forEach((shot, i) => {
        const startAngle = angleScale(shot.startTime);
        const endAngle = angleScale(shot.endTime);
        
        // Get average density for the shot duration
        const density = data.cuttingDensity.find(d => d.time >= (shot.startTime + shot.endTime)/2)?.density || 0;
        const normalizedDensity = density / maxDensity; // 0 to 1
        
        // --- UPDATED RADIUS LOGIC ---
        // Inner radius is fixed (Complete Ring)
        // Outer radius fluctuates with density
        const baseInner = radius * 0.40;
        const baseOuter = radius * 0.85; 
        
        // Offset based on density: Higher density = Thicker segment (extends outwards)
        const densityOffset = normalizedDensity * (radius * 0.15); 
        
        const innerR = baseInner;
        const outerR = baseOuter + densityOffset;

        const arcGenerator = d3.arc<any>()
          .innerRadius(innerR)
          .outerRadius(outerR)
          .startAngle(startAngle)
          .endAngle(endAngle)
          .padAngle(0)
          .cornerRadius(0);

        g.append("path")
          .attr("d", arcGenerator({}))
          .attr("fill", shot.dominantColor)
          .style("opacity", 1.0)
          .style("cursor", "crosshair")
          .style("transition", "filter 0.1s ease")
          .on("mouseenter", function(event) {
             d3.select(this)
               .style("filter", "brightness(1.3) drop-shadow(0 0 4px rgba(255,255,255,0.5))")
               .attr("stroke", isDark ? "#fff" : "#000")
               .attr("stroke-width", 2)
               .raise();
             setHoveredShot(shot);
             updateTooltip(event);
          })
          .on("mousemove", function(event) {
             updateTooltip(event);
          })
          .on("mouseleave", function() {
             d3.select(this)
               .style("filter", "none")
               .attr("stroke", "none");
             setHoveredShot(null);
          });
      });
      
      // Aesthetic Center Circles
      g.append("circle")
        .attr("r", radius * 0.35) // Adjusted to fit new inner radius
        .attr("fill", "none")
        .attr("stroke", isDark ? "#1E1F24" : "#E5E7EB")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4 4")
        .style("pointer-events", "none");

      // Center Text
      const textGroup = g.append("g").style("pointer-events", "none");
      
      const displayName = data.fileName.length > 20 
        ? data.fileName.substring(0, 17) + "..." 
        : data.fileName;

      textGroup.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "-0.2em")
        .attr("fill", isDark ? "white" : "#111827")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("letter-spacing", "1px")
        .text("CINEVIZ");
        
      textGroup.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "1.5em")
        .attr("fill", isDark ? "#4B5563" : "#6B7280")
        .style("font-size", "10px")
        .style("font-family", "monospace")
        .text(displayName);
    };

    draw();
    const observer = new ResizeObserver(() => draw());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [data, isDark]);

  const generateReportCanvas = async (): Promise<HTMLCanvasElement> => {
     // --- Setup A4 Canvas (High Res / 3x Scale for Retina Quality) ---
      const logicalWidth = 1200;
      const logicalHeight = 2050; // Increased height for spacing
      const scaleFactor = 3; 

      const canvas = document.createElement('canvas');
      canvas.width = logicalWidth * scaleFactor;
      canvas.height = logicalHeight * scaleFactor;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("No Context");

      // Scale all drawing operations
      ctx.scale(scaleFactor, scaleFactor);

      // --- Colors & Themes ---
      const bgColor = isDark ? '#0B0E14' : '#FFFFFF';
      const cardBg = isDark ? '#151821' : '#FFFFFF';
      const cardBorder = isDark ? '#2A2F3E' : '#E5E7EB';
      const textColor = isDark ? '#F8FAFC' : '#111827';
      const subTextColor = isDark ? '#94A3B8' : '#6B7280';
      const accentColor = '#0023AD';
      const aslColor = '#F59E0B';
      const mslColor = '#10B981';
      const gridColor = isDark ? '#2A2F3E' : '#E5E7EB';

      // Background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);
      
      // Gradient Overlay
      const grad = ctx.createLinearGradient(0, 0, 0, logicalHeight);
      grad.addColorStop(0, isDark ? '#16171C' : '#F9FAFB');
      grad.addColorStop(1, bgColor);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);

      const margin = 80;

      // Helper: Draw Glass Card Background
      const drawGlassCard = (x: number, y: number, w: number, h: number) => {
        ctx.fillStyle = cardBg;
        ctx.strokeStyle = cardBorder;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 24);
        ctx.fill();
        ctx.stroke();
        // Inner Glow hint
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 10;
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      };

      // Helper: Headers
      const drawSectionHeader = (title: string, y: number) => {
        ctx.textBaseline = "middle";
        ctx.fillStyle = accentColor;
        ctx.fillRect(margin, y - 14, 6, 28);
        ctx.fillStyle = textColor;
        ctx.font = "bold 24px Inter, 'PingFang SC', sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(title, margin + 24, y);
      };

      // Helper: Draw Axis
      const drawAxis = (x: number, y: number, w: number, h: number, xTicks: number = 5, yTicks: number = 4) => {
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        // Horizontal Grid lines (Y-axis ticks)
        for(let i=0; i<=yTicks; i++) {
            const ly = y + h - (i/yTicks * h);
            ctx.moveTo(x, ly);
            ctx.lineTo(x + w, ly);
        }
        
        // Vertical Grid lines (X-axis ticks)
        for(let i=0; i<=xTicks; i++) {
            const lx = x + (i/xTicks * w);
            ctx.moveTo(lx, y);
            ctx.lineTo(lx, y + h);
        }
        ctx.stroke();
        
        // Main Axis
        ctx.strokeStyle = subTextColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h);
        ctx.stroke();
      };


      // --- HEADER (Updated to match App Layout) ---
      const headerY = 80;
      
      // 1. CINEVIZ Logo (Left)
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = textColor;
      ctx.font = "bold 42px Inter, sans-serif";
      ctx.letterSpacing = "-1px";
      ctx.fillText("CINEVIZ", margin, headerY);
      
      // 2. Vertical Divider
      const logoWidth = ctx.measureText("CINEVIZ").width;
      const dividerX = margin + logoWidth + 20;
      ctx.strokeStyle = subTextColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(dividerX, headerY - 20);
      ctx.lineTo(dividerX, headerY + 20);
      ctx.stroke();

      // 3. Chinese Badge + Title (Right of Divider)
      const stackX = dividerX + 20;
      // Blue Badge
      ctx.fillStyle = '#002FA7';
      ctx.fillRect(stackX, headerY - 18, 80, 18); 
      ctx.fillStyle = '#FFFFFF';
      ctx.font = "bold 10px Inter, 'PingFang SC', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("计量电影学", stackX + 40, headerY - 9);

      // Subtitle
      ctx.textAlign = "left";
      ctx.fillStyle = textColor;
      ctx.font = "bold 16px Inter, 'PingFang SC', sans-serif";
      ctx.fillText("影片可视化", stackX, headerY + 12);

      // Meta Data (Far Right)
      ctx.textAlign = "right";
      ctx.fillStyle = textColor;
      ctx.font = "bold 24px monospace";
      ctx.fillText(data.fileName, logicalWidth - margin, headerY - 10);
      ctx.fillStyle = subTextColor;
      ctx.font = "14px Inter, sans-serif";
      ctx.fillText(`Analysis Report • ${new Date().toLocaleDateString()}`, logicalWidth - margin, headerY + 15);

      // --- SECTION 1: COLOR FINGERPRINT ---
      const fpCY = 500;
      const fpCX = logicalWidth / 2;
      const fpRadius = 240; 
      
      drawSectionHeader("色彩指纹 COLOR FINGERPRINT", fpCY - 300);

      const maxDensity = d3.max(data.cuttingDensity, d => d.density) || 1;
      const getDensityAt = (time: number) => data.cuttingDensity.find(d => d.time >= time)?.density || 0;

      data.shots.forEach((shot) => {
        const startAngle = (shot.startTime / data.duration) * 2 * Math.PI - (Math.PI / 2);
        const endAngle = (shot.endTime / data.duration) * 2 * Math.PI - (Math.PI / 2);
        const midTime = (shot.startTime + shot.endTime) / 2;
        const normalizedDensity = getDensityAt(midTime) / maxDensity;
        
        // Updated Export Logic: Fixed Inner, Variable Outer
        const baseInner = fpRadius * 0.40;
        const baseOuter = fpRadius * 0.85;
        const densityOffset = normalizedDensity * 45;

        ctx.fillStyle = shot.dominantColor;
        ctx.beginPath();
        ctx.arc(fpCX, fpCY, baseOuter + densityOffset, startAngle, endAngle);
        ctx.arc(fpCX, fpCY, baseInner, endAngle, startAngle, true); // Fixed inner
        ctx.closePath();
        ctx.fill();
      });

      // --- SECTION 2: RHYTHM ANALYSIS ---
      const rhythmY = 900;
      drawSectionHeader("节奏 RHYTHM ANALYSIS", rhythmY);

      const rowHeight = 400;
      
      // 2.1 ASL/MSL Panel
      const statsW = 400;
      const statsH = 160;
      const statsX = margin;
      const statsY = rhythmY + 40;
      drawGlassCard(statsX, statsY, statsW, statsH);
      
      ctx.textAlign = "left";
      ctx.fillStyle = subTextColor; ctx.font = "14px Inter, sans-serif"; ctx.fillText("Pacing Analysis 节奏分析", statsX + 24, statsY + 32);

      // ASL
      const aslX = statsX + 24; const aslY = statsY + 80;
      ctx.fillStyle = aslColor; ctx.beginPath(); ctx.arc(aslX + 5, aslY - 10, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = subTextColor; ctx.font = "12px monospace"; ctx.fillText("ASL", aslX + 16, aslY - 6);
      ctx.fillStyle = textColor; ctx.font = "bold 32px Inter, sans-serif"; ctx.fillText(data.asl.toFixed(2), aslX, aslY + 30);
      ctx.font = "14px Inter, sans-serif"; ctx.fillText("s", aslX + 75, aslY + 30); // unit
      
      // MSL
      const mslX = statsX + 220;
      ctx.fillStyle = mslColor; ctx.beginPath(); ctx.arc(mslX + 5, aslY - 10, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = subTextColor; ctx.font = "12px monospace"; ctx.fillText("MSL", mslX + 16, aslY - 6);
      ctx.fillStyle = textColor; ctx.font = "bold 32px Inter, sans-serif"; ctx.fillText(data.msl.toFixed(2), mslX, aslY + 30);
      ctx.font = "14px Inter, sans-serif"; ctx.fillText("s", mslX + 75, aslY + 30);

      ctx.strokeStyle = cardBorder; ctx.beginPath(); ctx.moveTo(statsX + 190, statsY + 60); ctx.lineTo(statsX + 190, statsY + 120); ctx.stroke();

      // 2.2 Stats Panel
      const infoX = statsX + statsW + 20;
      const infoW = logicalWidth - margin - infoX;
      drawGlassCard(infoX, statsY, infoW, statsH);
      
      ctx.fillStyle = subTextColor; ctx.font = "14px Inter, sans-serif"; ctx.fillText("Overview 总览", infoX + 24, statsY + 32);
      ctx.fillStyle = textColor; ctx.font = "bold 28px Inter, sans-serif"; ctx.fillText(data.shots.length.toString(), infoX + 24, statsY + 80);
      ctx.fillStyle = subTextColor; ctx.font = "12px Inter, sans-serif"; ctx.fillText("Total Shots 总镜头数", infoX + 24, statsY + 100);
      ctx.fillStyle = textColor; ctx.font = "bold 28px Inter, sans-serif"; ctx.fillText(formatTime(data.duration), infoX + 180, statsY + 80);
      ctx.fillStyle = subTextColor; ctx.font = "12px Inter, sans-serif"; ctx.fillText("Total Duration 总时长", infoX + 180, statsY + 100);


      // 2.3 Histogram & Density
      const graphY = statsY + statsH + 20;
      const graphH = 250;
      
      // Histogram
      const histW = 700;
      drawGlassCard(margin, graphY, histW, graphH);
      
      ctx.fillStyle = subTextColor;
      ctx.font = "14px Inter, sans-serif";
      ctx.fillText("Shot Duration Distribution 镜头时长分布", margin + 24, graphY + 32);

      const histPlotX = margin + 54; // More left padding for axis labels
      const histPlotY = graphY + 60;
      const histPlotW = histW - 88;
      const histPlotH = graphH - 90; // More bottom padding for axis labels
      
      // Draw Histogram Grid & Axis
      const maxShotDur = Math.max(...data.shots.map(s => s.duration), data.asl * 2); 
      drawAxis(histPlotX, histPlotY, histPlotW, histPlotH);
      
      // Y-Axis Labels (Duration)
      ctx.textAlign = "right"; ctx.fillStyle = subTextColor; ctx.font = "10px Inter, sans-serif";
      ctx.fillText(`${maxShotDur.toFixed(0)}s`, histPlotX - 8, histPlotY + 4);
      ctx.fillText(`${(maxShotDur/2).toFixed(0)}s`, histPlotX - 8, histPlotY + histPlotH/2 + 4);
      ctx.fillText("0s", histPlotX - 8, histPlotY + histPlotH + 4);

      // X-Axis Labels (Shots)
      ctx.textAlign = "center";
      ctx.fillText("Start 开始", histPlotX, histPlotY + histPlotH + 15);
      ctx.fillText(`Shot 镜头 ${Math.floor(data.shots.length/2)}`, histPlotX + histPlotW/2, histPlotY + histPlotH + 15);
      ctx.fillText("End 结束", histPlotX + histPlotW, histPlotY + histPlotH + 15);

      // Bars
      const barW = histPlotW / data.shots.length;
      data.shots.forEach((s, i) => {
        const h = Math.min((s.duration / maxShotDur) * histPlotH, histPlotH);
        const x = histPlotX + i * barW;
        const y = histPlotY + histPlotH - h;
        
        ctx.fillStyle = s.duration > data.asl ? accentColor : (isDark ? '#4B5563' : '#9CA3AF');
        if (s.duration <= data.asl) ctx.globalAlpha = 0.5;
        ctx.fillRect(x, y, Math.max(barW - 0.5, 1), h);
        ctx.globalAlpha = 1.0;
      });

      // Reference Lines
      const drawRefLine = (val: number, color: string, label: string) => {
         const y = histPlotY + histPlotH - Math.min((val / maxShotDur) * histPlotH, histPlotH);
         ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
         ctx.beginPath(); ctx.moveTo(histPlotX, y); ctx.lineTo(histPlotX + histPlotW, y); ctx.stroke();
         ctx.setLineDash([]);
         ctx.fillStyle = color; ctx.font = "bold 10px monospace"; ctx.textAlign = "right";
         ctx.fillText(label, histPlotX + histPlotW - 5, y - 4);
      };
      drawRefLine(data.asl, aslColor, "ASL");
      drawRefLine(data.msl, mslColor, "MSL");


      // Density Area
      const denseX = margin + histW + 20;
      const denseW = logicalWidth - denseX - margin;
      drawGlassCard(denseX, graphY, denseW, graphH);
      
      ctx.textAlign = "left"; ctx.fillStyle = subTextColor; ctx.font = "14px Inter, sans-serif";
      ctx.fillText("Cutting Density 剪辑密度", denseX + 24, graphY + 32);

      const dPlotX = denseX + 44;
      const dPlotY = graphY + 60;
      const dPlotW = denseW - 68;
      const dPlotH = graphH - 90;
      
      const maxD = Math.max(...data.cuttingDensity.map(d => d.density));
      drawAxis(dPlotX, dPlotY, dPlotW, dPlotH, 3, 3);
      
      // Density Axis Labels
      ctx.textAlign = "right"; ctx.fillStyle = subTextColor; ctx.font = "10px Inter, sans-serif";
      ctx.fillText(`${maxD.toFixed(1)}`, dPlotX - 8, dPlotY + 4);
      ctx.fillText("0", dPlotX - 8, dPlotY + dPlotH + 4);
      
      // Density Time Labels
      ctx.textAlign = "center";
      ctx.fillText("0s", dPlotX, dPlotY + dPlotH + 15);
      ctx.fillText(`${data.duration.toFixed(0)}s`, dPlotX + dPlotW, dPlotY + dPlotH + 15);
      
      // Plot
      ctx.beginPath();
      ctx.moveTo(dPlotX, dPlotY + dPlotH);
      data.cuttingDensity.forEach((d, i) => {
          const x = dPlotX + (i / data.cuttingDensity.length) * dPlotW;
          const y = dPlotY + dPlotH - (d.density / maxD) * dPlotH;
          ctx.lineTo(x, y);
      });
      ctx.lineTo(dPlotX + dPlotW, dPlotY + dPlotH);
      ctx.closePath();
      const dGrad = ctx.createLinearGradient(0, dPlotY, 0, dPlotY + dPlotH);
      dGrad.addColorStop(0, "rgba(168, 85, 247, 0.5)"); 
      dGrad.addColorStop(1, "rgba(168, 85, 247, 0)");
      ctx.fillStyle = dGrad; ctx.fill();
      
      ctx.strokeStyle = "#A855F7"; ctx.lineWidth = 2; ctx.beginPath();
      data.cuttingDensity.forEach((d, i) => {
          const x = dPlotX + (i / data.cuttingDensity.length) * dPlotW;
          const y = dPlotY + dPlotH - (d.density / maxD) * dPlotH;
          if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
      ctx.stroke();


      // --- SECTION 3: VISUAL ANALYSIS ---
      // Increased Spacing: Visual Y moved from 1400 to 1480
      const visualY = 1480; 
      drawSectionHeader("视觉 VISUAL ANALYSIS", visualY);

      // 3.1 Polar Plot
      const polarCardW = 400;
      const polarCardH = 400;
      const polarX = margin;
      const polarY = visualY + 40;
      
      drawGlassCard(polarX, polarY, polarCardW, polarCardH);
      ctx.textAlign = "center"; ctx.fillStyle = subTextColor; ctx.font = "14px Inter, sans-serif";
      ctx.fillText("Color Polar Plot 色彩极坐标图", polarX + polarCardW/2, polarY + 32);

      const pcx = polarX + polarCardW/2;
      const pcy = polarY + polarCardH/2 + 10;
      const pr = 140;

      // Dashed Circles (Grid) & Labels
      ctx.strokeStyle = gridColor; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      [0.25, 0.5, 0.75, 1].forEach((scale, i) => {
          const r = pr * scale;
          ctx.beginPath(); ctx.arc(pcx, pcy, r, 0, Math.PI * 2); ctx.stroke();
          // Saturation Scale Labels
          ctx.fillStyle = subTextColor; ctx.font = "9px Inter, sans-serif"; ctx.textAlign = "center";
          if (scale < 1) ctx.fillText(`${scale * 100}`, pcx, pcy - r + 10);
      });
      // Axis lines
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(pcx, pcy - pr); ctx.lineTo(pcx, pcy + pr); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pcx - pr, pcy); ctx.lineTo(pcx + pr, pcy); ctx.stroke();

      // Degree Labels
      ctx.font = "bold 12px Inter, sans-serif";
      ctx.fillStyle = "#EF4444"; ctx.fillText("0°", pcx, pcy - pr - 10);
      ctx.fillStyle = "#06B6D4"; ctx.textAlign="left"; ctx.fillText("90°", pcx + pr + 10, pcy);
      ctx.fillStyle = "#06B6D4"; ctx.textAlign="center"; ctx.fillText("180°", pcx, pcy + pr + 18);
      ctx.fillStyle = "#3B82F6"; ctx.textAlign="right"; ctx.fillText("270°", pcx - pr - 10, pcy);

      // Points
      data.polarData.forEach(p => {
          const rad = (p.hue - 90) * (Math.PI / 180);
          const r = (p.saturation / 100) * pr;
          const px = pcx + r * Math.cos(rad);
          const py = pcy + r * Math.sin(rad);
          ctx.fillStyle = p.color; ctx.globalAlpha = 0.8;
          ctx.beginPath(); ctx.arc(px, py, 3 + (p.saturation/25), 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1.0;


      // 3.2 Visual Dynamics
      const dynX = polarX + polarCardW + 20;
      const dynW = logicalWidth - margin - dynX;
      const dynH = 260;
      
      drawGlassCard(dynX, polarY, dynW, dynH);
      ctx.textAlign = "left"; ctx.fillStyle = subTextColor; ctx.font = "14px Inter, sans-serif";
      ctx.fillText("Visual Dynamics 视觉动态", dynX + 24, polarY + 32);
      
      // Legend
      ctx.font = "12px Inter, sans-serif";
      ctx.fillStyle = "#A855F7"; ctx.fillText("Saturation 饱和度", dynX + dynW - 160, polarY + 32);
      ctx.fillStyle = "#FBBF24"; ctx.fillText("Brightness 亮度", dynX + dynW - 70, polarY + 32);

      const dynPlotX = dynX + 34; // Padding for Y labels
      const dynPlotY = polarY + 60;
      const dynPlotW = dynW - 58;
      const dynPlotH = dynH - 90; // Padding for X labels

      // Grid with Ticks
      drawAxis(dynPlotX, dynPlotY, dynPlotW, dynPlotH, 4, 4);

      // Y-Axis Labels
      ctx.textAlign = "right"; ctx.font = "10px Inter, sans-serif"; ctx.fillStyle = subTextColor;
      ctx.fillText("100", dynPlotX - 5, dynPlotY + 4);
      ctx.fillText("50", dynPlotX - 5, dynPlotY + dynPlotH/2 + 4);
      ctx.fillText("0", dynPlotX - 5, dynPlotY + dynPlotH + 4);

      // X-Axis Labels
      ctx.textAlign = "center";
      ctx.fillText("0s", dynPlotX, dynPlotY + dynPlotH + 15);
      ctx.fillText(`${(data.duration/2).toFixed(0)}s`, dynPlotX + dynPlotW/2, dynPlotY + dynPlotH + 15);
      ctx.fillText(`${data.duration.toFixed(0)}s`, dynPlotX + dynPlotW, dynPlotY + dynPlotH + 15);

      const step = Math.ceil(data.frames.length / 200);
      const points = data.frames.filter((_, i) => i % step === 0);

      const drawLine = (key: 'saturation' | 'brightness', color: string) => {
          ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2;
          points.forEach((p, i) => {
              const x = dynPlotX + (i / points.length) * dynPlotW;
              const y = dynPlotY + dynPlotH - (p[key] / 100) * dynPlotH;
              if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          ctx.stroke();
      };
      drawLine('saturation', '#A855F7');
      drawLine('brightness', '#FBBF24');


      // 3.3 Palette (Adaptive Grid Layout)
      const palCardY = polarY + dynH + 20;
      const palCardH = polarCardH - dynH - 20;
      drawGlassCard(dynX, palCardY, dynW, palCardH);
      
      ctx.textAlign = "left"; ctx.fillStyle = subTextColor; ctx.font = "14px Inter, sans-serif";
      ctx.fillText("Dominant Palette 主色板", dynX + 24, palCardY + 32);

      // Adaptive Size Logic
      const itemCount = data.palette.length;
      let palItemSize = 60;
      let palGap = 15;
      
      // If too many items, shrink size to fit width
      const maxW = dynW - 48; // Padding
      // Try single row first
      let totalW = itemCount * palItemSize + (itemCount - 1) * palGap;
      
      if (totalW > maxW) {
          // Shrink item size
          palItemSize = (maxW - (itemCount - 1) * palGap) / itemCount;
          // If item becomes too small (< 30px), we might need multi-row or just cap it
          if (palItemSize < 30) {
              palItemSize = 30;
              // Multi-row logic (simple wrap)
              // But for this canvas layout, we have fixed height.
              // Let's just limit max items shown if it's absurdly huge (unlikely for dominant palette, usually < 20)
              // Or just let them overflow/overlap slightly? 
              // Better: shrink gap too.
              palGap = 5;
              palItemSize = (maxW - (itemCount - 1) * palGap) / itemCount;
          }
      }
      
      // Recalculate total width with final size
      totalW = itemCount * palItemSize + (itemCount - 1) * palGap;
      
      let px = dynX + (dynW - totalW) / 2;
      // Center vertically in the remaining space of the card
      const py = palCardY + (palCardH - palItemSize) / 2 + 10;

      data.palette.forEach(item => {
          ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
          ctx.fillStyle = item.color;
          ctx.beginPath(); ctx.roundRect(px, py, palItemSize, palItemSize, 12); ctx.fill();
          ctx.shadowColor = 'transparent';
          px += palItemSize + palGap;
      });

      return canvas;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const canvas = await generateReportCanvas();
      const pngUrl = canvas.toDataURL("image/png", 1.0); 
      const link = document.createElement('a');
      link.download = `${data.fileName.replace(/\./g, '_')}_Analysis_Report.png`;
      link.href = pngUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("Failed to export report.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
      setIsCopying(true);
      try {
          const canvas = await generateReportCanvas();
          canvas.toBlob(async (blob) => {
              if (!blob) throw new Error("Canvas blob failed");
              const item = new ClipboardItem({ "image/png": blob });
              await navigator.clipboard.write([item]);
              setCopySuccess(true);
              setTimeout(() => setCopySuccess(false), 2000);
          }, "image/png", 1.0);
      } catch (e) {
          console.error(e);
          alert("Failed to copy image.");
      } finally {
          setIsCopying(false);
      }
  }

  return (
    <div className="flex flex-col h-full w-full gap-6">
       {/* Chart Area */}
       <div className="relative flex-1 w-full min-h-0 rounded-2xl">
           <div ref={containerRef} className="w-full h-full flex items-center justify-center relative z-10">
              <svg ref={svgRef} className="w-full h-full overflow-visible" />
           </div>

           {/* Hover Tooltip rendered here in DOM */}
           {hoveredShot && (
             <div 
               className="absolute z-20 flex flex-col gap-2 rounded-xl bg-dash-card/95 p-3 shadow-2xl backdrop-blur-md border border-dash-border pointer-events-none transition-all duration-75"
               style={{
                 left: tooltipPos.x + 20, 
                 top: tooltipPos.y,
                 width: '200px'
               }}
             >
                 {hoveredShot.thumbnail && (
                   <div className="aspect-video w-full overflow-hidden rounded-lg bg-black/20 border border-dash-border/50">
                     <img src={hoveredShot.thumbnail} className="h-full w-full object-cover" alt="Shot preview" />
                   </div>
                 )}
                 <div className="flex flex-col px-1 pb-1">
                    <span className="text-[10px] font-medium text-brand-accent uppercase tracking-wider">Shot {hoveredShot.id}</span>
                    <span className="font-mono text-xs font-bold text-dash-textHigh mt-0.5">
                      {formatTime(hoveredShot.startTime)} - {formatTime(hoveredShot.endTime)}
                    </span>
                 </div>
             </div>
           )}
       </div>

       {/* Export Button Section */}
       <div className="shrink-0 flex justify-center pb-2 gap-4">
            <Button 
                onClick={handleCopy} 
                disabled={isCopying || isExporting} 
                className="h-14 px-8 text-base font-semibold shadow-2xl bg-dash-card border border-dash-border text-dash-textHigh hover:bg-dash-cardHover transition-all hover:scale-105 active:scale-95"
            >
                {copySuccess ? (
                    <>
                        <Check className="mr-2 text-brand-success" size={20} />
                        {lang === 'zh' ? '已复制' : 'Copied'}
                    </>
                ) : (
                    <>
                        <Copy className="mr-2" size={20} />
                        {lang === 'zh' ? '复制图表' : 'Copy Image'}
                    </>
                )}
            </Button>
            <Button 
                onClick={handleExport} 
                disabled={isExporting || isCopying} 
                className="h-14 px-10 text-base font-semibold shadow-2xl bg-brand-accent hover:bg-brand-primary transition-all hover:scale-105 active:scale-95"
            >
                {isExporting ? (
                    <>
                        <Loader2 className="animate-spin mr-2" size={20} />
                        {lang === 'zh' ? '导出中...' : 'Exporting...'}
                    </>
                ) : (
                    <>
                        <Download className="mr-2" size={20} />
                        {lang === 'zh' ? '导出报告' : 'Export Report'}
                    </>
                )}
            </Button>
       </div>
    </div>
  );
};