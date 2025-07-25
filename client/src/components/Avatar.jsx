import React from 'react';
import './Avatar.css';

function Avatar({ name = 'User', muted = false }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className={`avatar ${muted ? 'muted' : ''}`}>
      <div className="avatar-initials">{initials}</div>
      {muted && <span className="muted-indicator">🔇</span>}
    </div>
  );
}

export default Avatar;
