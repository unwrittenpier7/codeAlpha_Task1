import React, { useState, useEffect, useRef } from 'react';
import socket from '../utils/socket'; // assume socket is initialized and exported from utils/socket.js

function Chat({ roomId, user }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const chatEndRef = useRef();

  useEffect(() => {
    socket.on('chat-message', ({ sender, content }) => {
      setMessages((prev) => [...prev, { sender, content }]);
    });

    return () => {
      socket.off('chat-message');
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    socket.emit('chat-message', {
      roomId,
      sender: user?.phoneNumber || user?.email || 'Guest',
      content: message,
    });

    setMessages((prev) => [...prev, { sender: 'You', content: message }]);
    setMessage('');
  };

  return (
    <div className="chat-box">
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx}>
            <strong>{msg.sender}: </strong>{msg.content}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={sendMessage} className="chat-input">
        <input
          type="text"
          value={message}
          placeholder="Type your message..."
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default Chat;
