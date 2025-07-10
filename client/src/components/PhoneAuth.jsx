import React, { useState, useEffect } from 'react';
import { signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../firebase';

const PhoneAuth = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [recaptchaReady, setRecaptchaReady] = useState(false);

  useEffect(() => {
    const setupRecaptcha = async () => {
      try {
        const { RecaptchaVerifier } = await import('firebase/auth');

        if (!window.recaptchaVerifier) {
          window.recaptchaVerifier = new RecaptchaVerifier(
            'recaptcha-container',
            {
              size: 'invisible',
              callback: (response) => {
                console.log('✅ reCAPTCHA solved:', response);
              },
              'expired-callback': () => {
                console.warn('⚠️ reCAPTCHA expired.');
              },
            },
            auth
          );

          await window.recaptchaVerifier.render();
          setRecaptchaReady(true);
        }
      } catch (err) {
        console.error('❌ Failed to initialize reCAPTCHA:', err);
      }
    };

    setupRecaptcha();
  }, []);

  const sendOTP = async () => {
    if (!recaptchaReady || !window.recaptchaVerifier) {
      alert('⚠️ reCAPTCHA not ready yet.');
      return;
    }

    if (!phone.startsWith('+')) {
      alert('⚠️ Use country code. e.g. +91...');
      return;
    }

    try {
      const confirmation = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      alert('✅ OTP sent!');
    } catch (error) {
      console.error('❌ OTP Error:', error);
      alert('Failed to send OTP: ' + error.message);
    }
  };

  const verifyOTP = async () => {
    try {
      const result = await confirmationResult.confirm(otp);
      alert('✅ Phone Verified!');
      onLoginSuccess(result.user);
    } catch (error) {
      alert('❌ Invalid OTP');
    }
  };

  return (
    <div>
      <h2>📱 Phone Login</h2>
      <input
        type="tel"
        placeholder="+91XXXXXXXXXX"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <button onClick={sendOTP} disabled={!recaptchaReady}>Send OTP</button>

      {confirmationResult && (
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
    </div>
  );
};

export default PhoneAuth;
