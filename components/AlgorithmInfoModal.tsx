import React, { useState, useEffect, useRef } from 'react';
import { cn } from './ui/Components';
import { X, Activity, Eye } from 'lucide-react';
import { createPortal } from 'react-dom';

interface AlgorithmInfoModalProps {
  onClose: () => void;
  isClosing?: boolean;
  isDark: boolean;
  lang?: 'en' | 'zh';
}

const RESOURCES = {
  en: {
    title: "CINEVIZ Algorithm",
    subtitle: "Computer Vision + Color Theory Analysis Model",
    partA: "Part A: Rhythm Analysis",
    partASub: "Time & Pacing",
    partADesc: "Measures the temporal structure and editing pace of the film. Like the beat of music, ASL reflects the base breathing rate, while Cut Density depicts narrative intensity.",
    partB: "Part B: Visual Construction",
    partBSub: "Space & Color",
    partBDesc: "Analyzes color composition and lighting intensity. Extracts 'visual genes' via HSB model and reconstructs the director's visual language through saturation and brightness distribution.",
    tags: {
      asl: "Average Shot (ASL)",
      msl: "Median Shot (MSL)",
      cpm: "Cut Density",
      hist: "Histogram Diff",
      bright: "Brightness",
      sat: "Saturation",
      hue: "Hue",
      dom: "Dominant Color"
    },
    vis: {
      hist: "Histogram Detection Vis",
      frame: "Frame Δ",
      hsb: "HSB Spectrum",
      color: "Color Space"
    },
    tooltipHeader: "Algorithm Detail",
    tooltips: {
        asl: "Calculation: Total Duration / Number of Shots. Shot boundaries are detected using RGB Histogram Difference (Threshold > 0.3). Lower values indicate faster pacing.",
        msl: "Calculation: The median value of all shot durations. Unlike the mean (ASL), it provides a robust pacing metric that is less affected by extreme outliers (e.g., a single very long take).",
        cpm: "Algorithm: A rolling window function calculates the Cuts Per Minute (CPM). It quantifies the local frequency of editing events to visualize pacing changes over time.",
        hist: "Algorithm: Calculates the Euclidean distance between the normalized RGB histograms of consecutive frames (t vs t-1). A peak above the threshold signifies a scene cut.",
        bright: "Mapping: Mapped to the Y-Axis in Line Charts. Calculated as Max(R, G, B) / 255 for each frame, representing the peak intensity of the pixel channels.",
        sat: "Mapping: Mapped to the Radius (r) in the Color Polar Plot. Value = (Max(RGB) - Min(RGB)) / Max(RGB), representing color purity in HSV space.",
        hue: "Mapping: Mapped to the Angle (θ) in the Color Polar Plot. Represents the dominant wavelength (0-360°) derived from RGB-to-HSV conversion (Red=0°, Green=120°, Blue=240°).",
        dom: "Algorithm: Uses K-Means Clustering (k=5) on the pixel data of sampled frames. Returns the centroid of the largest cluster, excluding low-saturation background noise."
    }
  },
  zh: {
    title: "CINEVIZ 算法",
    subtitle: "计算机视觉 + 色彩理论分析模型",
    partA: "Part A: 节奏分析",
    partASub: "时间与配速",
    partADesc: "衡量影片的时间结构与剪辑速率。如同音乐的节拍，ASL (平均镜头时长) 反映了影片的基础呼吸频率，而 Cut Density (剪辑密度) 则描绘了叙事的高潮起伏。",
    partB: "Part B: 视觉构建",
    partBSub: "空间与色彩",
    partBDesc: "解析画面的色彩构成与光影强度。通过 HSB 模型提取每一帧的“视觉基因”，并计算色彩饱和度与亮度的分布，重构导演的视觉语言。",
    tags: {
      asl: "平均镜头 (ASL)",
      msl: "中位镜头 (MSL)",
      cpm: "剪辑密度",
      hist: "直方图差异",
      bright: "亮度 (Brightness)",
      sat: "饱和度 (Saturation)",
      hue: "色相 (Hue)",
      dom: "主导色"
    },
    vis: {
      hist: "直方图检测可视化",
      frame: "帧差异",
      hsb: "HSB 色谱",
      color: "色彩空间"
    },
    tooltipHeader: "算法详细",
    tooltips: {
        asl: "算法公式：总时长 / 镜头数。镜头边界通过 RGB 直方图差异检测（阈值 > 0.3）。数值越低表示剪辑节奏越快。",
        msl: "算法公式：所有镜头时长的中位数。相比平均值 (ASL)，中位数更能抵抗极端长镜头 (Outliers) 的干扰，反映真实的基准节奏。",
        cpm: "算法逻辑：使用滚动窗口函数计算每分钟剪辑数 (CPM)。量化编辑事件的局部频率，以可视化时间轴上的节奏密度变化。",
        hist: "算法逻辑：计算相邻帧 (t 与 t-1) 归一化 RGB 直方图之间的欧几里得距离。波峰超过阈值即判定为镜头切换。",
        bright: "图表映射：映射至折线图 Y 轴。计算每帧 Max(R, G, B) / 255，代表像素通道的峰值强度。",
        sat: "图表映射：映射至色彩极坐标图的半径 (r)。公式为 (Max(RGB) - Min(RGB)) / Max(RGB)，代表 HSV 空间下的色彩纯度。",
        hue: "图表映射：映射至色彩极坐标图的角度 (θ)。代表从 RGB 转 HSV 导出的主波长 (0-360°)，其中红=0°，绿=120°，蓝=240°。",
        dom: "算法逻辑：对采样帧的像素数据进行 K-Means 聚类 (k=5)。返回最大簇的质心颜色，并自动排除低饱和度的背景噪点。"
    }
  }
};

type TooltipKeys = keyof typeof RESOURCES['en']['tooltips'];

export const AlgorithmInfoModal: React.FC<AlgorithmInfoModalProps> = ({ onClose, isClosing, isDark, lang = 'en' }) => {
  const t = RESOURCES[lang === 'zh' ? 'zh' : 'en'];
  const [tooltipData, setTooltipData] = useState<{ visible: boolean; text: string; x: number; y: number } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Internal Components ---

  const MetricTag = ({ label, value, descKey, colorClass }: { label: string, value: string, descKey: TooltipKeys, colorClass?: string }) => {
    const ref = useRef<HTMLDivElement>(null);

    const handleMouseEnter = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setTooltipData({
          visible: true,
          text: t.tooltips[descKey],
          x: rect.left + rect.width / 2,
          y: rect.top
        });
      }
    };

    const handleMouseLeave = () => {
      timerRef.current = setTimeout(() => {
        setTooltipData(null);
      }, 100);
    };

    return (
      <div 
        ref={ref}
        className={cn(
          "relative flex flex-col justify-center px-4 py-3 rounded-lg border transition-all cursor-help group",
          isDark 
            ? "bg-[#161b22] border-[#30363d] hover:border-[#8b949e]" 
            : "bg-gray-50 border-gray-200 hover:border-gray-300",
          colorClass
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span className={cn("text-xs font-mono opacity-60 mb-1", isDark ? "text-gray-400" : "text-gray-500")}>{label}</span>
        <span className={cn("text-sm font-bold tracking-wide", isDark ? "text-gray-200" : "text-gray-800")}>{value}</span>
      </div>
    );
  };

  const SectionCard = ({ 
    title, 
    subtitle, 
    icon, 
    children 
  }: { 
    title: string, 
    subtitle: string, 
    icon: React.ReactNode, 
    children: React.ReactNode 
  }) => {
    
    return (
      <div className="flex flex-col h-full font-['Poppins']">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <h3 className={cn("text-lg font-bold tracking-tight flex items-center gap-2", isDark ? "text-white" : "text-gray-900")}>
            <span className={cn("bg-brand-accent", "w-1 h-5 rounded-full inline-block")}></span>
            {title}
          </h3>
          <span className={cn("text-xs px-2 py-0.5 rounded border font-mono bg-brand-accent/10 text-brand-accent border-brand-accent/20")}>
            {subtitle}
          </span>
        </div>

        {/* Card Body */}
        <div className={cn(
          "relative flex-1 p-6 rounded-xl border transition-all group overflow-hidden",
          isDark 
            ? "bg-[#0d1117] border-[#30363d]" 
            : "bg-white border-gray-200 shadow-sm"
        )}>
          {/* Watermark Icon */}
          <div className="absolute top-4 right-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none scale-150">
             {icon}
          </div>

          {children}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8 overflow-hidden font-sans",
        isClosing ? "animate-fade-out" : "animate-fade-in"
      )}>
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Main Modal Container */}
        <div className={cn(
          "relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden border will-change-transform",
          isClosing ? "animate-message-pop-out" : "animate-message-pop",
          isDark ? "bg-[#010409] border-[#30363d]" : "bg-[#f6f8fa] border-gray-200"
        )}>
          
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-dashed border-opacity-20 border-gray-500">
            <div>
              <h2 className={cn("text-2xl font-black tracking-tight flex items-center gap-2", isDark ? "text-white" : "text-gray-900")}>
                {t.title} <span className="text-xs font-normal opacity-50 border px-1.5 rounded ml-1 font-['Poppins']">beta</span>
              </h2>
              <p className={cn("text-xs font-mono mt-1 font-['Poppins']", isDark ? "text-gray-500" : "text-gray-500")}>
                {t.subtitle}
              </p>
            </div>
            <button 
              onClick={onClose}
              className={cn(
                "p-2 rounded-full transition-colors",
                isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-200 text-gray-600"
              )}
            >
              <X size={24} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            
            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
              
              {/* Part A: Rhythm */}
              <SectionCard 
                title={t.partA}
                subtitle={t.partASub}
                icon={<Activity size={120} />}
              >
                <p className={cn("text-sm leading-relaxed mb-6 font-['Poppins']", isDark ? "text-gray-400" : "text-gray-600")}>
                  {t.partADesc}
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  <MetricTag 
                    label={t.tags.asl}
                    value="TotalDur / Shots" 
                    colorClass={isDark ? "text-brand-accent" : "text-brand-accent"}
                    descKey="asl"
                  />
                  <MetricTag 
                    label={t.tags.msl}
                    value="Median(Durations)" 
                    descKey="msl"
                  />
                  <MetricTag 
                    label={t.tags.cpm}
                    value="Cuts / Minute" 
                    descKey="cpm"
                  />
                  <MetricTag 
                    label={t.tags.hist}
                    value="RGB Delta > Threshold" 
                    descKey="hist"
                  />
                </div>

                <div className="mt-6 pt-4 border-t border-dashed border-gray-700/30 font-['Poppins']">
                   <div className="flex items-center justify-between text-xs font-mono text-gray-500 mb-2">
                      <span>{t.vis.hist}</span>
                      <span>{t.vis.frame}</span>
                   </div>
                   <div className="h-8 flex items-end justify-between gap-0.5 opacity-60">
                      {[40, 20, 60, 30, 80, 10, 50, 90, 20, 70, 15, 60].map((h, i) => (
                        <div key={i} className="w-full bg-brand-accent/50 rounded-t-sm" style={{ height: `${h}%` }}></div>
                      ))}
                   </div>
                </div>
              </SectionCard>

              {/* Part B: Visual */}
              <SectionCard 
                title={t.partB}
                subtitle={t.partBSub}
                icon={<Eye size={120} />}
              >
                <p className={cn("text-sm leading-relaxed mb-6 font-['Poppins']", isDark ? "text-gray-400" : "text-gray-600")}>
                  {t.partBDesc}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <MetricTag 
                    label={t.tags.bright}
                    value="Max(R, G, B)" 
                    colorClass={isDark ? "text-brand-accent" : "text-brand-accent"}
                    descKey="bright"
                  />
                  <MetricTag 
                    label={t.tags.sat}
                    value="(Max - Min) / Max" 
                    descKey="sat"
                  />
                  <MetricTag 
                    label={t.tags.hue}
                    value="Angle(0-360°)" 
                    descKey="hue"
                  />
                  <MetricTag 
                    label={t.tags.dom}
                    value="K-Means Clustering" 
                    descKey="dom"
                  />
                </div>

                 <div className="mt-6 pt-4 border-t border-dashed border-gray-700/30 font-['Poppins']">
                   <div className="flex items-center justify-between text-xs font-mono text-gray-500 mb-2">
                      <span>{t.vis.hsb}</span>
                      <span>{t.vis.color}</span>
                   </div>
                   <div className="flex h-8 rounded-md overflow-hidden opacity-80">
                      <div className="flex-1 bg-gradient-to-r from-red-500 via-green-500 to-blue-500"></div>
                      <div className="w-1 bg-black/20"></div>
                      <div className="flex-1 bg-gradient-to-r from-black to-white"></div>
                   </div>
                </div>
              </SectionCard>
            </div>
            
          </div>
        </div>
      </div>

      {/* Global Tooltip Portal */}
      {tooltipData && createPortal(
        <div 
          className={cn(
            "fixed z-[9999] w-72 p-4 rounded-xl shadow-2xl border text-xs leading-relaxed animate-in fade-in zoom-in-95 duration-200 pointer-events-none font-sans",
            isDark 
              ? "bg-[#161b22] border-[#30363d] text-gray-300 shadow-[0_0_50px_rgba(0,0,0,0.5)]" 
              : "bg-white border-gray-200 text-gray-600 shadow-xl"
          )}
          style={{
            left: tooltipData.x,
            top: tooltipData.y,
            transform: 'translate(-50%, -100%) translateY(-12px)'
          }}
        >
          <div className="font-semibold mb-1 text-brand-accent">{t.tooltipHeader}</div>
          {tooltipData.text}
          
          {/* Arrow */}
          <div className={cn(
            "absolute top-full left-1/2 -translate-x-1/2 -mt-px border-8 border-transparent",
            isDark ? "border-t-[#161b22]" : "border-t-white"
          )}></div>
        </div>,
        document.body
      )}
    </>
  );
};
