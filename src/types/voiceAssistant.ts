// ----------------------------------------------------
// SafeDrive Voice Assistant & Conversation Layer Types
// ----------------------------------------------------

export type VoiceAssistantState =
  | 'IDLE'
  | 'INVITATION_SPEAKING'
  | 'WAITING_FOR_ACCEPTANCE'
  | 'LISTENING_SCHOOL'
  | 'PROCESSING_SCHOOL'
  | 'RESPONDING_SCHOOL'
  | 'LISTENING_CRUSH'
  | 'PROCESSING_CRUSH'
  | 'RESPONDING_CRUSH'
  | 'LISTENING_HELMET_SING'
  | 'PROCESSING_HELMET_SING'
  | 'RESPONDING_HELMET_SING'
  | 'LISTENING_CHAI_CRAVING'
  | 'PROCESSING_CHAI_CRAVING'
  | 'RESPONDING_CHAI_CRAVING'
  | 'LISTENING_PET_PEEVE'
  | 'PROCESSING_PET_PEEVE'
  | 'RESPONDING_PET_PEEVE'
  | 'LISTENING_PASSION'
  | 'PROCESSING_PASSION'
  | 'RESPONDING_PASSION'
  | 'COMPLETE'
  | 'PAUSED_FOR_SAFETY';

export type MicStatus =
  | 'OFF'
  | 'READY'
  | 'LISTENING'
  | 'PROCESSING'
  | 'PAUSED'
  | 'PERMISSION_DENIED'
  | 'UNSUPPORTED'
  | 'ERROR';

export interface RiderSessionContext {
  school?: string;
  crush?: string;
  helmetSinging?: string;
  midnightCraving?: string;
  roadPetPeeve?: string;
  passion?: string;
}

export type AssistantLanguage = 'HINGLISH' | 'ENGLISH';

export interface VoiceAssistantTelemetry {
  state: VoiceAssistantState;
  micStatus: MicStatus;
  language: AssistantLanguage;
  transcript: string;
  interimTranscript: string;
  lastAiSpeech: string;
  sessionContext: RiderSessionContext;
  interactionCount: number;
  isPausedForSafety: boolean;
  errorMessage?: string;
}
