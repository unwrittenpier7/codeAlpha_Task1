// hooks/useWebRTC.js
import { useRef, useEffect, useState } from 'react';
import Peer from 'simple-peer';
import io from 'socket.io-client';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'fallback-secret-key';
const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');

export default function useWebRTC(roomId, localStream, currentUser) {
  const [peers, setPeers] = useState([]);
  const peersRef = useRef([]);

  useEffect(() => {
    socket.emit('join-room', roomId, socket.id);

    socket.on('user-connected', (userId) => {
      const peer = createPeer(userId, socket.id, localStream);
      peersRef.current.push({ peerId: userId, peer });
      setPeers((prev) => [...prev, { peerId: userId, peer }]);
    });

    socket.on('user-disconnected', (userId) => {
      const peerObj = peersRef.current.find((p) => p.peerId === userId);
      if (peerObj) peerObj.peer.destroy();
      peersRef.current = peersRef.current.filter(p => p.peerId !== userId);
      setPeers((prev) => prev.filter(p => p.peerId !== userId));
    });

    socket.on('receive-signal', ({ signal, callerId }) => {
      const decrypted = CryptoJS.AES.decrypt(signal, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
      const peer = addPeer(JSON.parse(decrypted), callerId, localStream);
      peersRef.current.push({ peerId: callerId, peer });
      setPeers((prev) => [...prev, { peerId: callerId, peer }]);
    });

    socket.on('return-signal', ({ signal, id }) => {
      const peerObj = peersRef.current.find(p => p.peerId === id);
      if (peerObj) {
        const decrypted = CryptoJS.AES.decrypt(signal, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
        peerObj.peer.signal(JSON.parse(decrypted));
      }
    });

    return () => socket.disconnect();
  }, [roomId, localStream]);

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

  return { peers };
}
