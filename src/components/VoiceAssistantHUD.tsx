import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  X,
  Lock,
  PauseCircle,
  AlertCircle,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import type { VoiceAssistantTelemetry } from '../types';
import { VoiceResponseEngine } from '../services/voiceResponseEngine';

interface VoiceAssistantHUDProps {
  telemetry: VoiceAssistantTelemetry;
  onDismiss: () => void;
  isSpeechSupported: boolean;
  onTriggerChat?: () => void;
  onTriggerDemoChat?: () => void;
  onSubmitText?: (text: string) => void;
  onToggleMic?: () => void;
}

export const VoiceAssistantHUD: React.FC<VoiceAssistantHUDProps> = ({
  telemetry,
  onDismiss,
  isSpeechSupported,
  onTriggerChat,
  onTriggerDemoChat,
  onSubmitText,
  onToggleMic,
}) => {
  const {
    state,
    micStatus,
    transcript,
    interimTranscript,
    lastAiSpeech,
    sessionContext,
    isPausedForSafety,
    errorMessage,
    language = 'ENGLISH',
  } = telemetry;

  const [showHelp, setShowHelp] = useState(false);

  const isConversing = state !== 'IDLE';
  const quickSuggestions = VoiceResponseEngine.getQuickSuggestions(state, language);

  const handleChipClick = (chip: string) => {
    if (onSubmitText) {
      // Remove any emojis for cleaner evaluation
      const cleanChip = chip.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}]/gu, '').trim();
      onSubmitText(cleanChip || chip);
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 pointer-events-none sticky bottom-3 z-50">
      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3 pointer-events-auto">
        {/* ========================================================================= */}
        {/* ACTIVE CONVERSATION CARD */}
        {/* ========================================================================= */}
        {isConversing ? (
          <div className="w-full sm:max-w-lg bg-[#0b0c10]/95 backdrop-blur-2xl border border-zinc-700/80 rounded-2xl p-4 shadow-[0_12px_45px_rgba(0,0,0,0.85)] transition-all animate-in fade-in slide-in-from-bottom-3 duration-200">
            {/* Header: Title + Status + Controls */}
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/70">
              <div className="flex items-center gap-2.5">
                {/* Glowing Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all ${
                    isPausedForSafety
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                      : micStatus === 'LISTENING'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                      : 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  }`}
                >
                  {isPausedForSafety ? (
                    <PauseCircle className="w-4 h-4 animate-pulse" />
                  ) : micStatus === 'LISTENING' ? (
                    <Mic className="w-4 h-4 animate-pulse" />
                  ) : (
                    <Volume2 className="w-4 h-4 animate-pulse" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#F5EFE3] tracking-wide flex items-center gap-1">
                      RoadGuard AI
                      <Sparkles className="w-3 h-3 text-[#B8892D]" />
                    </span>
                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                        isPausedForSafety
                          ? 'bg-[#D94B45]/20 border-[#D94B45]/50 text-[#D94B45]'
                          : micStatus === 'LISTENING'
                          ? 'bg-[#5D9B64]/20 border-[#5D9B64]/50 text-[#5D9B64] animate-pulse'
                          : micStatus === 'PROCESSING'
                          ? 'bg-[#4F5B2A]/40 border-white/[0.08] text-[#B8892D]'
                          : 'bg-[#B8892D]/20 border-[#B8892D]/50 text-[#B8892D]'
                      }`}
                    >
                      {isPausedForSafety
                        ? 'Safety Paused'
                        : micStatus === 'LISTENING'
                        ? '● Listening...'
                        : micStatus === 'PROCESSING'
                        ? 'Thinking...'
                        : '🔊 Speaking...'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                {/* Manual Mic Toggle */}
                {onToggleMic && (
                  <button
                    onClick={onToggleMic}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                      micStatus === 'LISTENING'
                        ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                        : 'bg-zinc-900 border-zinc-750 text-zinc-300 hover:text-white'
                    }`}
                    title={micStatus === 'LISTENING' ? 'Mute microphone' : 'Start listening'}
                  >
                    {micStatus === 'LISTENING' ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                    <span>{micStatus === 'LISTENING' ? 'Mic Active' : 'Tap to Speak'}</span>
                  </button>
                )}

                {/* Help button */}
                <button
                  type="button"
                  onClick={() => setShowHelp(!showHelp)}
                  className="w-7 h-7 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-zinc-800"
                  title="Commands Help"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>

                {/* Dismiss Button */}
                <button
                  onClick={onDismiss}
                  className="w-7 h-7 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-zinc-800"
                  title="Dismiss conversation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Optional Help Box */}
            {showHelp && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-700/60 text-[11px] text-zinc-300 space-y-1">
                <div className="font-bold text-white text-xs flex items-center gap-1">
                  <span>💡 Voice Commands Supported:</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-zinc-400 pt-1">
                  <div>• &ldquo;Status report&rdquo; / &ldquo;Sab theek?&rdquo;</div>
                  <div>• &ldquo;Speed check&rdquo; / &ldquo;Kitni speed?&rdquo;</div>
                  <div>• &ldquo;Blackspot check&rdquo; / &ldquo;Khatra?&rdquo;</div>
                  <div>• &ldquo;Band karo&rdquo; / &ldquo;Mute&rdquo;</div>
                </div>
              </div>
            )}

            {/* AI Speech Bubble */}
            {lastAiSpeech && (
              <div className="mt-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/90 text-[13px] text-zinc-100 font-medium leading-relaxed relative overflow-hidden">
                <div className="flex items-start gap-2">
                  <span className="text-zinc-500 select-none">&ldquo;</span>
                  <span className="flex-1">{lastAiSpeech}</span>
                  <span className="text-zinc-500 select-none">&rdquo;</span>
                </div>

                {/* Animated Audio Equalizer Bars when AI is speaking (not listening) */}
                {micStatus !== 'LISTENING' && (
                  <div className="flex items-end gap-0.5 mt-2 h-3 opacity-60">
                    <span className="w-1 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s] h-2" />
                    <span className="w-1 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s] h-3" />
                    <span className="w-1 bg-amber-400 rounded-full animate-bounce h-1.5" />
                    <span className="w-1 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.2s] h-2.5" />
                  </div>
                )}
              </div>
            )}

            {/* Rider Live Voice Micro-Transcript */}
            {(transcript || interimTranscript) && (
              <div className="mt-2 px-3 py-2 rounded-xl bg-zinc-950/90 border border-emerald-900/50 text-xs font-mono text-emerald-300 flex items-center gap-2 shadow-inner">
                <span className="text-zinc-500 font-sans text-[11px] font-semibold">You:</span>
                <span>
                  &ldquo;{transcript}
                  {interimTranscript && (
                    <span className="text-zinc-400 italic"> {interimTranscript}</span>
                  )}
                  &rdquo;
                </span>
              </div>
            )}

            {/* Error or Permission warning if any */}
            {!isSpeechSupported && (
              <div className="mt-2 text-[11px] text-amber-300 flex items-center gap-1.5 bg-amber-950/30 px-2 py-1 rounded border border-amber-900/50">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Browser speech recognition unavailable. You can use the quick chips or text box below.</span>
              </div>
            )}
            {errorMessage && (
              <div className="mt-2 text-[11px] text-rose-400 flex items-center gap-1.5 bg-rose-950/30 px-2 py-1 rounded border border-rose-900/50">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Quick Suggestion Chips (1-tap answers for rider safety) */}
            {quickSuggestions.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mr-1">Quick:</span>
                {quickSuggestions.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleChipClick(chip)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-emerald-950/80 hover:border-emerald-600/80 border border-zinc-800 text-[11px] text-zinc-300 hover:text-emerald-200 transition-all cursor-pointer font-medium shadow-sm active:scale-95"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* 100% Hands-Free Voice Guidance Indicator */}
            <div className="mt-2.5 px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-medium text-zinc-300">100% Hands-Free Voice Mode</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">Speak naturally &middot; No typing needed</span>
            </div>

            {/* Session Privacy & In-Memory Context Pills */}
            <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-400">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>In-Memory Session Context</span>
              </div>

              {/* Session tags if answers collected */}
              {(sessionContext.school ||
                sessionContext.crush ||
                sessionContext.helmetSinging ||
                sessionContext.midnightCraving ||
                sessionContext.roadPetPeeve ||
                sessionContext.passion) && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {sessionContext.school && (
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      🏫 {sessionContext.school}
                    </span>
                  )}
                  {sessionContext.crush && (
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      ❤️ {sessionContext.crush}
                    </span>
                  )}
                  {sessionContext.helmetSinging && (
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      🎤 {sessionContext.helmetSinging}
                    </span>
                  )}
                  {sessionContext.midnightCraving && (
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      ☕ {sessionContext.midnightCraving}
                    </span>
                  )}
                  {sessionContext.roadPetPeeve && (
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      ⚠️ {sessionContext.roadPetPeeve}
                    </span>
                  )}
                  {sessionContext.passion && (
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      ⚡ {sessionContext.passion}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* IDLE STATE: PROMINENT FLOATING TRIGGER PILLS */
          /* ========================================================================= */
          <div className="flex flex-wrap items-center gap-2">
            {/* Prominent Demo Spoken Dialogue Button */}
            {(onTriggerDemoChat || onTriggerChat) && (
              <button
                type="button"
                onClick={onTriggerDemoChat || onTriggerChat}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#B8892D] hover:bg-[#D4A84D] text-[#0C0F0A] font-bold text-xs shadow-[0_4px_20px_rgba(184,137,45,0.3)] border border-[#B8892D] transition-all cursor-pointer group active:scale-95"
              >
                <div className="w-6 h-6 rounded-lg bg-[#0C0F0A]/15 flex items-center justify-center text-[#0C0F0A] group-hover:scale-110 transition-transform">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse text-[#0C0F0A]" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5 tracking-wide font-black">
                    <span>DEMO — VOICE PERSONAL CHAT</span>
                  </div>
                  <div className="text-[10px] font-medium text-[#0C0F0A]/80">
                    Hands-free interactive voice convo &middot; Spoken dialogue
                  </div>
                </div>
              </button>
            )}

            {/* Interaction count pill */}
            <div className="px-3 py-2 rounded-xl bg-[#12160F]/95 border border-white/[0.08] text-[11px] font-mono text-[#A8AA9B] flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#B8892D]" />
              <span>Interactions: {telemetry.interactionCount}/3</span>
              <span className="text-[9px] text-[#777C6F]">(Auto-starts at 3)</span>
            </div>

            {onTriggerChat && (
              <button
                type="button"
                onClick={onTriggerChat}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#12160F]/95 hover:bg-[#181D14] border border-white/[0.08] text-[#F5EFE3] transition-all cursor-pointer text-xs"
              >
                <Mic className="w-3.5 h-3.5 text-[#5D9B64]" />
                <span>Voice Assist</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
