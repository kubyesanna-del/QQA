import AgoraRTC, { type IAgoraRTCClient, type ILocalAudioTrack } from 'agora-rtc-sdk-ng';
import { auth } from '../config/firebase';

const API_BASE = 'https://aletwend-render-backend.onrender.com/api/calls';

export interface ActiveCall {
  leave: () => Promise<void>;
  setMuted: (muted: boolean) => Promise<void>;
}

export interface CallCredentials {
  callId?: string;
  channel: string;
  appId: string;
  token: string;
  uid: string | number | null;
}

async function request<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in to call');
  const token = await user.getIdToken();
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({})) as { success?: boolean; error?: string } & T;
  if (!response.ok || data.success === false) throw new Error(data.error || `Call request failed (${response.status})`);
  return data;
}

export const startCall = (orderId: string) => request<CallCredentials>('/start', { orderId });
export const acceptCall = (callId: string) => request<CallCredentials>('/accept', { callId });
export const declineCall = (callId: string) => request<{ success: boolean }>('/decline', { callId });
export const endCall = (callId: string, reason?: string) => request<{ success: boolean }>('/end', { callId, ...(reason ? { reason } : {}) });

export async function joinChannel(
  credentials: CallCredentials,
  onRemoteAudio?: () => void,
): Promise<ActiveCall> {
  const client: IAgoraRTCClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  const localAudioTrack: ILocalAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
  let left = false;
  client.on('user-published', async (user, mediaType) => {
    await client.subscribe(user, mediaType);
    if (mediaType === 'audio' && user.audioTrack) {
      user.audioTrack.play();
      onRemoteAudio?.();
    }
  });
  try {
    await client.join(credentials.appId, credentials.channel, credentials.token, credentials.uid);
    await client.publish([localAudioTrack]);
  } catch (error) {
    localAudioTrack.close();
    await client.leave().catch(() => undefined);
    throw error;
  }
  return {
    setMuted: (muted) => localAudioTrack.setEnabled(!muted),
    leave: async () => {
      if (left) return;
      left = true;
      localAudioTrack.close();
      await client.leave();
    },
  };
}

export default joinChannel;
