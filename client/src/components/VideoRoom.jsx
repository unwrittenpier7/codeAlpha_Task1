import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { useParams } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import CryptoJS from 'crypto-js';
import Video from './Video';
import Whiteboard from './Whiteboard';

const socket = io('http://localhost:5000');
const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'fallback-secret-key';

function VideoRoom() {
  const { roomId } = useParams();
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showFileShare, setShowFileShare] = useState(false);
  const [peers, setPeers] = useState([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [files, setFiles] = useState([]);
  const userVideo = useRef();
  const screenVideo = useRef();
  const canvasRef = useRef();
  const peersRef = useRef([]);
  const streamRef = useRef();
  const screenStreamRef = useRef();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    setUser(auth.currentUser);

    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }

        socket.emit('join-room', roomId, socket.id);

        socket.on('user-connected', (userId) => {
          const peer = createPeer(userId, socket.id, stream);
          peersRef.current.push({ peerId: userId, peer });
          setPeers((users) => [...users, { peerId: userId, peer }]);
        });

        socket.on('user-disconnected', (userId) => {
          const peerObj = peersRef.current.find((p) => p.peerId === userId);
          if (peerObj) peerObj.peer.destroy();
          peersRef.current = peersRef.current.filter((p) => p.peerId !== userId);
          setPeers((users) => users.filter((u) => u.peerId !== userId));
        });

        socket.on('receive-signal', (payload) => {
          const decryptedSignal = CryptoJS.AES.decrypt(payload.signal, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
          const peer = addPeer(JSON.parse(decryptedSignal), payload.callerId, stream);
          peersRef.current.push({ peerId: payload.callerId, peer });
          setPeers((users) => [...users, { peerId: payload.callerId, peer }]);
        });

        socket.on('return-signal', (payload) => {
          const item = peersRef.current.find((p) => p.peerId === payload.id);
          if (item) {
            const decryptedSignal = CryptoJS.AES.decrypt(payload.signal, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
            item.peer.signal(JSON.parse(decryptedSignal));
          }
        });

        socket.on('receive-file', ({ fileName, fileData, senderId }) => {
          setFiles((prev) => [...prev, { fileName, fileData, senderId }]);
        });

        socket.on('receive-drawing', (data) => {
          if (canvasRef.current) {
            canvasRef.current.loadPaths(data);
          }
        });
      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    };

    setupMedia();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      socket.disconnect();
    };
  }, [roomId]);

  function createPeer(userToSignal, callerId, stream) {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on('signal', (signal) => {
      const encryptedSignal = CryptoJS.AES.encrypt(JSON.stringify(signal), ENCRYPTION_KEY).toString();
      socket.emit('send-signal', { userToSignal, callerId, signal: encryptedSignal });
    });
    return peer;
  }

  function addPeer(incomingSignal, callerId, stream) {
    const peer = new Peer({ initiator: false, trickle: false, stream });
    peer.on('signal', (signal) => {
      const encryptedSignal = CryptoJS.AES.encrypt(JSON.stringify(signal), ENCRYPTION_KEY).toString();
      socket.emit('return-signal', { signal: encryptedSignal, id: callerId });
    });
    peer.signal(incomingSignal);
    return peer;
  }

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = stream;
      if (screenVideo.current) {
        screenVideo.current.srcObject = stream;
      }
      setIsScreenSharing(true);
      peersRef.current.forEach(({ peer }) => {
        peer.replaceTrack(streamRef.current.getVideoTracks()[0], stream.getVideoTracks()[0], streamRef.current);
      });
      stream.getVideoTracks()[0].onended = () => stopScreenShare();
    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    setIsScreenSharing(false);
    peersRef.current.forEach(({ peer }) => {
      peer.replaceTrack(
        screenStreamRef.current?.getVideoTracks()[0],
        streamRef.current.getVideoTracks()[0],
        streamRef.current
      );
    });
  };

  const toggleMute = () => {
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && user) {
      const reader = new FileReader();
      reader.onload = () => {
        const fileData = reader.result;
        socket.emit('send-file', {
          fileName: file.name,
          fileData,
          senderId: user.uid,
          roomId,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileDownload = (fileName, fileData) => {
    const link = document.createElement('a');
    link.href = fileData;
    link.download = fileName;
    link.click();
  };

  const handleCanvasChange = async () => {
    const data = await canvasRef.current.exportPaths();
    socket.emit('send-drawing', { roomId, data });
  };

  return (
    <div className="video-room">
      {user ? (
        <>
          <div className="video-section">
            <video muted ref={userVideo} autoPlay playsInline />
            {isScreenSharing && <video ref={screenVideo} autoPlay playsInline />}
            {peers.map((peer) => (
              <Video key={peer.peerId} peer={peer.peer} />
            ))}
          </div>

          <div className="controls">
            <button onClick={isScreenSharing ? stopScreenShare : startScreenShare}>
              {isScreenSharing ? 'Stop Screen Share' : 'Start Screen Share'}
            </button>
            <button onClick={toggleMute}>
              {isMuted ? 'Unmute Mic' : 'Mute Mic'}
            </button>
            <button onClick={() => setShowFileShare((prev) => !prev)}>
              {showFileShare ? 'Hide File Share' : 'Show File Share'}
            </button>
            <button onClick={() => setShowWhiteboard((prev) => !prev)}>
              {showWhiteboard ? 'Hide Whiteboard' : 'Show Whiteboard'}
            </button>
          </div>

          {showFileShare && (
            <div className="file-share">
              <input type="file" onChange={handleFileUpload} />
              <h3>Shared Files:</h3>
              <ul>
                {files.map((file, index) => (
                  <li key={index}>
                    <a href="#" onClick={() => handleFileDownload(file.fileName, file.fileData)}>
                      {file.fileName}
                    </a> (from {file.senderId})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showWhiteboard && <Whiteboard roomId={roomId} />}
        </>
      ) : (
        <p>Authenticating...</p>
      )}
    </div>
  );
}

export default VideoRoom;
