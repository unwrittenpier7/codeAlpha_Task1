// src/components/Whiteboard.jsx

import React, { useRef, useEffect } from 'react';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import io from 'socket.io-client';

const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');

function Whiteboard({ roomId }) {
  const canvasRef = useRef();

  useEffect(() => {
    socket.on('receive-drawing', (data) => {
      if (canvasRef.current) {
        canvasRef.current.loadPaths(data);
      }
    });

    return () => {
      socket.off('receive-drawing');
    };
  }, []);

  const handleCanvasChange = async () => {
    const data = await canvasRef.current.exportPaths();
    socket.emit('send-drawing', { roomId, data });
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <ReactSketchCanvas
        ref={canvasRef}
        strokeWidth={4}
        strokeColor="black"
        canvasColor="white"
        width="500px"
        height="300px"
        onChange={handleCanvasChange}
        style={{ border: '1px solid #ccc', borderRadius: '4px' }}
      />
    </div>
  );
}

export default Whiteboard;
