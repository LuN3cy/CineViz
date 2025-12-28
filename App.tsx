import React, { useState, useEffect, useRef } from 'react';
import { Upload, BarChart2, Eye, Fingerprint as FingerprintIcon, Sun, Moon, Languages, Phone, X, Info, Box, FileText, Film, HelpCircle, CircleHelp, Github, BookOpen } from 'lucide-react';
import { AnalysisData, ViewMode, Shot, Language } from './types';
import { processVideo } from './services/videoProcessor';
import { parseEDL } from './services/edlParser';
import { Button, GlassCard, Loader, cn } from './components/ui/Components';
import { RhythmCharts } from './components/charts/RhythmCharts';
import { VisualCharts } from './components/charts/VisualCharts';
import { ColorFingerprint } from './components/charts/ColorFingerprint';
import { AlgorithmInfoModal } from './components/AlgorithmInfoModal';

// --- Mock Data Generator for Background Preview ---
const generateMockData = (): AnalysisData => {
  const shots: Shot[] = [];
  // Muted, desaturated palette for the "blueprint" waiting effect
  const palette = [
    { color: '#5F7186', thumbnail: '' }, // Muted Slate
    { color: '#7E9988', thumbnail: '' }, // Sage
    { color: '#8D7B99', thumbnail: '' }, // Dusty Purple
    { color: '#A67C75', thumbnail: '' }, // Muted Coral
    { color: '#6B8E99', thumbnail: '' }, // Muted Cyan
    { color: '#8C8C8C', thumbnail: '' }  // Grey
  ];
  let time = 0;
  for (let i = 0; i < 50; i++) {
    const dur = Math.random() * 4 + 0.5;
    shots.push({
      id: i, startTime: time, endTime: time + dur, duration: dur,
      thumbnail: '', dominantColor: palette[Math.floor(Math.random() * palette.length)].color
    });
    time += dur;
  }
  return {
    fileName: "DEMO_PREVIEW.mp4",
    shots,
    frames: Array.from({ length: 100 }, (_, i) => ({
      time: i, hue: Math.random() * 360, saturation: Math.random() * 60, brightness: Math.random() * 80, hex: '#ffffff'
    })),
    duration: time,
    asl: 2.5,
    msl: 2.0,
    cuttingDensity: Array.from({ length: 50 }, (_, i) => ({ time: i, density: Math.random() * 5 })),
    palette,
    polarData: Array.from({ length: 100 }, (_, i) => ({
      time: i, hue: Math.random() * 360, saturation: Math.random() * 80, color: palette[Math.floor(Math.random() * palette.length)].color
    }))
  };
};

const HomeBackgroundPreview = ({ isDark, loading }: { isDark: boolean; loading?: boolean }) => {
  const mockData = React.useMemo(() => generateMockData(), []);
  
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 h-full w-full transform scale-95 origin-center">
          <div className="flex flex-col gap-8">
             <div className={cn(
               "h-[300px] rounded-2xl overflow-hidden p-4 transition-all duration-700 border-2",
               loading 
                ? "animate-scan-1 border-transparent" 
                : "opacity-10 grayscale border-dash-textHigh/20"
             )}>
                <RhythmCharts data={mockData} isDark={isDark} lang="en" />
             </div>
             <div className={cn(
               "h-[300px] rounded-2xl overflow-hidden p-4 transition-all duration-700 border-2",
               loading 
                ? "animate-scan-2 border-transparent" 
                : "opacity-10 grayscale border-dash-textHigh/20"
             )}>
                 <VisualCharts data={mockData} isDark={isDark} lang="en" />
             </div>
          </div>
          <div className={cn(
             "h-full rounded-2xl overflow-hidden flex items-center justify-center p-8 transition-all duration-700 border-2",
             loading 
                ? "animate-scan-3 border-transparent" 
                : "opacity-10 grayscale border-dash-textHigh/20"
           )}>
              <div className="scale-75 w-full h-full">
                <ColorFingerprint data={mockData} isDark={isDark} lang="en" animated={true} />
              </div>
          </div>
       </div>
       {/* Overlay Gradient to fade edges */}
       <div className="absolute inset-0 bg-gradient-to-t from-dash-bg via-transparent to-dash-bg"></div>
       <div className="absolute inset-0 bg-gradient-to-r from-dash-bg via-transparent to-dash-bg"></div>
    </div>
  );
};

// --- Localization Dictionary ---
const TRANS = {
  en: {
    uploadTitle: "Upload Video",
    uploadDesc: "MP4, MOV, WebM, MKV (Auto-optimized for large files)",
    new: "New",
    rhythm: "Rhythm",
    visual: "Visual",
    fingerprint: "Fingerprint",
    analysisActive: "Analysis Active",
    analysisProcessing: "Processing...",
    algoIntro: "Algorithm",
    docLink: "Docs",
    contactAuthor: "Contact",
    wechat: "WeChat",
    xiaohongshu: "Xiaohongshu",
    bilibili: "Bilibili",
    modeShort: "Short Video / Auto-Detect",
    modeShortDesc: "Best for videos < 30 min. Uses visual algorithm to detect cuts automatically.",
    modeMovie: "Movie / EDL Import",
    modeMovieDesc: "Best for feature films. Upload video + .edl file for 100% accurate cut detection.",
    dropVideo: "Drop Video Here",
    dropEdl: "Drop EDL Here",
    startAnalysis: "Start Analysis",
    edlHelp: "How to get EDL?",
    edlTooltip: "Export .edl from DaVinci Resolve or Premiere Pro after performing Scene Cut Detection."
  },
  zh: {
    uploadTitle: "上传视频",
    uploadDesc: "支持 MP4, MOV, WebM, MKV (大文件自动优化)",
    new: "新建",
    rhythm: "节奏",
    visual: "视觉",
    fingerprint: "指纹",
    analysisActive: "分析完成",
    analysisProcessing: "分析中...",
    algoIntro: "算法介绍",
    docLink: "说明文档",
    contactAuthor: "联系作者",
    wechat: "公众号",
    xiaohongshu: "小红书",
    bilibili: "Bilibili",
    modeShort: "短片 / 自动识别",
    modeShortDesc: "适合30分钟以内的短片。使用视觉算法自动识别镜头切分点。",
    modeMovie: "电影 / EDL 导入",
    modeMovieDesc: "适合长篇电影。需上传视频和.edl剪辑表，操作耗时更短、准确率更高。",
    dropVideo: "拖入视频文件",
    dropEdl: "拖入EDL文件",
    startAnalysis: "开始分析",
    edlHelp: "如何获取EDL?",
    edlTooltip: "在 DaVinci Resolve 或 Premiere Pro 中进行场景探测切分后导出 .edl 文件。"
  }
};


const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.UPLOAD);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [lang, setLang] = useState<Language>('zh');
  const [uploadFile, setUploadFile] = useState<{name: string, size: string} | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAlgoModal, setShowAlgoModal] = useState(false);
  
  // EDL Mode State
  const [edlFile, setEdlFile] = useState<File | null>(null);
  const [edlVideoFile, setEdlVideoFile] = useState<File | null>(null);

  const [isAlgoClosing, setIsAlgoClosing] = useState(false);
  const handleCloseAlgo = () => {
      setIsAlgoClosing(true);
      setTimeout(() => {
          setShowAlgoModal(false);
          setIsAlgoClosing(false);
      }, 300);
  };

  const [isContactClosing, setIsContactClosing] = useState(false);
  const handleCloseContact = () => {
      setIsContactClosing(true);
      setTimeout(() => {
          setShowContactModal(false);
          setIsContactClosing(false);
      }, 300);
  };
  
  const t = TRANS[lang];

  // Ref to cancel upload
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const edlVideoInputRef = useRef<HTMLInputElement>(null);
  const edlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // --- Handlers ---

  const startProcessing = async (file: File, edl: File | null) => {
      // Abort previous upload if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setProgress(0);
      setUploadFile({
        name: file.name,
        size: formatFileSize(file.size)
      });

      const fileSize = file.size;
      
      try {
        let edlCuts: number[] | undefined = undefined;
        
        // Parse EDL if present
        if (edl) {
            try {
                edlCuts = await parseEDL(edl);
                console.log("Parsed EDL Cuts:", edlCuts.length);
            } catch (e) {
                console.error("Failed to parse EDL", e);
                alert("EDL Parsing Failed. Proceeding with auto-detection.");
            }
        }

        // Pass signal to processVideo
        const result = await processVideo(file, (p) => {
            if (!controller.signal.aborted) {
                setProgress(p);
            }
        }, controller.signal, fileSize, edlCuts);
        
        setData(result);
        setView(ViewMode.RHYTHM);
      } catch (err: any) {
        if (err.name === 'AbortError') {
            console.log("Upload cancelled");
        } else {
            console.error(err);
            alert("Error processing video.");
        }
      } finally {
        // Only reset loading if this is still the active controller
        if (abortControllerRef.current === controller) {
            setLoading(false);
            setUploadFile(null);
            abortControllerRef.current = null;
            
            // Reset Inputs
            setEdlFile(null);
            setEdlVideoFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (edlVideoInputRef.current) edlVideoInputRef.current.value = '';
            if (edlInputRef.current) edlInputRef.current.value = '';
        }
      }
  };

  const handleAutoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        startProcessing(file, null);
    }
  };

  const handleEdlVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setEdlVideoFile(file);
  };

  const handleEdlFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setEdlFile(file);
  };

  const handleStartEdlAnalysis = () => {
      if (edlVideoFile && edlFile) {
          startProcessing(edlVideoFile, edlFile);
      }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
    }
    setLoading(false);
    setUploadFile(null);
    setProgress(0);
    
    setEdlFile(null);
    setEdlVideoFile(null);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (edlVideoInputRef.current) edlVideoInputRef.current.value = '';
    if (edlInputRef.current) edlInputRef.current.value = '';
  };

  const NavBtn = ({ icon, label, active, disabled, onClick }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center justify-center min-w-[90px] h-[70px] rounded-xl transition-all duration-300 gap-1.5",
        active ? "bg-brand-accent text-white shadow-lg shadow-brand-accent/20" : "text-dash-text hover:bg-dash-textHigh/5 hover:text-dash-textHigh",
        disabled && "opacity-30 cursor-not-allowed hover:bg-transparent"
      )}
    >
      {icon}
      <span className="text-xs font-medium tracking-wide">{label}</span>
    </button>
  );

  const Navbar = () => (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-700 delay-200">
      <div className="px-3 py-2 flex items-center gap-3 rounded-2xl bg-dash-card/90 backdrop-blur-xl border border-dash-border shadow-2xl">
        <NavBtn 
          icon={<Upload size={24} />} 
          label={t.new} 
          active={view === ViewMode.UPLOAD} 
          onClick={() => setView(ViewMode.UPLOAD)} 
        />
        <div className="w-[1px] h-10 bg-dash-border mx-1" />
        <NavBtn 
          icon={<BarChart2 size={24} />} 
          label={t.rhythm} 
          active={view === ViewMode.RHYTHM} 
          onClick={() => data && setView(ViewMode.RHYTHM)} 
          disabled={!data}
        />
        <NavBtn 
          icon={<Eye size={24} />} 
          label={t.visual} 
          active={view === ViewMode.VISUAL} 
          onClick={() => data && setView(ViewMode.VISUAL)} 
          disabled={!data}
        />
        <NavBtn 
          icon={<FingerprintIcon size={24} />} 
          label={t.fingerprint} 
          active={view === ViewMode.FINGERPRINT} 
          onClick={() => data && setView(ViewMode.FINGERPRINT)} 
          disabled={!data}
        />
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen w-full bg-dash-bg text-dash-textHigh font-sans overflow-hidden transition-colors duration-500">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-dash-card to-transparent pointer-events-none transition-colors duration-500" />
      <div className="fixed top-[-10%] right-[-5%] w-[40%] h-[40%] bg-brand-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-brand-accent/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="fixed top-0 w-full px-8 py-6 flex justify-between items-center z-40 bg-dash-bg/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 select-none">
           {/* Left: Brand Name - Adaptive Color & Tight Spacing */}
           <div className="text-dash-textHigh font-bold text-3xl tracking-tight drop-shadow-sm transition-colors duration-300">
             CINEVIZ
           </div>
           
           {/* Right: Chinese Title Stack */}
           <div className="flex flex-col items-start gap-1">
             <div className="bg-[#002FA7] text-white px-2 py-0.5 text-[10px] font-bold tracking-widest rounded-[2px]">
               计量电影学
             </div>
             <span className="text-dash-textHigh font-medium text-base tracking-wide leading-none">
               影片可视化
             </span>
           </div>
        </div>
        
        {/* Top Right Controls */}
        <div className="flex items-center gap-4">
           {loading ? (
             <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-dash-card border border-dash-border">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
                <span className="text-xs text-dash-text">{t.analysisProcessing}</span>
             </div>
           ) : data ? (
             <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-dash-card border border-dash-border">
                <div className="w-2 h-2 rounded-full bg-brand-success animate-pulse"></div>
                <span className="text-xs text-dash-text">{t.analysisActive}</span>
             </div>
           ) : null}
           <Button variant="icon" onClick={() => window.open('https://github.com/LuN3cy/CineViz', '_blank')} 
             className="rounded-full w-10 h-10 p-0 flex items-center justify-center"
           >
             <Github size={18} />
           </Button>
           <Button variant="icon" onClick={() => setShowContactModal(true)} className="rounded-full w-10 h-10 p-0 flex items-center justify-center">
             <CircleHelp size={18} />
           </Button>
           <Button variant="icon" onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="rounded-full w-10 h-10 p-0 flex items-center justify-center font-bold text-xs">
             {lang.toUpperCase()}
           </Button>
           <Button variant="icon" onClick={() => setIsDark(!isDark)} className="rounded-full w-10 h-10 p-0 flex items-center justify-center">
             {isDark ? <Sun size={18} /> : <Moon size={18} />}
           </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className={cn(
        "relative z-10 h-screen pt-32 pb-32 px-4 md:px-8 mx-auto transition-all duration-300",
        // Limit width for standard dashboard views, allow full width for UPLOAD (Background) and FINGERPRINT to adapt to wide screens
        (view === ViewMode.RHYTHM || view === ViewMode.VISUAL) ? "max-w-7xl" : "max-w-full"
      )}>
        
        {view === ViewMode.UPLOAD && (
          <>
            {/* Background Preview */}
            <HomeBackgroundPreview isDark={isDark} loading={loading} />
            
            <div className="h-full flex flex-col items-center justify-center animate-message-pop relative z-10">
              {loading ? (
                <Loader 
                  progress={progress} 
                  fileName={uploadFile?.name} 
                  fileSize={uploadFile?.size}
                  isDark={isDark}
                  onCancel={handleCancelUpload}
                />
              ) : (
                <div className="flex flex-col md:flex-row gap-8 items-stretch justify-center w-full max-w-4xl">
                  {/* Left Card: Short Video / Auto */}
                  <div className="flex-1 bg-gradient-to-b from-brand-accent/5 to-dash-card/80 backdrop-blur-xl border border-brand-accent/20 rounded-[32px] p-8 flex flex-col items-center justify-center text-center gap-6 hover:border-brand-accent/50 transition-all shadow-xl shadow-brand-accent/5">
                      <div className="p-4 bg-brand-accent/10 rounded-full text-brand-accent mb-2">
                          <Film size={40} />
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-dash-textHigh mb-2">{t.modeShort}</h3>
                          <p className="text-sm text-dash-text leading-relaxed max-w-[260px] mx-auto">{t.modeShortDesc}</p>
                      </div>
                      
                      <label className="group relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-dash-border rounded-2xl cursor-pointer hover:border-brand-accent/50 hover:bg-brand-accent/5 transition-all">
                          <div className="flex flex-col items-center gap-2 text-dash-text group-hover:text-brand-accent transition-colors">
                              <Upload size={24} />
                              <span className="text-sm font-medium">{t.dropVideo}</span>
                          </div>
                          <input 
                            type="file" 
                            accept="video/mp4,video/quicktime,video/webm,video/x-matroska" 
                            className="hidden" 
                            onChange={handleAutoUpload} 
                            ref={fileInputRef}
                          />
                      </label>
                  </div>

                  {/* Right Card: Movie / EDL */}
                  <div className="flex-1 bg-gradient-to-b from-brand-secondary/5 to-dash-card/80 backdrop-blur-xl border border-brand-secondary/20 rounded-[32px] p-8 flex flex-col items-center justify-center text-center gap-6 hover:border-brand-secondary/50 transition-all shadow-xl shadow-brand-secondary/5 relative overflow-hidden">
                      {/* EDL Badge */}
                      <div className="absolute top-4 right-4 group cursor-help">
                         <HelpCircle size={20} className="text-dash-text hover:text-brand-secondary transition-colors" />
                         <div className="absolute right-0 top-8 w-64 bg-black/90 text-white text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-left">
                            {t.edlTooltip}
                         </div>
                      </div>

                      <div className="p-4 bg-brand-secondary/10 rounded-full text-brand-secondary mb-2">
                          <FileText size={40} />
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-dash-textHigh mb-2">{t.modeMovie}</h3>
                          <p className="text-sm text-dash-text leading-relaxed max-w-[260px] mx-auto">{t.modeMovieDesc}</p>
                      </div>
                      
                      <div className="w-full space-y-3">
                          {/* Video Input */}
                          <label className={cn(
                              "flex items-center justify-between w-full px-4 py-3 border rounded-xl cursor-pointer transition-all",
                              edlVideoFile 
                                ? "bg-brand-secondary/10 border-brand-secondary text-brand-secondary" 
                                : "border-dash-border hover:border-dash-text/30 text-dash-text"
                          )}>
                              <span className="text-sm font-medium truncate max-w-[200px]">
                                  {edlVideoFile ? edlVideoFile.name : t.dropVideo}
                              </span>
                              {edlVideoFile ? <Film size={18} /> : <Upload size={18} />}
                              <input 
                                type="file" 
                                accept="video/mp4,video/quicktime,video/webm,video/x-matroska" 
                                className="hidden" 
                                onChange={handleEdlVideoUpload} 
                                ref={edlVideoInputRef}
                              />
                          </label>

                          {/* EDL Input */}
                          <label className={cn(
                              "flex items-center justify-between w-full px-4 py-3 border rounded-xl cursor-pointer transition-all",
                              edlFile 
                                ? "bg-brand-secondary/10 border-brand-secondary text-brand-secondary" 
                                : "border-dash-border hover:border-dash-text/30 text-dash-text"
                          )}>
                              <span className="text-sm font-medium truncate max-w-[200px]">
                                  {edlFile ? edlFile.name : t.dropEdl}
                              </span>
                              {edlFile ? <FileText size={18} /> : <Upload size={18} />}
                              <input 
                                type="file" 
                                accept=".edl,.txt" 
                                className="hidden" 
                                onChange={handleEdlFileUpload} 
                                ref={edlInputRef}
                              />
                          </label>
                      </div>

                      <Button 
                        onClick={handleStartEdlAnalysis}
                        disabled={!edlFile || !edlVideoFile}
                        className={cn(
                            "w-full py-6 text-base font-bold shadow-lg transition-all",
                            (!edlFile || !edlVideoFile) ? "opacity-50 cursor-not-allowed" : "bg-brand-secondary hover:bg-brand-secondary/80 text-white hover:scale-[1.02] active:scale-95"
                        )}
                      >
                          {t.startAnalysis}
                      </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {view === ViewMode.RHYTHM && data && (
          <div className="animate-message-pop h-full">
            <RhythmCharts data={data} isDark={isDark} lang={lang} />
          </div>
        )}

        {view === ViewMode.VISUAL && data && (
          <div className="animate-message-pop h-full">
            <VisualCharts data={data} isDark={isDark} lang={lang} />
          </div>
        )}

        {view === ViewMode.FINGERPRINT && data && (
          <div className="animate-message-pop h-full w-full p-2 lg:p-4">
             {/* Styled matching Visual Charts using GlassCard, but borderless */}
             <GlassCard className="h-full w-full flex flex-col p-2 lg:p-4 border-0">
                 <ColorFingerprint data={data} isDark={isDark} lang={lang} animated={true} />
             </GlassCard>
          </div>
        )}

      </main>

      <Navbar />

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 z-50 hidden md:flex items-center gap-3">
         <Button 
            variant="ghost" 
            onClick={() => setShowAlgoModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-dash-card/80 backdrop-blur-md border border-dash-border shadow-xl hover:bg-brand-primary/10 hover:border-brand-primary/50 transition-all group"
         >
            <Info size={18} className="text-dash-text group-hover:text-brand-primary" />
            <span className="text-sm font-medium text-dash-text group-hover:text-brand-primary">{t.algoIntro}</span>
         </Button>
         <Button 
            variant="ghost" 
            onClick={() => window.open('https://mp.weixin.qq.com/s/ARt6U27GO8xowhiGTxBPrQ', '_blank')}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-dash-card/80 backdrop-blur-md border border-dash-border shadow-xl hover:bg-brand-accent/10 hover:border-brand-accent/50 transition-all group"
         >
            <BookOpen size={18} className="text-dash-text group-hover:text-brand-accent" />
            <span className="text-sm font-medium text-dash-text group-hover:text-brand-accent">{t.docLink}</span>
         </Button>
      </div>

      {/* Algorithm Info Modal */}
      {showAlgoModal && (
        <AlgorithmInfoModal 
          onClose={handleCloseAlgo}
          isClosing={isAlgoClosing} 
          isDark={isDark} 
          lang={lang}
        />
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div className={cn(
            "fixed inset-0 z-[60] flex items-center justify-center p-4",
            isContactClosing ? "animate-fade-out" : "animate-fade-in"
        )}>
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={handleCloseContact}
          />
          
          {/* Modal Content */}
          <div className={cn(
              "relative z-10 w-full max-w-md font-['Poppins'] will-change-transform",
              isContactClosing ? "animate-message-pop-out" : "animate-message-pop"
          )}>
            <div className={cn(
              "relative overflow-hidden rounded-[24px] border shadow-2xl p-6 transition-colors",
              isDark 
                ? "bg-[#0d1117] border-[#30363d]" 
                : "bg-white border-gray-200"
            )}>
               {/* Header */}
               <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <Box size={24} className={isDark ? "text-white" : "text-gray-900"} />
                    <h3 className={cn("text-lg font-bold tracking-wide", isDark ? "text-white" : "text-gray-900")}>{t.contactAuthor}</h3>
                 </div>
                 <button 
                   onClick={handleCloseContact}
                   className={cn(
                     "transition-colors",
                     isDark ? "text-gray-400 hover:text-white" : "text-gray-400 hover:text-gray-600"
                   )}
                 >
                   <X size={20} />
                 </button>
               </div>

               {/* Content */}
               <div className="grid grid-cols-1 gap-4">
                  {/* Button 1: WeChat */}
                  <a 
                    href="https://mp.weixin.qq.com/s/sAIYq8gaezAumyIbGHiJ_w" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 group",
                        isDark 
                          ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-brand-accent/50" 
                          : "bg-gray-50 border-gray-100 hover:bg-gray-100 hover:border-brand-accent/30"
                    )}
                  >
                     <span className={cn("text-lg font-bold mb-1 group-hover:text-brand-accent transition-colors", isDark ? "text-white" : "text-gray-900")}>
                       LuN3cy的实验房
                     </span>
                     <span className={cn("text-xs font-light", isDark ? "text-gray-400" : "text-gray-500")}>
                       {t.wechat}
                     </span>
                  </a>

                  {/* Button 2: Xiaohongshu */}
                  <a 
                    href="https://www.xiaohongshu.com/user/profile/61bbb882000000001000e80d" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 group",
                        isDark 
                          ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-brand-secondary/50" 
                          : "bg-gray-50 border-gray-100 hover:bg-gray-100 hover:border-brand-secondary/30"
                    )}
                  >
                     <span className={cn("text-lg font-bold mb-1 group-hover:text-brand-secondary transition-colors", isDark ? "text-white" : "text-gray-900")}>
                       LuN3cy
                     </span>
                     <span className={cn("text-xs font-light", isDark ? "text-gray-400" : "text-gray-500")}>
                       {t.xiaohongshu}
                     </span>
                  </a>

                  {/* Button 3: Bilibili */}
                  <a 
                    href="https://b23.tv/i42oxgt" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 group",
                        isDark 
                          ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-[#FB7299]/50" 
                          : "bg-gray-50 border-gray-100 hover:bg-gray-100 hover:border-[#FB7299]/30"
                    )}
                  >
                     <span className={cn("text-lg font-bold mb-1 group-hover:text-[#FB7299] transition-colors", isDark ? "text-white" : "text-gray-900")}>
                       LuN3cy
                     </span>
                     <span className={cn("text-xs font-light", isDark ? "text-gray-400" : "text-gray-500")}>
                       {t.bilibili}
                     </span>
                  </a>
               </div>

               {/* Subtle Glow */}
               <div className="absolute top-[-20%] right-[-10%] w-[150px] h-[150px] bg-purple-500/10 blur-[60px] rounded-full pointer-events-none"></div>
               <div className="absolute bottom-[-20%] left-[-10%] w-[150px] h-[150px] bg-blue-500/10 blur-[60px] rounded-full pointer-events-none"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
