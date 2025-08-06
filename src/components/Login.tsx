'use client';

import { useState } from 'react';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Das Passwort - ändern Sie es nach Ihren Wünschen
  const CORRECT_PASSWORD = '12345'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Kleine Verzögerung für UX
    await new Promise(resolve => setTimeout(resolve, 500));

    if (password === CORRECT_PASSWORD) {
      // Passwort korrekt - Login speichern
      localStorage.setItem('notenverwaltung_authenticated', 'true');
      onLogin();
    } else {
      setError('Falsches Passwort');
      setPassword('');
    }
    
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSubmit(fakeEvent);
    }
  };

  return (
    <div 
      className="d-flex flex-column justify-content-center align-items-center" 
      style={{ 
        height: '100vh', 
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
        color: '#ffffff'
      }}
    >
      {/* Logo/Titel */}
      <div className="text-center mb-5">
        <h1 style={{ 
          fontSize: '3.5rem', 
          fontWeight: '300', 
          color: '#f8f9fa',
          marginBottom: '10px',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          🎵 Liedersammlung
        </h1>
        <p style={{ 
          fontSize: '1.2rem', 
          color: '#cccccc',
          opacity: 0.8 
        }}>
          Bitte geben Sie das Passwort ein
        </p>
      </div>

      {/* Login Form */}
      <div 
        className="card" 
        style={{ 
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '15px',
          padding: '40px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          minWidth: '400px'
        }}
      >
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label 
              htmlFor="password" 
              className="form-label" 
              style={{ 
                fontSize: '1.1rem', 
                fontWeight: '500',
                color: '#ffffff',
                marginBottom: '15px',
                display: 'block'
              }}
            >
              Passwort:
            </label>
            <input
              type="password"
              id="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              autoFocus
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '1.2rem',
                padding: '15px 20px',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.6)';
                e.target.style.boxShadow = '0 0 20px rgba(255,255,255,0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                e.target.style.boxShadow = 'none';
              }}
              placeholder="Passwort eingeben..."
            />
          </div>

          {error && (
            <div 
              className="alert alert-danger mb-4" 
              style={{ 
                background: 'rgba(220,53,69,0.2)',
                border: '1px solid rgba(220,53,69,0.4)',
                color: '#ff6b6b',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '1rem'
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={isLoading || !password.trim()}
            style={{
              background: 'linear-gradient(45deg, #4a90e2, #5ba0f2)',
              border: 'none',
              borderRadius: '10px',
              padding: '15px',
              fontSize: '1.2rem',
              fontWeight: '500',
              transition: 'all 0.3s ease',
              opacity: isLoading || !password.trim() ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!isLoading && password.trim()) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 5px 15px rgba(74,144,226,0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Wird überprüft...
              </>
            ) : (
              'Anmelden'
            )}
          </button>
        </form>

        {/* Hilfe */}
        <div className="text-center mt-4">
          <small style={{ color: '#aaaaaa', fontSize: '0.9rem' }}>
            <strong>Tipp:</strong> Drücken Sie Enter zum Anmelden
          </small>
        </div>
      </div>

      {/* Vollbild-Button */}
      <button
        onClick={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
        }}
        className="btn btn-secondary"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          fontSize: '0.8rem',
          padding: '8px 12px',
          borderRadius: '8px',
          background: 'rgba(68,68,68,0.8)',
          border: '1px solid rgba(102,102,102,0.8)',
          color: '#fff',
          zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}
        title="Vollbild umschalten"
      >
        ⛶
      </button>
    </div>
  );
}
