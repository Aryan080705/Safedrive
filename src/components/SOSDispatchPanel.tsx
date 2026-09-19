import React from 'react';
import {
  PhoneCall,
  ShieldAlert,
  AlertTriangle,
  MapPin,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  Smartphone
} from 'lucide-react';
import type { SOSEmergencyState, MotionData, GPSLocation } from '../types';

interface SOSDispatchPanelProps {
  emergencyState: SOSEmergencyState;
  motionData: MotionData;
  location: GPSLocation;
  onTriggerImpact: () => void;
  onCancelEmergency: () => void;
  onSendAlertNow: () => void;
  onResetSOS: () => void;
  onRequestLocation: () => void;
}

export const SOSDispatchPanel: React.FC<SOSDispatchPanelProps> = ({
  emergencyState,
  motionData,
  location,
  onTriggerImpact,
  onCancelEmergency,
  onSendAlertNow,
  onResetSOS,
  onRequestLocation,
}) => {
  const isCountdown = emergencyState.status === 'COUNTDOWN_ACTIVE';
  const isDispatched = emergencyState.status === 'DISPATCHED';
  const isCancelled = emergencyState.status === 'CANCELLED';

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="hud-card p-4 border border-white/10 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#EA5455]/20 border border-[#EA5455]/40 flex items-center justify-center text-[#EA5455] shrink-0">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-[#F7F4EC] uppercase tracking-wider m-0">
                SOS-Dispatch &middot; Smartphone Crash Detection &amp; Response
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#EA5455]/20 text-[#EA5455] border border-[#EA5455]/40">
                Automated 10s Fail-Safe
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#2D4059] text-[#B9C0C8] border border-white/10">
                Zero Cloud Billing Required
              </span>
            </div>
            <p className="text-xs text-[#B9C0C8] mt-1 m-0">
              Evaluates high-G shockwaves, device orientation changes, and subsequent kinetic cessation.
              Dispatches automated GPS payload with a 10-second driver cancellation window.
            </p>
          </div>
        </div>

        {/* Impact Test Trigger Button */}
        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={onTriggerImpact}
            disabled={isCountdown}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#EA5455] hover:bg-[#D03D3E] disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer shadow-md"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Simulate Sensor Impact</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Live Telemetry + Active Emergency Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Column: Live Accelerometer & GPS Status (6 cols) */}
        <div className="lg:col-span-6 flex flex-col space-y-3">
          {/* Accelerometer Card */}
          <div className="hud-card p-4 border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#FFD460]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F7F4EC] m-0">
                  Inertial Motion Sensor Feed
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#7F8995]">
                DeviceMotionEvent API
              </span>
            </div>

            {/* G-Force Metrics Grid */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-[#101820] p-2.5 rounded-xl border border-white/10">
                <div className="text-[10px] uppercase text-[#7F8995] font-mono">Total G</div>
                <div className={`text-xl font-bold font-mono mt-0.5 ${
                  motionData.totalG > 2.5 ? 'text-[#EA5455] animate-pulse' : 'text-[#4DBB82]'
                }`}>
                  {motionData.totalG.toFixed(2)} G
                </div>
              </div>
              <div className="bg-[#101820] p-2.5 rounded-xl border border-white/10">
                <div className="text-[10px] uppercase text-[#7F8995] font-mono">X-Axis</div>
                <div className="text-sm font-bold font-mono text-[#F7F4EC] mt-1">
                  {motionData.accelX.toFixed(1)} m/s²
                </div>
              </div>
              <div className="bg-[#101820] p-2.5 rounded-xl border border-white/10">
                <div className="text-[10px] uppercase text-[#7F8995] font-mono">Y-Axis</div>
                <div className="text-sm font-bold font-mono text-[#F7F4EC] mt-1">
                  {motionData.accelY.toFixed(1)} m/s²
                </div>
              </div>
              <div className="bg-[#101820] p-2.5 rounded-xl border border-white/10">
                <div className="text-[10px] uppercase text-[#7F8995] font-mono">Z-Axis</div>
                <div className="text-sm font-bold font-mono text-[#F7F4EC] mt-1">
                  {motionData.accelZ.toFixed(1)} m/s²
                </div>
              </div>
            </div>

            {/* Crash Detection Heuristic Guide */}
            <div className="bg-[#101820] p-3 rounded-xl border border-white/10 text-xs space-y-1 text-[#B9C0C8]">
              <div className="text-[10px] font-bold uppercase text-[#FFD460] tracking-wider font-mono">
                Multi-Factor Impact Heuristic
              </div>
              <p className="text-[11px] text-[#7F8995] m-0 leading-relaxed">
                Rather than triggering on transient phone drops (&gt;4G alone), RoadGuard AI verifies:
                (1) Sudden kinetic deceleration &Delta; &gt; 2.5G,
                (2) Simultaneous angular rotation shift, and
                (3) Post-impact kinetic cessation (&lt;0.2G delta for &gt;1.5s).
              </p>
            </div>
          </div>

          {/* GPS Location Card */}
          <div className="hud-card p-4 border border-white/[0.08] shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#5D9B64]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5EFE3] m-0">
                  Browser Geolocation Status
                </h3>
              </div>
              <button
                onClick={onRequestLocation}
                className="text-[11px] font-mono text-[#B8892D] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh GPS</span>
              </button>
            </div>

            <div className="p-3 bg-[#0C0F0A] rounded-xl border border-white/[0.08] flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase text-[#777C6F] font-mono">
                  Live Coordinates
                </div>
                {location.status === 'OBTAINED' && location.latitude && location.longitude ? (
                  <div className="mt-1 font-mono text-xs text-[#5D9B64] font-bold">
                    {location.latitude.toFixed(5)}°N, {location.longitude.toFixed(5)}°E &middot; &plusmn;{location.accuracyMeters}m
                  </div>
                ) : (
                  <div className="mt-1 font-mono text-xs text-[#B8892D] font-medium">
                    {location.locationName || 'Location unavailable'}
                  </div>
                )}
              </div>

              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                  location.status === 'OBTAINED'
                    ? 'bg-[#5D9B64]/20 text-[#5D9B64] border border-[#5D9B64]/40'
                    : 'bg-[#B8892D]/20 text-[#B8892D] border border-[#B8892D]/40'
                }`}
              >
                {location.status}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Emergency Workflow & Countdown Center (6 cols) */}
        <div className="lg:col-span-6 flex flex-col space-y-3">
          <div className="hud-card p-5 border border-white/10 shadow-xl flex-1 flex flex-col justify-between">
            {/* Top Workflow Header */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#EA5455]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#F7F4EC] m-0">
                    Emergency Response Workflow
                  </h3>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono ${
                    isCountdown
                      ? 'bg-[#EA5455] text-white animate-pulse'
                      : isDispatched
                      ? 'bg-[#4DBB82]/20 text-[#4DBB82] border border-[#4DBB82]/40'
                      : isCancelled
                      ? 'bg-[#2D4059] text-[#B9C0C8]'
                      : 'bg-[#101820] text-[#7F8995] border border-white/10'
                  }`}
                >
                  {emergencyState.status.replace('_', ' ')}
                </span>
              </div>

              {/* State 1: Active 10-Second Countdown */}
              {isCountdown && (
                <div className="mt-4 p-5 rounded-xl bg-[#101820] border-2 border-[#EA5455] text-center space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EA5455]/20 border border-[#EA5455]/50 text-[#EA5455] text-xs font-bold animate-pulse font-mono">
                    <AlertTriangle className="w-4 h-4" />
                    <span>POSSIBLE CRASH DETECTED ({emergencyState.peakGForce.toFixed(1)}G Peak)</span>
                  </div>

                  <div>
                    <div className="text-xs text-[#B9C0C8] uppercase font-semibold">
                      Automated Emergency Alert In:
                    </div>
                    <div className="text-6xl font-extrabold font-mono text-[#EA5455] my-2 animate-bounce">
                      00:0{emergencyState.countdownSeconds}
                    </div>
                    <p className="text-xs text-[#7F8995] max-w-sm mx-auto">
                      If you are unhurt or this was a false alarm, click <strong>CANCEL</strong> immediately.
                    </p>
                  </div>

                  {/* Actions: Cancel or Dispatch Instantly */}
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={onCancelEmergency}
                      className="px-5 py-2.5 rounded-lg bg-[#B8892D] hover:bg-[#D4A84D] text-[#0C0F0A] font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-md"
                    >
                      <XCircle className="w-4 h-4 text-[#0C0F0A]" />
                      <span>CANCEL (I AM SAFE)</span>
                    </button>
                    <button
                      onClick={onSendAlertNow}
                      className="px-5 py-2.5 rounded-lg bg-[#D94B45] hover:bg-[#C23731] text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg"
                    >
                      <Send className="w-4 h-4" />
                      <span>SEND ALERT NOW</span>
                    </button>
                  </div>
                </div>
              )}

              {/* State 2: Dispatched */}
              {isDispatched && emergencyState.dispatchRecord && (
                <div className="mt-4 p-4 rounded-xl bg-[#101820] border border-[#4DBB82]/40 space-y-3">
                  <div className="flex items-center gap-2 text-[#4DBB82] font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>EMERGENCY ALERT DISPATCHED (Simulated Dispatch)</span>
                  </div>

                  <div className="bg-[#182536] p-3.5 rounded-lg border border-white/10 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-[#7F8995] pb-1.5 border-b border-white/10">
                      <span>Recipient: <strong className="text-[#F7F4EC]">{emergencyState.dispatchRecord.recipientName}</strong></span>
                      <span className="font-mono text-[#4DBB82] font-bold">100% DISPATCHED</span>
                    </div>
                    <div className="text-[11px] font-mono text-[#F7F4EC] break-words bg-[#101820] p-2.5 rounded-lg border border-white/10 leading-relaxed">
                      {emergencyState.dispatchRecord.messageText}
                    </div>

                    {/* Real 1-Click WhatsApp Emergency Dispatch */}
                    <div className="pt-1">
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(emergencyState.dispatchRecord.messageText)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-3 rounded-lg bg-[#4DBB82] hover:bg-[#3AA36E] text-[#101820] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
                      >
                        <span className="text-sm">📱</span>
                        <span>SEND LIVE SOS ON WHATSAPP (REAL-WORLD DISPATCH)</span>
                      </a>
                    </div>
                  </div>

                  <button
                    onClick={onResetSOS}
                    className="w-full py-2 rounded-lg bg-[#2D4059] hover:bg-[#374D69] text-[#F7F4EC] text-xs font-semibold cursor-pointer transition-colors border border-white/10"
                  >
                    Reset System to Monitoring
                  </button>
                </div>
              )}

              {/* State 3: Cancelled */}
              {isCancelled && (
                <div className="mt-4 p-4 rounded-xl bg-[#101820] border border-white/10 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#2D4059] text-[#FFD460] flex items-center justify-center mx-auto">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#F7F4EC] uppercase m-0">
                      Emergency Alert Cancelled by User
                    </h4>
                    <p className="text-[11px] text-[#7F8995] mt-1 m-0">
                      Countdown stopped. No emergency broadcast or SMS was dispatched.
                    </p>
                  </div>
                  <button
                    onClick={onResetSOS}
                    className="px-4 py-1.5 rounded-lg bg-[#2D4059] hover:bg-[#374D69] text-[#F7F4EC] text-xs font-medium cursor-pointer border border-white/10"
                  >
                    Resume Normal Monitoring
                  </button>
                </div>
              )}

              {/* State 4: Idle Monitoring */}
              {!isCountdown && !isDispatched && !isCancelled && (
                <div className="mt-4 p-6 rounded-xl bg-[#101820] border border-white/10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#2D4059] border border-white/10 flex items-center justify-center text-[#FFD460] mx-auto">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#F7F4EC] uppercase m-0">
                      Kinetic Crash Detector Active
                    </h4>
                    <p className="text-[11px] text-[#7F8995] mt-1 max-w-sm mx-auto">
                      Sensors are continuously listening for abnormal G-force deceleration signatures.
                      Click <strong>"Simulate Sensor Impact"</strong> above to test the full 10-second fail-safe workflow.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Local Dispatch Disclaimer */}
            <div className="pt-3 border-t border-white/10 text-[11px] text-[#7F8995] leading-normal font-mono">
              <strong>Offline-First &amp; Zero Cloud Billing:</strong> Simulated dispatch runs entirely locally in-browser without requiring external paid credentials.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
