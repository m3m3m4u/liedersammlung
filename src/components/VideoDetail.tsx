'use client';

import { useEffect } from 'react';

interface Song {
  _id: string;
  title: string;
  videoUrl?: string;
}

interface VideoDetailProps {
  song: Song;
  onBack: () => void;
  onHome: () => void;
}

// Hilfsfunktion um YouTube-URL in Embed-URL zu konvertieren
function getYouTubeEmbedUrl(url: string): string {
  // Verschiedene YouTube-URL-Formate verarbeiten
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}?autoplay=0&rel=0&modestbranding=1`;
  }
  
  // Falls keine gültige YouTube-URL, Original zurückgeben
  return url;
}

export default function VideoDetail({ song, onBack, onHome }: VideoDetailProps) {
  // Tastatursteuerung
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key.toLowerCase()) {
        case 'h':
          // H = Home
          event.preventDefault();
          onHome();
          break;
        case 'escape':
          // ESC = Zurück
          event.preventDefault();
          onBack();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [onBack, onHome]);

  const embedUrl = song.videoUrl ? getYouTubeEmbedUrl(song.videoUrl) : '';

  return (
    <div className="d-flex flex-column" style={{ height: '100vh', background: '#1a1a1a', color: 'white' }}>
      {/* Header */}
      <div className="flex-shrink-0 d-flex justify-content-between align-items-center p-4" style={{ borderBottom: '1px solid #333' }}>
        <button
          onClick={onBack}
          className="btn text-white"
          style={{ 
            background: '#4a4a4a',
            border: '1px solid #6a6a6a',
            fontSize: '1.2rem',
            padding: '10px 20px',
            borderRadius: '8px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#5a5a5a';
            e.currentTarget.style.borderColor = '#7a7a7a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#4a4a4a';
            e.currentTarget.style.borderColor = '#6a6a6a';
          }}
        >
          ← Zurück
        </button>
        
        <h1 className="text-center m-0" style={{ 
          fontSize: '1.8rem', 
          fontWeight: '300',
          maxWidth: '60%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {song.title}
        </h1>
        
        <button
          onClick={onHome}
          className="btn text-white"
          style={{ 
            background: '#4a4a4a',
            border: '1px solid #6a6a6a',
            fontSize: '1.2rem',
            padding: '10px 20px',
            borderRadius: '8px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#5a5a5a';
            e.currentTarget.style.borderColor = '#7a7a7a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#4a4a4a';
            e.currentTarget.style.borderColor = '#6a6a6a';
          }}
        >
          Home
        </button>
      </div>

      {/* Video Container */}
      <div className="flex-grow-1 d-flex justify-content-center align-items-center p-4">
        {song.videoUrl ? (
          <div style={{ 
            width: '100%', 
            maxWidth: '1600px', // Erhöht von 1200px auf 1600px
            aspectRatio: '16/9',
            background: '#000',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <iframe
              src={embedUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none'
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={song.title}
            />
          </div>
        ) : (
          <div className="text-center">
            <h3 className="text-muted mb-3">Kein Video verfügbar</h3>
            <p className="text-muted">Für diesen Song ist kein YouTube-Video hinterlegt.</p>
          </div>
        )}
      </div>

      {/* Footer mit Steuerungshinweisen */}
      <div className="flex-shrink-0 d-flex justify-content-center align-items-center p-4" style={{ borderTop: '1px solid #333' }}>
        <div style={{ fontSize: '0.9rem', color: '#aaa', textAlign: 'center' }}>
          <strong>Steuerung:</strong> ESC = Zurück | H = Home
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
            position: 'absolute',
            right: '20px',
            fontSize: '0.8rem',
            padding: '8px 12px',
            borderRadius: '8px',
            background: '#444',
            border: '1px solid #666',
            color: '#fff'
          }}
          title="Vollbild umschalten"
        >
          ⛶
        </button>
      </div>
    </div>
  );
}
