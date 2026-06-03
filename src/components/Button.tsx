import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  icon?: React.ReactNode;
  iconRight?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  glow = false,
  icon,
  iconRight = false,
  className = '',
  ...props
}) => {
  const baseStyle = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 border border-indigo-500/20",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700/50",
    danger: "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 border border-rose-500/20",
    success: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 border border-emerald-500/20",
    outline: "bg-transparent hover:bg-white/5 text-slate-200 border border-white/10 hover:border-white/20",
    glass: "bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-md hover:border-white/20"
  };

  const sizes = {
    sm: "px-4 py-2 text-xs gap-1.5",
    md: "px-6 py-3 text-sm gap-2",
    lg: "px-8 py-4 text-base gap-2.5"
  };

  const glowStyle = glow && variant === 'primary' ? 'shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 
                   glow && variant === 'danger' ? 'shadow-[0_0_15px_rgba(244,63,94,0.4)]' :
                   glow && variant === 'success' ? 'shadow-[0_0_15px_rgba(16,185,129,0.4)]' : '';

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${glowStyle} ${className}`}
      {...props}
    >
      {!iconRight && icon && <span className="flex items-center">{icon}</span>}
      {children}
      {iconRight && icon && <span className="flex items-center">{icon}</span>}
    </button>
  );
};
