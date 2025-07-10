// src/components/PhoneAuth.jsx

import React, { useState } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../firebase';

function PhoneAuth({ onLoginSuccess }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('Recaptcha verified');
        },
      });
    }
  };

  const sendOTP = async () => {
    setError('');
    setLoading(true);
    setupRecaptcha();
    const appVerifier = window.recaptchaVerifier;

    try {
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(result);
    } catch (err) {
      setError('Failed to send OTP. Make sure the number is valid.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp || !confirmationResult) return;

    try {
      const result = await confirmationResult.confirm(otp);
      console.log('User signed in:', result.user);
      if (onLoginSuccess) onLoginSuccess(result.user);
    } catch (err) {
      setError('Invalid OTP. Please try again.');
      console.error(err);
    }
  };

  return (
    <div className="phone-auth">
      <h2>Login with Phone</h2>

      {!confirmationResult ? (
        <>
          <input
            type="tel"
            placeholder="+1XXXXXXXXXX"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <button onClick={sendOTP} disabled={loading}>
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </>
      ) : (
        <>
          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <button onClick={verifyOTP}>Verify OTP</button>
        </>
      )}

      <div id="recaptcha-container"></div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default PhoneAuth;
