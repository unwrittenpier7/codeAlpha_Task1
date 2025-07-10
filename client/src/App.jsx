import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import VideoRoom from './components/VideoRoom';
import PhoneAuth from './components/PhoneAuth';
import './styles.css';

function App() {
  const [user, setUser] = useState(null);
  const [roomId, setRoomId] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGuestLogin = () => {
    const guestUser = {
      uid: 'guest_' + Date.now(),
      isGuest: true,
      phoneNumber: null,
    };
    setUser(guestUser);
  };

  return (
    <Router>
      <div className="app">
        <h1>🎥 Video Conference App</h1>
        {user ? (
          <LoggedInRoutes user={user} setUser={setUser} roomId={roomId} setRoomId={setRoomId} />
        ) : (
          <Routes>
            <Route
              path="/login"
              element={
                <div>
                  <PhoneAuth onLoginSuccess={(user) => setUser(user)} />
                  <hr />
                  <button onClick={handleGuestLogin}>Continue as Guest</button>
                </div>
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

const LoggedInRoutes = ({ user, setUser, roomId, setRoomId }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      if (!user.isGuest) {
        await signOut(auth);
      }
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleJoin = () => {
    if (roomId.trim()) {
      navigate(`/room/${roomId}`);
    } else {
      alert('Please enter a Room ID');
    }
  };

  return (
    <>
      <button onClick={handleLogout}>Logout</button>
      <div className="home">
        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <button onClick={handleJoin}>Join Room</button>
      </div>

      <Routes>
        <Route path="/room/:roomId" element={<VideoRoom user={user} />} />
        <Route path="/" element={<div>Welcome, {user.phoneNumber || 'Guest'}</div>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;
