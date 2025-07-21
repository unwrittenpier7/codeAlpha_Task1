import React from 'react';
import './Avatar.css';

function Avatar({ name, isMuted, isSpeaking }) {
  return (
    <div className={`avatar-container ${isSpeaking ? 'speaking' : ''}`}>
      <div className="avatar-circle">{name?.charAt(0).toUpperCase()}</div>
      <span className={`status ${isMuted ? 'muted' : 'unmuted'}`} />
      <p>{name}</p>
    </div>
  );
}

export default Avatar;
