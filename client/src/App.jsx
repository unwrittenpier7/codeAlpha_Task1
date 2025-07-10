import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import VideoRoom from './components/VideoRoom';
import PhoneAuth from './components/PhoneAuth'; // if used
import './styles.css';

function App() {
  const [user, setUser] = useState(null);
  const [roomId, setRoomId] = useState('');
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, [auth]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <Router>
      <div className="app">
        <h1>Video Conference App</h1>
        {user ? (
          <>
            <button onClick={handleLogout}>Logout</button>
            <div className="home">
              <input
                type="text"
                placeholder="Enter Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
              <a href={`/room/${roomId}`}>Join Room</a>
            </div>
            <Routes>
              <Route path="/room/:roomId" element={<VideoRoom />} />
              <Route path="/" element={<div />} />
            </Routes>
          </>
        ) : (
          <Routes>
            <Route path="/login" element={<PhoneAuth onLoginSuccess={(user) => setUser(user)} />} />
            <Route path="*" element={<p>Logging in or redirecting...</p>} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;
