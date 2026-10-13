import { create } from 'zustand';

export type CallPhase = 'idle' | 'connecting' | 'ringing' | 'connected' | 'ended';

export type IncomingCall = { callId: string; callerName: string };

export type CallState = {
  phase: CallPhase;
  callId: string | null;
  peerName: string | null;
  isIncoming: boolean;
  error: string | null;
  incoming: IncomingCall | null;
  muted: boolean;
  speakerOn: boolean;
  connectedAt: number | null;
};

export const useCallStore = create<CallState>(() => ({
  phase: 'idle',
  callId: null,
  peerName: null,
  isIncoming: false,
  error: null,
  incoming: null,
  muted: false,
  speakerOn: false,
  connectedAt: null,
}));

export const setCall = (patch: Partial<CallState>) =>
  useCallStore.setState(patch);

export const isCallActive = () =>
  ['connecting', 'ringing', 'connected'].includes(
    useCallStore.getState().phase,
  );