import { useState, useEffect, useRef, useCallback } from "react";

export function useWebRTC() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const peerConnection = useRef<RTCPeerConnection | null>(null);

  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
      return null;
    }
  }, []);

  const stopLocalStream = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
  }, [localStream]);

  const joinRoom = useCallback(async (roomCode: string) => {
    console.log(`Joining room: ${roomCode}`);
    const stream = await startLocalStream();
    if (!stream) return;

    // Initialize PeerConnection
    peerConnection.current = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    // Add tracks to PeerConnection
    stream.getTracks().forEach((track) => {
      peerConnection.current?.addTrack(track, stream);
    });

    // Handle remote tracks
    peerConnection.current.ontrack = (event) => {
      console.log("Received remote track");
      setRemoteStream(event.streams[0]);
    };

    // Signaling logic should be implemented here
    // e.g. createOffer, createAnswer, setLocalDescription, etc.
    
    setIsJoined(true);
  }, [startLocalStream]);

  const leaveRoom = useCallback(() => {
    stopLocalStream();
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setRemoteStream(null);
    setIsJoined(false);
  }, [stopLocalStream]);

  return {
    localStream,
    remoteStream,
    isJoined,
    joinRoom,
    leaveRoom,
    startLocalStream,
    stopLocalStream,
  };
}
