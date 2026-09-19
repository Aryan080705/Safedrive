import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Shield, ShieldAlert, Video, Sliders, Volume2, VolumeX, Lock, Film, Layers, MapPin, Bike, PhoneCall, Activity, Brain, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AppMode, RiskTier } from '../types';

interface HeaderProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isCameraActive: boolean;
  isMuted: boolean;
  toggleMute: () => void;
  tier: RiskTier;
  isAudioUnlocked?: boolean;
  audioStatus?: 'ACTIVE' | 'PERMISSION_REQUIRED' | 'MUTED';
  enableSafetyAudio?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  setMode,
  isCameraActive,
  isMuted,
  toggleMute,
  tier,
  audioStatus,
  enableSafetyAudio,
}) => {
  const navItems: { id: AppMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'OVERVIEW', label: 'Overview', icon: Shield },
    { id: 'DRIVER_MONITOR', label: 'GuardianDrive', icon: Video },
    { id: 'ROAD_VIDEO', label: 'CrashCam AI', icon: Film },
    { id: 'BLACKSPOT_MAP', label: 'Blackspot GIS', icon: MapPin },
    { id: 'SAFERIDER', label: 'SafeRider', icon: Bike },
    { id: 'SOS_DISPATCH', label: 'SOS-Dispatch', icon: PhoneCall },
    { id: 'RISK_MEMORY', label: 'Risk Memory', icon: Brain },
    { id: 'SAFETY_FUSION', label: 'Fusion', icon: Layers },
    { id: 'DEMO_SIMULATION', label: 'Demo Sim', icon: Sliders },
  ];

  // Module Rail Scroll Refs & State
  const railRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);

  // Check scroll position and update fade/arrow states
  const checkScrollability = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  useEffect(() => {
    checkScrollability();
    const el = railRef.current;
    if (!el) return;

    const handleResize = () => checkScrollability();
    window.addEventListener('resize', handleResize);
    el.addEventListener('scroll', checkScrollability, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      el.removeEventListener('scroll', checkScrollability);
    };
  }, [checkScrollability]);

  // Smooth scroll left/right triggers
  const handleScroll = (direction: 'left' | 'right') => {
    const el = railRef.current;
    if (!el) return;
    const scrollAmount = Math.max(180, el.clientWidth * 0.45);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Convert vertical mouse wheel to horizontal rail scrolling when hovered
  const handleWheel = (e: React.WheelEvent) => {
    const el = railRef.current;
    if (!el) return;
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY) && el.scrollWidth > el.clientWidth) {
      el.scrollLeft += e.deltaY;
    }
  };

  // Mouse Drag-to-Scroll implementation
  const isDraggingRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const scrollLeftRef = useRef<number>(0);
  const hasDraggedRef = useRef<boolean>(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = railRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const el = railRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.3;
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
    }
    el.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  return (
    <header className="w-full bg-[#12160F]/95 backdrop-blur-xl border-b border-white/[0.08] px-3 sm:px-4 lg:px-6 py-2 sticky top-0 z-40 shadow-lg select-none">
      <div className="w-full max-w-[1740px] mx-auto flex items-center justify-between gap-3 lg:gap-5 min-h-[44px]">
        {/* ZONE 1 — BRAND (Fixed / non-shrinking) */}
        <div className="flex-shrink-0 flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center border transition-all duration-200 flex-shrink-0 ${
              tier === 'CRITICAL'
                ? 'bg-[#D94B45]/20 border-[#D94B45]/60 text-[#D94B45] shadow-[0_0_15px_rgba(217,75,69,0.35)]'
                : 'bg-[#181D14] border-white/[0.08] text-[#B8892D] shadow-sm'
            }`}>
              {tier === 'CRITICAL' ? (
                <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-[#D94B45] animate-alert-pulse" />
              ) : (
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-[#B8892D]" />
              )}
              <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-[#12160F] ${
                tier === 'CRITICAL' ? 'bg-[#D94B45] animate-ping' : 'bg-[#5D9B64]'
              }`} />
            </div>

            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black tracking-tight text-[#F5EFE3] whitespace-nowrap">
                  RoadGuard AI
                </span>
                <span className="hidden sm:inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#4F5B2A]/40 text-[#D8C9A8] border border-[#4F5B2A]/60 tracking-wider whitespace-nowrap">
                  TECHNEXA 2026
                </span>
              </div>
              <p className="hidden md:block text-[10.5px] text-[#A8AA9B] m-0 font-medium tracking-normal whitespace-nowrap">
                Video-Based Proactive Road Safety &amp; ADAS Telemetry
              </p>
            </div>
          </div>
        </div>

        {/* Subtle Vertical Separator 1 (Hidden on small screens) */}
        <div className="hidden xl:block h-6 w-px bg-white/[0.08] flex-shrink-0" />

        {/* ZONE 2 — MODULE RAIL (Flexible center region with smooth horizontal scrolling & edge fades) */}
        <div className="flex-1 min-w-0 relative flex items-center group/rail px-1">
          {/* Left Arrow Control */}
          {canScrollLeft && (
            <button
              onClick={() => handleScroll('left')}
              aria-label="Previous modules"
              className="absolute left-0 z-20 w-6 h-7 rounded-md bg-[#12160F]/95 hover:bg-[#20261A] text-[#B8892D] border border-white/[0.1] shadow-md flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm -translate-x-1"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Left Subtle Edge Fade */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#12160F] to-transparent pointer-events-none z-10 transition-opacity duration-200 ${
              canScrollLeft ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Center Scrollable Nav Container */}
          <div
            ref={railRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className="w-full flex items-center overflow-x-auto scrollbar-none py-1 px-1 cursor-grab active:cursor-grabbing scroll-smooth"
          >
            <nav className="flex items-center rounded-xl bg-[#0C0F0A] p-1 border border-white/[0.08] text-xs font-medium gap-1 shadow-inner flex-nowrap min-w-max">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = mode === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (!hasDraggedRef.current) {
                        setMode(item.id);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap text-xs flex-shrink-0 ${
                      isActive
                        ? 'bg-[#4F5B2A]/40 text-[#B8892D] border border-[#B8892D]/40 shadow-sm font-bold'
                        : 'text-[#A8AA9B] hover:text-[#F5EFE3] hover:bg-[#181D14] border border-transparent'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-[#B8892D]' : 'text-[#777C6F]'}`} />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Subtle Edge Fade */}
          <div
            className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#12160F] to-transparent pointer-events-none z-10 transition-opacity duration-200 ${
              canScrollRight ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Right Arrow Control */}
          {canScrollRight && (
            <button
              onClick={() => handleScroll('right')}
              aria-label="Next modules"
              className="absolute right-0 z-20 w-6 h-7 rounded-md bg-[#12160F]/95 hover:bg-[#20261A] text-[#B8892D] border border-white/[0.1] shadow-md flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm translate-x-1"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Subtle Vertical Separator 2 (Hidden on small screens) */}
        <div className="hidden xl:block h-6 w-px bg-white/[0.08] flex-shrink-0" />

        {/* ZONE 3 — SYSTEM ACTIONS (Fixed / non-shrinking width, stays fully visible) */}
        <div className="flex-shrink-0 flex items-center gap-2 text-xs">
          {/* Edge Privacy Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0C0F0A] border border-white/[0.08] text-[#A8AA9B] font-mono text-[11px] whitespace-nowrap">
            <Lock className="w-3 h-3 text-[#5D9B64] flex-shrink-0" />
            <span>LOCAL INFERENCE</span>
          </div>

          {/* Live Subsystem Indicator */}
          {mode === 'DEMO_SIMULATION' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#B8892D]/15 border border-[#B8892D]/40 text-[#B8892D] font-mono text-[11px] whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B8892D] animate-ping flex-shrink-0" />
              <span>SIMULATION</span>
            </div>
          ) : mode === 'DRIVER_MONITOR' ? (
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono text-[11px] whitespace-nowrap ${
              isCameraActive
                ? 'bg-[#0C0F0A] border-white/[0.08] text-[#5D9B64]'
                : 'bg-[#0C0F0A] border-white/[0.08] text-[#777C6F]'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCameraActive ? 'bg-[#5D9B64] animate-pulse' : 'bg-[#777C6F]'}`} />
              <span>{isCameraActive ? 'DRIVER CAM ON' : 'CAM STANDBY'}</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0C0F0A] border border-white/[0.08] text-[#A8AA9B] font-mono text-[11px] whitespace-nowrap">
              <Activity className="w-3 h-3 text-[#5D9B64] flex-shrink-0" />
              <span>RADAR VISION</span>
            </div>
          )}

          {/* Safety Audio Autoplay Unlock */}
          {audioStatus === 'PERMISSION_REQUIRED' && enableSafetyAudio ? (
            <button
              onClick={enableSafetyAudio}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#B8892D] hover:bg-[#D4A84D] text-[#0C0F0A] border border-[#B8892D] transition-all font-bold animate-alert-pulse cursor-pointer text-[11px] shadow-sm whitespace-nowrap"
              title="Browser blocked autoplay audio. Click to unlock safety alert sounds & speech"
            >
              <Volume2 className="w-3.5 h-3.5 text-[#0C0F0A] flex-shrink-0" />
              <span>ENABLE AUDIO</span>
            </button>
          ) : audioStatus === 'ACTIVE' ? (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0C0F0A] border border-white/[0.08] text-[#5D9B64] font-mono text-[11px] whitespace-nowrap">
              <Volume2 className="w-3.5 h-3.5 text-[#5D9B64] flex-shrink-0" />
              <span>VOICE ON</span>
            </div>
          ) : null}

          {/* Audio Mute Toggle Button */}
          <button
            onClick={toggleMute}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer text-[11px] font-mono whitespace-nowrap ${
              isMuted
                ? 'bg-[#D94B45]/20 border-[#D94B45]/40 text-[#D94B45] hover:bg-[#D94B45]/30'
                : 'bg-[#0C0F0A] border-white/[0.08] text-[#A8AA9B] hover:bg-[#181D14] hover:text-[#F5EFE3]'
            }`}
            title={isMuted ? 'Alert audio is muted' : 'Alert audio is active'}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-[#D94B45] flex-shrink-0" />
                <span>MUTED</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#A8AA9B] flex-shrink-0" />
                <span>SOUND</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
