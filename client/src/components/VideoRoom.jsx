import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { useParams } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import Video from './Video';
import Whiteboard from './Whiteboard';
import Chat from './Chat';
import Avatar from './Avatar';

const socket = io(process.env.REACT_APP_SOCKET_SERVER_URL || 'http://localhost:5000');
const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'fallback-secret-key';

function VideoRoom({ user }) {
  const { roomId } = useParams();
  const [peers, setPeers] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showFileShare, setShowFileShare] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [files, setFiles] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [activeSpeakerId, setActiveSpeakerId] = useState(null);

  const userVideo = useRef();
  const screenVideo = useRef();
  const canvasRef = useRef();
  const streamRef = useRef();
  const screenStreamRef = useRef();
  const peersRef = useRef([]);
  const analyserRef = useRef();

  useEffect(() => {
    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (userVideo.current) userVideo.current.srcObject = stream;

        socket.emit('join-room', roomId, socket.id, user?.phoneNumber || 'Guest');

        setupAudioAnalyser(stream, socket.id);

        socket.on('participants-update', setParticipants);

        socket.on('user-connected', (userId, displayName) => {
          const peer = createPeer(userId, socket.id, stream);
          peersRef.current.push({ peerId: userId, peer });
          setPeers((prev) => [...prev, { peerId: userId, peer, displayName }]);
        });

        socket.on('user-disconnected', (userId) => {
          const peerObj = peersRef.current.find((p) => p.peerId === userId);
          if (peerObj) peerObj.peer.destroy();
          peersRef.current = peersRef.current.filter((p) => p.peerId !== userId);
          setPeers((prev) => prev.filter((p) => p.peerId !== userId));
        });

        socket.on('receive-signal', (payload) => {
          const decryptedSignal = CryptoJS.AES.decrypt(payload.signal, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
          const peer = addPeer(JSON.parse(decryptedSignal), payload.callerId, stream);
          peersRef.current.push({ peerId: payload.callerId, peer });
          setPeers((prev) => [...prev, { peerId: payload.callerId, peer }]);
        });

        socket.on('return-signal', (payload) => {
          const peerObj = peersRef.current.find((p) => p.peerId === payload.id);
          if (peerObj) {
            const decryptedSignal = CryptoJS.AES.decrypt(payload.signal, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
            peerObj.peer.signal(JSON.parse(decryptedSignal));
          }
        });

        socket.on('receive-file', ({ fileName, fileData, senderId }) => {
          setFiles((prev) => [...prev, { fileName, fileData, senderId }]);
        });

        socket.on('receive-drawing', (data) => {
          if (canvasRef.current) canvasRef.current.loadPaths(data);
        });

        socket.on('chat-message', ({ sender, message }) => {
          setChatMessages((prev) => [...prev, { sender, message }]);
        });
      } catch (err) {
        console.error('Error accessing media devices:', err);
      }
    };

    setupMedia();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      socket.disconnect();
    };
  }, [roomId]);

  const setupAudioAnalyser = (stream, socketId) => {
    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    const micSource = audioCtx.createMediaStreamSource(stream);
    micSource.connect(analyser);
    analyser.fftSize = 512;
    analyserRef.current = analyser;

    const buffer = new Uint8Array(analyser.frequencyBinCount);

    const detectSpeaking = () => {
      analyser.getByteFrequencyData(buffer);
      const volume = buffer.reduce((a, b) => a + b, 0);
      if (volume > 3000) {
        setActiveSpeakerId(socketId);
      }
      requestAnimationFrame(detectSpeaking);
    };
    detectSpeaking();
  };

  function createPeer(userToSignal, callerId, stream) {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on('signal', (signal) => {
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(signal), ENCRYPTION_KEY).toString();
      socket.emit('send-signal', { userToSignal, callerId, signal: encrypted });
    });
    return peer;
  }

  function addPeer(incomingSignal, callerId, stream) {
    const peer = new Peer({ initiator: false, trickle: false, stream });
    peer.on('signal', (signal) => {
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(signal), ENCRYPTION_KEY).toString();
      socket.emit('return-signal', { signal: encrypted, id: callerId });
    });
    peer.signal(incomingSignal);
    return peer;
  }

  const sendMessage = (message) => {
    socket.emit('chat-message', { sender: user?.phoneNumber || 'Guest', message });
    setChatMessages((prev) => [...prev, { sender: 'You', message }]);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      socket.emit('send-file', {
        fileName: file.name,
        fileData: reader.result,
        senderId: user?.uid || 'guest',
        roomId,
      });
    };
    reader.readAsDataURL(file);
  };

  const toggleMute = () => {
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = stream;
      screenVideo.current.srcObject = stream;
      setIsScreenSharing(true);
      stream.getVideoTracks()[0].onended = stopScreenShare;

      peersRef.current.forEach(({ peer }) => {
        peer.replaceTrack(streamRef.current.getVideoTracks()[0], stream.getVideoTracks()[0], streamRef.current);
      });
    } catch (err) {
      console.error('Screen share error:', err);
    }
  };

  const stopScreenShare = () => {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    setIsScreenSharing(false);
  };

  return (
    <div className="video-room">
      <div className="participants-list">
        <h4>Participants</h4>
        <ul>
          {participants.map((p) => (
            <li key={p.id} className={activeSpeakerId === p.id ? 'speaking' : ''}>
              <Avatar name={p.name} muted={p.muted} />
              {p.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="video-section">
        <video muted ref={userVideo} autoPlay playsInline className={activeSpeakerId === socket.id ? 'speaking' : ''} />
        {isScreenSharing && <video ref={screenVideo} autoPlay playsInline />}
        {peers.map((peer) => (
          <Video key={peer.peerId} peer={peer.peer} isSpeaking={peer.peerId === activeSpeakerId} />
        ))}
      </div>

      <div className="controls">
        <button onClick={isScreenSharing ? stopScreenShare : startScreenShare}>
          {isScreenSharing ? 'Stop Screen' : 'Share Screen'}
        </button>
        <button onClick={toggleMute}>{isMuted ? 'Unmute' : 'Mute'}</button>
        <button onClick={() => setShowWhiteboard((prev) => !prev)}>
          {showWhiteboard ? 'Hide Whiteboard' : 'Show Whiteboard'}
        </button>
        <button onClick={() => setShowFileShare((prev) => !prev)}>
          {showFileShare ? 'Hide Files' : 'Share File'}
        </button>
      </div>

      {showWhiteboard && <Whiteboard roomId={roomId} canvasRef={canvasRef} />}

      {showFileShare && (
        <div className="file-share">
          <input type="file" onChange={handleFileUpload} />
          <ul>
            {files.map((f, idx) => (
              <li key={idx}>
                <a href={f.fileData} download={f.fileName}>
                  {f.fileName}
                </a>{' '}
                (from {f.senderId})
              </li>
            ))}
          </ul>
        </div>
      )}

      <Chat messages={chatMessages} onSend={sendMessage} />
    </div>
  );
}

export default VideoRoom;
