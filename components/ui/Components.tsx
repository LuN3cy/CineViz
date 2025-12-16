import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FileVideo, X, Loader2 } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  active?: boolean;
  noPadding?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className, active, noPadding = false, ...props }) => {
  return (
    <div 
      className={cn(
        "relative rounded-[24px] overflow-hidden transition-all duration-300",
        "bg-dash-card bg-card-gradient shadow-2xl",
        active ? "border border-brand-accent/50 shadow-[0_0_30px_rgba(45,212,191,0.1)]" : "border border-dash-border hover:border-dash-border/80",
        className
      )}
      {...props}
    >
      <div className={cn("relative z-10 h-full w-full", !noPadding && "p-6")}>
        {children}
      </div>
    </div>
  );
};

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'icon' }> = ({ 
  children, className, variant = 'primary', ...props 
}) => {
  const baseStyles = "rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "px-6 py-3 bg-brand-accent text-white hover:bg-brand-accent/90 shadow-lg shadow-brand-accent/20 hover:shadow-brand-accent/40",
    secondary: "px-6 py-3 bg-dash-textHigh/5 hover:bg-dash-textHigh/10 border border-dash-textHigh/10 text-dash-textHigh",
    ghost: "px-4 py-2 bg-transparent hover:bg-dash-textHigh/5 text-dash-text hover:text-dash-textHigh",
    icon: "p-3 bg-dash-card border border-dash-border hover:border-brand-accent/50 hover:text-brand-accent text-dash-text"
  };

  return (
    <button className={cn(baseStyles, variants[variant], className)} {...props}>
      {children}
    </button>
  );
};

export const Loader: React.FC<{ progress?: number; fileName?: string; fileSize?: string; isDark?: boolean; onCancel?: () => void }> = ({ 
    progress = 0, 
    fileName = "video_file.mp4", 
    fileSize = "Calculating...",
    isDark = true,
    onCancel
}) => {
  return (
    <div className={cn(
        "relative w-full max-w-sm p-6 rounded-[24px] border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 ring-1",
        isDark 
            ? "bg-[#0B0E14] border-[#1E293B] ring-white/5" 
            : "bg-white border-gray-100 ring-black/5"
    )}>
        {/* Glow effects - Adapted for themes */}
        <div className={cn(
            "absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 blur-[80px] rounded-full -z-10",
            isDark ? "bg-brand-primary/10" : "bg-brand-primary/5"
        )}></div>
        <div className={cn(
            "absolute bottom-0 right-0 w-32 h-32 blur-[60px] rounded-full -z-10",
            isDark ? "bg-brand-accent/10" : "bg-brand-accent/5"
        )}></div>

        <div className="flex items-start gap-4 mb-8">
            {/* File Icon */}
            <div className={cn(
                "w-14 h-16 rounded-xl border flex flex-col items-center justify-center relative overflow-hidden group shadow-lg transition-colors",
                isDark 
                    ? "bg-gradient-to-br from-[#1E293B] to-[#0F172A] border-white/5" 
                    : "bg-gradient-to-br from-gray-50 to-white border-gray-200"
            )}>
                 <div className="absolute inset-0 bg-brand-accent/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <div className={cn(
                     "w-8 h-8 rounded border flex items-center justify-center mb-1 shadow-inner z-10",
                     isDark ? "bg-[#0B0E14] border-[#1E293B]" : "bg-white border-gray-200"
                 )}>
                    <span className="text-[10px] font-bold text-brand-accent">VID</span>
                 </div>
                 {/* Fold effect */}
                 <div className={cn(
                     "absolute top-0 right-0 w-4 h-4 translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-l",
                     isDark ? "bg-[#0B0E14] border-[#1E293B]" : "bg-white border-gray-200"
                 )}></div>
            </div>

            {/* Text Info */}
            <div className="flex-1 pt-0.5 min-w-0">
                <h3 className={cn(
                    "text-base font-medium tracking-tight truncate pr-2",
                    isDark ? "text-white" : "text-gray-900"
                )}>{fileName}</h3>
                <p className={cn(
                    "text-xs mt-1",
                    isDark ? "text-slate-400" : "text-gray-500"
                )}>{fileSize}</p>
            </div>
            
            {/* Close/Cancel Button */}
             <div 
                onClick={onCancel}
                className={cn(
                 "w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-colors z-20",
                 isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"
             )}>
                <X size={12} className={isDark ? "text-slate-400" : "text-gray-500"} />
             </div>
        </div>

        {/* Progress Section */}
        <div className="space-y-3">
             <div className="flex justify-between items-end">
                <span className={cn(
                    "text-sm flex items-center gap-2",
                    isDark ? "text-slate-400" : "text-gray-500"
                )}>
                    <Loader2 size={14} className="animate-spin text-brand-accent" />
                    Uploading ...
                </span>
                <span className={cn(
                    "text-xl font-light tracking-tight",
                    isDark ? "text-white" : "text-gray-900"
                )}>{Math.round(progress)} %</span>
             </div>
             
             {/* Progress Bar */}
             <div className={cn(
                 "h-1.5 w-full rounded-full overflow-hidden",
                 isDark ? "bg-[#1E293B]" : "bg-gray-100"
             )}>
                <div 
                    className="h-full bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary bg-[length:200%_100%] animate-progress rounded-full shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
             </div>
        </div>
    </div>
  );
};