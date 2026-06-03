import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'drop' | 'add' | 'keep' | 'improve' | 'brand';
  hoverable?: boolean;
  glow?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  hoverable = false,
  glow = false,
  padding = 'md',
  className = '',
  ...props
}) => {
  const baseStyle = "rounded-2xl border backdrop-blur-xl transition-all duration-300";
  
  const variants = {
    default: "bg-slate-900/40 border-white/5",
    brand: "bg-indigo-950/20 border-indigo-500/20 shadow-indigo-950/50",
    drop: "bg-rose-950/10 border-rose-500/20 shadow-rose-950/30",
    add: "bg-emerald-950/10 border-emerald-500/20 shadow-emerald-950/30",
    keep: "bg-amber-950/10 border-amber-500/20 shadow-amber-950/30",
    improve: "bg-cyan-950/10 border-cyan-500/20 shadow-cyan-950/30"
  };

  const glows = {
    default: glow ? "shadow-[0_0_15px_rgba(255,255,255,0.03)]" : "",
    brand: glow ? "shadow-[0_0_20px_rgba(99,102,241,0.15)]" : "",
    drop: glow ? "shadow-[0_0_20px_rgba(244,63,94,0.15)]" : "",
    add: glow ? "shadow-[0_0_20px_rgba(16,185,129,0.15)]" : "",
    keep: glow ? "shadow-[0_0_20px_rgba(245,158,11,0.15)]" : "",
    improve: glow ? "shadow-[0_0_20px_rgba(6,182,212,0.15)]" : ""
  };

  const hovers = hoverable ? {
    default: "hover:bg-slate-900/60 hover:border-white/10 hover:shadow-lg hover:translate-y-[-2px]",
    brand: "hover:bg-indigo-950/30 hover:border-indigo-500/30 hover:shadow-indigo-500/10 hover:shadow-lg hover:translate-y-[-2px]",
    drop: "hover:bg-rose-950/20 hover:border-rose-500/30 hover:shadow-rose-500/10 hover:shadow-lg hover:translate-y-[-2px]",
    add: "hover:bg-emerald-950/20 hover:border-emerald-500/30 hover:shadow-emerald-500/10 hover:shadow-lg hover:translate-y-[-2px]",
    keep: "hover:bg-amber-950/20 hover:border-amber-500/30 hover:shadow-amber-500/10 hover:shadow-lg hover:translate-y-[-2px]",
    improve: "hover:bg-cyan-950/20 hover:border-cyan-500/30 hover:shadow-cyan-500/10 hover:shadow-lg hover:translate-y-[-2px]"
  }[variant] : "";

  const paddings = {
    none: "",
    sm: "p-3",
    md: "p-5",
    lg: "p-8"
  };

  return (
    <div
      className={`${baseStyle} ${variants[variant]} ${glows[variant]} ${hovers} ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
