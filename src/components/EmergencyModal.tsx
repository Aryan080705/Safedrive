import React, { useEffect, useState } from 'react';
import { PhoneCall, ShieldAlert, XCircle, CheckCircle, Radio } from 'lucide-react';

interface EmergencyModalProps {
  isOpen: boolean;
  onCancel: () => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  onCancel,
}) => {
  const [countdown, setCountdown] = useState<number>(10);
  const [isTriggered, setIsTriggered] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(10);
      setIsTriggered(false);
      return;
    }

    setCountdown(10);
    setIsTriggered(false);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTriggered(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101820]/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#182536] border-2 border-[#EA5455] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden text-center">
        {/* Amber Hazard Flasher Bars */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#F07B3F] via-[#EA5455] to-[#FFD460] animate-pulse" />

        {/* Demo Simulation Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F07B3F]/20 text-[#FFD460] border border-[#F07B3F]/40 mb-4">
          <Radio className="w-3.5 h-3.5 animate-pulse text-[#FFD460]" />
          <span>SIMULATED EMERGENCY WORKFLOW (PROTOTYPE DEMO)</span>
        </div>

        {!isTriggered ? (
          <div>
            {/* Header Icon */}
            <div className="w-16 h-16 rounded-full bg-[#EA5455]/20 border border-[#EA5455]/40 flex items-center justify-center mx-auto text-[#EA5455] mb-3 animate-bounce">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-[#F7F4EC] mb-1">
              Critical Driver Risk Detected!
            </h2>
            <p className="text-xs text-[#B9C0C8] max-w-sm mx-auto mb-5">
              Unresponsive prolonged eye closure or critical disorientation detected. Initiating automated emergency protocol.
            </p>

            {/* Circular Countdown Ring */}
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke="#2D4059"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke="#EA5455"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 48}
                  strokeDashoffset={2 * Math.PI * 48 * (1 - countdown / 10)}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-extrabold text-[#EA5455] font-mono">
                  {countdown}
                </span>
                <span className="text-[10px] text-[#7F8995] uppercase tracking-widest -mt-1 font-mono">
                  Seconds
                </span>
              </div>
            </div>

            {/* Simulated Protocol Actions */}
            <div className="bg-[#101820] rounded-xl p-3 text-left text-xs border border-white/10 space-y-1.5 mb-5 text-[#B9C0C8]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFD460] animate-ping" />
                <span>Simulating Vehicle Hazard Flashers Activation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F07B3F]" />
                <span>Simulating CAN-Bus Adaptive Deceleration Advisory</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EA5455]" />
                <span>Emergency Roadside Dispatch Notification Standby</span>
              </div>
            </div>

            {/* Cancel Button */}
            <button
              onClick={onCancel}
              className="w-full py-3 px-4 rounded-xl bg-[#2D4059] hover:bg-[#374D69] text-[#F7F4EC] font-bold text-sm border border-white/15 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg"
            >
              <XCircle className="w-4 h-4 text-[#4DBB82]" />
              <span>CANCEL — I AM ALERT & RESPONSIVE</span>
            </button>
          </div>
        ) : (
          <div>
            {/* Countdown Expired State */}
            <div className="w-16 h-16 rounded-full bg-[#EA5455]/20 border border-[#EA5455]/50 flex items-center justify-center mx-auto text-[#EA5455] mb-3">
              <PhoneCall className="w-8 h-8 animate-pulse" />
            </div>

            <h2 className="text-xl font-bold text-[#EA5455] mb-1">
              Emergency Workflow Triggered
            </h2>
            <p className="text-xs text-[#B9C0C8] max-w-sm mx-auto mb-4">
              Driver was non-responsive during countdown. In a production vehicle deployment, safety telemetry would be transmitted to emergency operators.
            </p>

            <div className="bg-[#101820] rounded-xl p-3 text-left text-xs border border-[#EA5455]/30 space-y-2 mb-4">
              <div className="flex items-center gap-2 text-[#4DBB82] font-medium">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Simulated eCall Dispatch Packet Generated</span>
              </div>
              <div className="flex items-center gap-2 text-[#4DBB82] font-medium">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Live GPS Coordinates Attached (28.5355° N, 77.3910° E)</span>
              </div>
              <div className="flex items-center gap-2 text-[#4DBB82] font-medium">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Fleet Telemetry Logged to Incident Ledger</span>
              </div>
            </div>

            {/* 1-Click WhatsApp SOS Action */}
            <div className="mb-4">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `[EMERGENCY CRASH SOS] SafeDrive Autonomous ADAS: Severe impact/unresponsive driver event detected. Location: 28.5355 N, 77.3910 E (https://maps.google.com/?q=28.5355,77.3910). Immediate emergency assistance requested.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-[#4DBB82] hover:bg-[#3AA36E] text-[#101820] font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <span>📱</span>
                <span>BROADCAST LIVE SOS ON WHATSAPP</span>
              </a>
            </div>

            <button
              onClick={onCancel}
              className="w-full py-2.5 px-4 rounded-xl bg-[#223247] hover:bg-[#2D4059] text-[#B9C0C8] font-semibold text-xs transition-colors cursor-pointer border border-white/10"
            >
              Dismiss Emergency Simulation
            </button>
          </div>
        )}

        {/* Safety & Compliance Footnote */}
        <p className="text-[10px] text-slate-500 mt-4 m-0">
          Prototype Road Safety Demonstration &middot; Does not place real phone calls or transmit actual cellular emergency signals.
        </p>
      </div>
    </div>
  );
};
