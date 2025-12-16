import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from 'recharts';
import { AnalysisData, PaletteItem, Language } from '../../types';
import { Button, GlassCard, Loader, cn } from '../ui/Components';
import { Palette, Sun, Contrast, MousePointer2 } from 'lucide-react';

interface VisualChartsProps {
  data: AnalysisData;
  isDark: boolean;
  lang?: Language;
}

const STRINGS = {
  en: {
    palette: "Dominant Palette",
    polar: "Color Polar Plot",
    polarSub: "Angle: Hue (0-360°) • Radius: Saturation (0-100)",
    dynamics: "Visual Dynamics",
    sat: "Saturation",
    bright: "Brightness",
    hover: "Hover color"
  },
  zh: {
    palette: "主色板 (Dominant Palette)",
    polar: "色彩极坐标图 (Color Polar Plot)",
    polarSub: "角度: 色相 (0-360°) • 半径: 饱和度 (0-100)",
    dynamics: "视觉动态 (Visual Dynamics)",
    sat: "饱和度",
    bright: "亮度",
    hover: "悬停查看色块"
  }
};

export const VisualCharts: React.FC<VisualChartsProps> = ({ data, isDark, lang = 'en' }) => {
  const [hoverPaletteItem, setHoverPaletteItem] = useState<PaletteItem | null>(null);
  const t = STRINGS[lang];

  // Downsample frames for line chart performance
  const lineData = data.frames.filter((_, i) => i % 5 === 0).map(f => ({
    time: parseFloat(f.time.toFixed(1)),
    saturation: f.saturation,
    brightness: f.brightness
  }));

  const chartTextColor = isDark ? '#9CA3AF' : '#6B7280';
  const gridColor = isDark ? '#1E1F24' : '#E5E7EB';
  const tooltipBg = isDark ? '#0F1014' : '#FFFFFF';
  const tooltipBorder = isDark ? '#1E1F24' : '#E5E7EB';
  const tooltipText = isDark ? '#fff' : '#111827';

  // Helper to calculate Polar Coordinates for Scatter Plot
  const polarToCartesian = (angle: number, radius: number, size: number) => {
    const r = (radius / 100) * (size / 2 - 20); // Scale radius (0-100) to fit
    const rad = (angle - 90) * (Math.PI / 180); // -90 to rotate so 0 is top (Red)
    return {
      x: size / 2 + r * Math.cos(rad),
      y: size / 2 + r * Math.sin(rad)
    };
  };

  const polarSize = 300;

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pb-32 custom-scroll pr-2">
      
      {/* Color Palette Row */}
      <GlassCard className="min-h-[220px] flex flex-col justify-center relative overflow-visible">
        <div className="flex items-center gap-2 mb-6">
            <Palette className="text-brand-secondary" size={20} />
            <h3 className="text-lg font-medium text-dash-textHigh">{t.palette}</h3>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            {/* Palette Strips - Adaptive Size based on Count */}
            <div className="flex flex-wrap gap-2 justify-center z-10 max-w-[60%]">
            {data.palette.map((item, idx) => {
                // Calculate dynamic size: Base 48px (w-12), shrink if many items
                // If > 10 items, reduce size. If > 20, reduce more.
                // Tailwind classes w-12=48px, w-8=32px, w-6=24px
                let sizeClass = "w-12 h-12 md:w-16 md:h-16"; // Default
                if (data.palette.length > 20) sizeClass = "w-6 h-6 md:w-8 md:h-8";
                else if (data.palette.length > 10) sizeClass = "w-8 h-8 md:w-10 md:h-10";
                
                return (
                  <div 
                    key={idx} 
                    className="group relative flex flex-col items-center cursor-pointer"
                    onMouseEnter={() => setHoverPaletteItem(item)}
                    onMouseLeave={() => setHoverPaletteItem(null)}
                  >
                    <div 
                      className={cn(
                        "rounded-full shadow-lg transition-transform duration-300 group-hover:scale-125 ring-2 ring-dash-border group-hover:ring-dash-textHigh/30 group-hover:z-50",
                        sizeClass
                      )}
                      style={{ backgroundColor: item.color }}
                    ></div>
                  </div>
                );
            })}
            </div>

            {/* Hover Preview Window */}
            <div className="h-32 w-48 bg-dash-bg rounded-xl border border-dash-border flex items-center justify-center overflow-hidden relative shadow-inner">
                {hoverPaletteItem ? (
                    <>
                        <img 
                            src={hoverPaletteItem.thumbnail} 
                            alt="Frame" 
                            className="w-full h-full object-cover" 
                        />
                        <div className="absolute bottom-0 left-0 w-full bg-black/60 p-1 text-center">
                            <span className="text-[10px] font-mono text-white uppercase">{hoverPaletteItem.color}</span>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center text-dash-text/40">
                        <MousePointer2 size={24} className="mb-2" />
                        <span className="text-xs">{t.hover}</span>
                    </div>
                )}
            </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Polar Scatter Plot */}
        <GlassCard className="lg:col-span-1 h-[400px]">
          <div className="flex flex-col items-center justify-center h-full w-full">
            <h3 className="text-lg font-medium text-dash-textHigh mb-2 text-center">{t.polar}</h3>
            <p className="text-[10px] text-dash-text mb-6 text-center">{t.polarSub}</p>
            
            <div className="relative w-[300px] h-[300px] flex-shrink-0">
              <svg width="100%" height="100%" viewBox={`0 0 ${polarSize} ${polarSize}`}>
                  {/* Background Circles */}
                  <circle cx={polarSize/2} cy={polarSize/2} r={polarSize/2 - 20} fill="none" stroke={gridColor} strokeWidth="1" />
                  <circle cx={polarSize/2} cy={polarSize/2} r={(polarSize/2 - 20) * 0.66} fill="none" stroke={gridColor} strokeWidth="1" strokeDasharray="4 4"/>
                  <circle cx={polarSize/2} cy={polarSize/2} r={(polarSize/2 - 20) * 0.33} fill="none" stroke={gridColor} strokeWidth="1" strokeDasharray="4 4"/>
                  
                  {/* Axis Lines */}
                  <line x1={polarSize/2} y1="20" x2={polarSize/2} y2={polarSize-20} stroke={gridColor} strokeWidth="1" />
                  <line x1="20" y1={polarSize/2} x2={polarSize-20} y2={polarSize/2} stroke={gridColor} strokeWidth="1" />

                  {/* Data Points */}
                  {data.polarData.map((point, i) => {
                      const pos = polarToCartesian(point.hue, point.saturation, polarSize);
                      return (
                          <circle 
                              key={i}
                              cx={pos.x}
                              cy={pos.y}
                              r={3 + (point.saturation/25)} // More saturated = slightly larger
                              fill={point.color}
                              opacity={0.8}
                              stroke={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}
                          />
                      );
                  })}
              </svg>
              <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] text-red-500 font-bold">0°</div>
              <div className="absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-cyan-500 font-bold">90°</div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-cyan-500 font-bold">180°</div>
              <div className="absolute top-1/2 left-2 -translate-y-1/2 text-[10px] text-blue-500 font-bold">270°</div>
            </div>
          </div>
        </GlassCard>

        {/* Visual Dynamics Curves */}
        <GlassCard className="lg:col-span-2 h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-dash-textHigh">{t.dynamics}</h3>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#A855F7]/10 border border-[#A855F7]/20 text-[#A855F7]">
                <Contrast size={12} /> {t.sat}
              </span>
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#FBBF24]/10 border border-[#FBBF24]/20 text-[#FBBF24]">
                <Sun size={12} /> {t.bright}
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="time" stroke={chartTextColor} tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => `${v}s`} dy={10} />
              <YAxis stroke={chartTextColor} tickLine={false} axisLine={false} fontSize={10} domain={[0, 100]} dx={-10} />
              <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', color: tooltipText }} />
              <Line type="monotone" dataKey="saturation" stroke="#A855F7" strokeWidth={2} dot={false} activeDot={{r: 4, strokeWidth: 0}} />
              <Line type="monotone" dataKey="brightness" stroke="#FBBF24" strokeWidth={2} dot={false} activeDot={{r: 4, strokeWidth: 0}} />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>
    </div>
  );
};