import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable, StatusBar,
  StyleSheet, Text, View
} from 'react-native';
import {
  ChannelProfileType, ClientRoleType,
  createAgoraRtcEngine, IRtcEngine,
  RtcSurfaceView, VideoSourceType,
} from 'react-native-agora';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID ?? '';

export default function VideoCallScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const engine = useRef<IRtcEngine | null>(null);
  const [joined,     setJoined]     = useState(false);
  const [remoteUid,  setRemoteUid]  = useState<number | null>(null);
  const [muted,      setMuted]      = useState(false);
  const [cameraOff,  setCameraOff]  = useState(false);
  const [connecting, setConnecting] = useState(true);

  // Channel name keyed to booking — parent and sitter join the same channel
  const channelName = `kido_${bookingId}`;
  const [uid] = useState(() => Math.floor(Math.random() * 100000));

  // Simplified fetchToken — always returns empty string (for testing)
  const fetchToken = useCallback(async (): Promise<string> => {
    return '';
  }, []);

  const startCall = useCallback(async () => {
    try {
      const token = await fetchToken();

      engine.current = createAgoraRtcEngine();
      engine.current.initialize({
        appId: APP_ID,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      engine.current.registerEventHandler({
        onJoinChannelSuccess: () => { setJoined(true); },
        onUserJoined:  (_conn, uid)  => { setRemoteUid(uid); setConnecting(false); },
        onUserOffline: (_conn, _uid) => {
          setRemoteUid(null);
          Alert.alert('Call ended', 'The other person has left.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        },
        onError: (err) => { console.warn('[Agora] error', err); },
      });

      engine.current.enableVideo();
      engine.current.startPreview();

      await engine.current.joinChannel(token, channelName, uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });
    } catch (e: any) {
      Alert.alert('Connection failed', e?.message ?? 'Could not start the video call.');
      router.back();
    }
  }, [channelName, uid, fetchToken, router]);

  useEffect(() => {
    startCall();
    return () => {
      engine.current?.leaveChannel();
      engine.current?.release();
    };
  }, [startCall]);

  const toggleMute = () => {
    engine.current?.muteLocalAudioStream(!muted);
    setMuted(v => !v);
  };

  const toggleCamera = () => {
    engine.current?.muteLocalVideoStream(!cameraOff);
    setCameraOff(v => !v);
  };

  const endCall = () => {
    engine.current?.leaveChannel();
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#111' }}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      {/* Remote video — full screen background */}
      {remoteUid !== null ? (
        <RtcSurfaceView
          style={StyleSheet.absoluteFill}
          canvas={{ uid: remoteUid, sourceType: VideoSourceType.VideoSourceRemote }}
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="person-circle-outline" size={80} color="rgba(255,255,255,0.25)" />
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginTop: 16, fontWeight: '600' }}>
            {connecting ? 'Connecting…' : 'Waiting for the other person'}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 6 }}>
            Channel: {channelName}
          </Text>
        </View>
      )}

      {/* Local video — picture-in-picture overlay */}
      {joined && !cameraOff && (
        <View style={[s.localVideo, { top: insets.top + 16 }]}>
          <RtcSurfaceView
            style={{ flex: 1 }}
            canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }}
            zOrderMediaOverlay
          />
        </View>
      )}

      {/* Top bar — booking ID + close */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <Text style={s.channelLabel} numberOfLines={1}>Booking #{bookingId?.slice(0, 8).toUpperCase()}</Text>
      </View>

      {/* Bottom controls */}
      <View style={[s.controls, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable style={[s.ctrlBtn, muted && s.ctrlBtnDanger]} onPress={toggleMute}>
          <Ionicons name={muted ? 'mic-off' : 'mic-outline'} size={22} color="#FFFFFF" />
          <Text style={s.ctrlLabel}>{muted ? 'Unmute' : 'Mute'}</Text>
        </Pressable>

        <Pressable style={s.endBtn} onPress={endCall}>
          <Ionicons name="call" size={26} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </Pressable>

        <Pressable style={[s.ctrlBtn, cameraOff && s.ctrlBtnDanger]} onPress={toggleCamera}>
          <Ionicons name={cameraOff ? 'videocam-off-outline' : 'videocam-outline'} size={22} color="#FFFFFF" />
          <Text style={s.ctrlLabel}>{cameraOff ? 'Camera on' : 'Camera off'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    alignItems: 'center', paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingBottom: 10,
  },
  channelLabel: {
    fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.75)',
  },
  localVideo: {
    position: 'absolute', right: 14,
    width: 90, height: 130,
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: '#222',
  },
  controls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 20, paddingTop: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  ctrlBtn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  ctrlBtnDanger: { backgroundColor: 'rgba(239,68,68,0.65)' },
  ctrlLabel: { fontSize: 9, color: 'rgba(255,255,255,0.65)', marginTop: 3, fontWeight: '500' },
  endBtn: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#EF4444', shadowOpacity: 0.5, shadowRadius: 12, elevation: 6,
  },
});