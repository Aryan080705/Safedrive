import React, { useRef } from 'react';
import { Upload, Film, FileVideo, ShieldCheck } from 'lucide-react';
import { SAMPLE_SCENARIOS, type SampleScenario } from '../services/sampleClips';

interface VideoUploaderProps {
  selectedScenario: SampleScenario | null;
  isUsingUploadedVideo: boolean;
  onSelectScenario: (scenario: SampleScenario) => void;
  onUploadFile: (file: File) => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  selectedScenario,
  isUsingUploadedVideo,
  onSelectScenario,
  onUploadFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadFile(e.target.files[0]);
    }
  };

  return (
    <div className="hud-card p-4 shadow-xl space-y-3 shrink-0 border-zinc-800 bg-[#12131a]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div>
          <h2 className="text-sm font-bold text-white m-0 flex items-center gap-2">
            <Film className="w-4 h-4 text-zinc-300" />
            Road Video Feed / Dashcam Source
          </h2>
          <p className="text-xs text-zinc-400 m-0">
            Select a verified test scenario or upload a custom dashcam clip (MP4 / WebM).
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shrink-0 font-mono">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Local WASM &middot; Zero Cloud Upload</span>
        </div>
      </div>

      {/* Built-in Scenarios Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {SAMPLE_SCENARIOS.map((sc) => {
          const isSelected = !isUsingUploadedVideo && selectedScenario?.id === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => onSelectScenario(sc)}
              className={`h-[62px] p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between overflow-hidden ${
                isSelected
                  ? 'bg-zinc-800 border-zinc-500 text-white shadow-sm ring-1 ring-zinc-500'
                  : 'bg-zinc-900/80 hover:bg-zinc-850 border-zinc-800 text-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-zinc-100 truncate">{sc.title}</span>
                {sc.hasIncident && (
                  <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded font-semibold border border-rose-500/30 shrink-0 ml-1">
                    Incident
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 truncate m-0 w-full">
                {sc.subtitle}
              </p>
            </button>
          );
        })}
      </div>

      {/* Drag and Drop Custom Video File Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`h-[46px] border border-dashed rounded-xl px-3 flex items-center justify-center text-center transition-colors cursor-pointer overflow-hidden ${
          isUsingUploadedVideo
            ? 'border-emerald-500/60 bg-emerald-950/20 text-emerald-200'
            : 'border-zinc-750 hover:border-zinc-600 bg-zinc-900/50 text-zinc-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex items-center justify-center gap-2 truncate font-mono text-xs">
          <Upload className="w-4 h-4 text-zinc-400 shrink-0" />
          <span className="truncate">
            {isUsingUploadedVideo ? (
              <span className="flex items-center gap-1.5 text-emerald-300 font-semibold truncate">
                <FileVideo className="w-4 h-4 shrink-0" /> Custom Dashcam Video Active &middot; Click to replace
              </span>
            ) : (
              'Drag & drop driving / dashcam video here, or click to browse (MP4/WebM)'
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
