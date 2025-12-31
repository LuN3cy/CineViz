import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  ReferenceLine, AreaChart, Area, CartesianGrid, Cell
} from 'recharts';
import { AnalysisData, Language } from '../../types';
import { Button, GlassCard, downloadCsv } from '../ui/Components';
import { Timer, Scissors, Activity, Film, Download } from 'lucide-react';

interface RhythmChartsProps {
  data: AnalysisData;
  isDark: boolean;
  lang?: Language;
}

const STRINGS = {
  en: {
    pacing: "Pacing Analysis",
    aslDesc: "Average Shot Length",
    mslDesc: "Median Shot Length",
    totalShots: "Total Shots",
    cutsDetected: "Cuts Detected",
    totalDuration: "Total Duration",
    videoLength: "Video Length",
    shotDist: "Shot Duration Distribution",
    shotDistSub: "Individual shot lengths over sequence",
    rhythm: "Cutting Rhythm",
    rhythmSub: "Density of cuts over time"
  },
  zh: {
    pacing: "节奏分析 (Pacing)",
    aslDesc: "平均镜头时长 (ASL)",
    mslDesc: "中位镜头时长 (MSL)",
    totalShots: "镜头总数",
    cutsDetected: "检测到的剪辑点",
    totalDuration: "视频总时长",
    videoLength: "影片长度",
    shotDist: "镜头时长分布",
    shotDistSub: "全片独立镜头时长统计",
    rhythm: "剪辑密度 (Rhythm)",
    rhythmSub: "剪辑频率随时间变化趋势"
  }
};

export const RhythmCharts: React.FC<RhythmChartsProps> = ({ data, isDark, lang = 'en' }) => {
  const t = STRINGS[lang];
  const exportTitle = lang === 'zh' ? '导出 CSV' : 'Export CSV';
  const baseName = data.fileName.replace(/\./g, '_');

  const shotData = data.shots.map(s => ({
    id: s.id,
    duration: parseFloat(s.duration.toFixed(2)),
    color: s.dominantColor
  }));

  const densityData = data.cuttingDensity.map(d => ({
    time: parseFloat(d.time.toFixed(1)),
    density: d.density
  }));

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const chartTextColor = isDark ? '#9CA3AF' : '#6B7280';
  const gridColor = isDark ? '#1E1F24' : '#E5E7EB';
  const tooltipBg = isDark ? '#0F1014' : '#FFFFFF';
  const tooltipBorder = isDark ? '#1E1F24' : '#E5E7EB';
  const tooltipText = isDark ? '#fff' : '#111827';
  
  // New Theme Color
  const accentColor = '#0023AD'; 
  const aslColor = '#F59E0B'; // Amber/Orange
  const mslColor = '#10B981'; // Emerald/Green

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pb-32 custom-scroll pr-2">
      
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Combined ASL/MSL Panel */}
        <GlassCard className="flex flex-col justify-center" noPadding>
          <Button
            variant="icon"
            title={exportTitle}
            onClick={() => downloadCsv({
              filename: `${baseName}_pacing.csv`,
              rows: [{
                asl: data.asl,
                msl: data.msl,
                totalShots: data.shots.length,
                duration: data.duration
              }]
            })}
            className="absolute top-4 right-4 z-20 h-10 w-10"
          >
            <Download size={18} />
          </Button>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-dash-textHigh/5 border border-dash-textHigh/5">
                   <Activity size={16} className="text-brand-accent" />
                </div>
                <span className="text-sm font-medium text-dash-textHigh">{t.pacing}</span>
            </div>
            
            <div className="flex items-center justify-between gap-6">
                {/* ASL */}
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: aslColor }}></span>
                        <span className="text-xs text-dash-text font-mono">ASL</span>
                    </div>
                    <div className="text-3xl font-bold text-dash-textHigh tracking-tight">
                        {data.asl.toFixed(2)}<span className="text-sm text-dash-text font-normal ml-1">s</span>
                    </div>
                    <p className="text-[10px] text-dash-text/60 mt-1">{t.aslDesc}</p>
                </div>

                <div className="w-px h-12 bg-dash-border"></div>

                {/* MSL */}
                <div className="flex-1 text-right">
                     <div className="flex items-center justify-end gap-2 mb-1">
                        <span className="text-xs text-dash-text font-mono">MSL</span>
                        <span className="w-2 h-2 rounded-full" style={{ background: mslColor }}></span>
                    </div>
                    <div className="text-3xl font-bold text-dash-textHigh tracking-tight">
                        {data.msl.toFixed(2)}<span className="text-sm text-dash-text font-normal ml-1">s</span>
                    </div>
                    <p className="text-[10px] text-dash-text/60 mt-1">{t.mslDesc}</p>
                </div>
            </div>
          </div>
        </GlassCard>

        {/* Other Stats */}
        <StatCard 
          title={t.totalShots}
          value={data.shots.length.toString()}
          subValue={t.cutsDetected}
          icon={<Scissors className="text-brand-success" size={20} />}
          exportTitle={exportTitle}
          onExportCsv={() => downloadCsv({
            filename: `${baseName}_total_shots.csv`,
            rows: [{ totalShots: data.shots.length }]
          })}
        />
        <StatCard 
          title={t.totalDuration}
          value={formatTime(data.duration)}
          subValue={t.videoLength}
          icon={<Film className="text-blue-400" size={20} />}
          exportTitle={exportTitle}
          onExportCsv={() => downloadCsv({
            filename: `${baseName}_total_duration.csv`,
            rows: [{ duration: data.duration, durationFormatted: formatTime(data.duration) }]
          })}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shot Duration Histogram */}
        <GlassCard className="lg:col-span-2 h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-medium text-dash-textHigh">{t.shotDist}</h3>
              <p className="text-xs text-dash-text mt-1">{t.shotDistSub}</p>
            </div>
            
            {/* Chart Legend */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-4 text-xs">
                 <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 border-t-2 border-dashed" style={{ borderColor: aslColor }}></div>
                    <span className="text-dash-text">ASL</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 border-t-2 border-dashed" style={{ borderColor: mslColor }}></div>
                    <span className="text-dash-text">MSL</span>
                 </div>
                 <span className="px-2 py-1 rounded bg-brand-accent/10 text-brand-accent border border-brand-accent/20">Histogram</span>
              </div>
              <Button
                variant="icon"
                title={exportTitle}
                onClick={() => downloadCsv({
                  filename: `${baseName}_shots.csv`,
                  rows: data.shots.map((s) => ({
                    id: s.id,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    duration: s.duration,
                    dominantColor: s.dominantColor
                  }))
                })}
                className="h-10 w-10"
              >
                <Download size={18} />
              </Button>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={shotData} barGap={0} barCategoryGap={1}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="id" stroke={chartTextColor} fontSize={10} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke={chartTextColor} fontSize={10} tickLine={false} axisLine={false} dx={-10} />
              <Tooltip 
                cursor={{fill: gridColor}}
                contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', color: tooltipText }}
                itemStyle={{ color: tooltipText }}
              />
              <Bar dataKey="duration" radius={[2, 2, 0, 0]}>
                {shotData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.duration > data.asl ? accentColor : (isDark ? '#4B5563' : '#9CA3AF')} fillOpacity={entry.duration > data.asl ? 1 : 0.5} />
                ))}
              </Bar>
              {/* ASL Reference Line */}
              <ReferenceLine y={data.asl} stroke={aslColor} strokeDasharray="3 3" strokeWidth={2} />
              {/* MSL Reference Line */}
              <ReferenceLine y={data.msl} stroke={mslColor} strokeDasharray="3 3" strokeWidth={2} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Cutting Density Curve */}
        <GlassCard className="lg:col-span-1 h-[400px]">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-dash-textHigh">{t.rhythm}</h3>
              <p className="text-xs text-dash-text mt-1">{t.rhythmSub}</p>
            </div>
            <Button
              variant="icon"
              title={exportTitle}
              onClick={() => downloadCsv({
                filename: `${baseName}_cutting_density.csv`,
                rows: data.cuttingDensity.map((d) => ({
                  time: d.time,
                  density: d.density
                }))
              })}
              className="h-10 w-10"
            >
              <Download size={18} />
            </Button>
          </div>
          <ResponsiveContainer width="100%" height="80%">
            <AreaChart data={densityData}>
               <defs>
                <linearGradient id="colorDensity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A855F7" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#A855F7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="time" stroke={chartTextColor} fontSize={10} tickLine={false} axisLine={false} dy={10} tickFormatter={(val) => `${val.toFixed(0)}s`} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', color: tooltipText }} 
                itemStyle={{ color: tooltipText }}
              />
              <Area type="monotone" dataKey="density" stroke="#A855F7" fillOpacity={1} fill="url(#colorDensity)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>
    </div>
  );
};

const StatCard = ({
  title,
  value,
  subValue,
  icon,
  exportTitle,
  onExportCsv
}: {
  title: string;
  value: string;
  subValue: string;
  icon: React.ReactNode;
  exportTitle?: string;
  onExportCsv?: () => void;
}) => (
  <GlassCard className="flex flex-col gap-4" noPadding>
    <div className="p-5">
      <div className="flex justify-between items-start mb-2">
        <div className="p-2 rounded-lg bg-dash-textHigh/5 border border-dash-textHigh/5">
          {icon}
        </div>
        {onExportCsv && (
          <Button
            variant="icon"
            title={exportTitle}
            onClick={onExportCsv}
            className="h-9 w-9 p-2"
          >
            <Download size={16} />
          </Button>
        )}
      </div>
      <div>
        <div className="text-3xl font-bold text-dash-textHigh tracking-tight">{value}</div>
        <p className="text-xs text-dash-text mt-1">{title}</p>
      </div>
    </div>
    <div className="px-5 py-3 border-t border-dash-border bg-dash-textHigh/[0.02]">
      <p className="text-[10px] text-dash-text flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-brand-success"></span>
        {subValue}
      </p>
    </div>
  </GlassCard>
);
