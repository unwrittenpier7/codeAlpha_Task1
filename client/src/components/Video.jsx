// src/components/Video.jsx

import React, { useRef, useEffect } from 'react';

function Video({ peer }) {
  const videoRef = useRef();

  useEffect(() => {
    if (!peer) return;

    peer.on('stream', (stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    });

    return () => {
      peer.removeAllListeners('stream');
    };
  }, [peer]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      style={{ width: '300px', border: '2px solid #444', borderRadius: '8px', margin: '10px' }}
    />
  );
}

export default Video;
