'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface SongDetailProps {
  song: {
    _id: string;
    title: string;
    images?: string[];
  };
  onBack: () => void;
  onHome?: () => void; // Neue Prop für Home-Navigation
}

export default function SongDetail({ song, onBack, onHome }: SongDetailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [availableHeight, setAvailableHeight] = useState(0);
  
  const images = song.images || [];
  const hasMultipleImages = images.length > 1;

  // Verfügbare Höhe messen
  useEffect(() => {
    const calculateAvailableHeight = () => {
      const windowHeight = window.innerHeight;
      // Reduzierte Höhen für mehr Platz für das Bild
      const headerHeight = 60; // Header
      const navigationHeight = 90; // Navigation buttons
      const footerHeight = 40; // Footer
      const padding = 20; // Padding
      
      const available = windowHeight - headerHeight - navigationHeight - footerHeight - padding;
      setAvailableHeight(Math.max(available, 500)); // Mindestens 500px
      
      console.log('Verfügbare Höhe für Bild:', available + 'px');
    };

    calculateAvailableHeight();
    window.addEventListener('resize', calculateAvailableHeight);
    
    return () => window.removeEventListener('resize', calculateAvailableHeight);
  }, []);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Tastatursteuerung
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key.toLowerCase()) {
        case 'arrowleft':
        case 'arrowup':
        case 'pageup':
          event.preventDefault();
          if (hasMultipleImages) prevImage();
          break;
        case 'arrowright':
        case 'arrowdown':
        case 'pagedown':
          event.preventDefault();
          if (hasMultipleImages) nextImage();
          break;
        case 'escape':
          event.preventDefault();
          onBack();
          break;
        case 'h':
          // H = Home - zurück zur Hauptseite (wird durch Parent Component behandelt)
          event.preventDefault();
          onBack();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [hasMultipleImages, onBack]);

  if (images.length === 0) {
    return (
      <div className="container mt-5">
        <button 
          onClick={onBack}
          className="btn btn-secondary mb-3"
        >
          ← Zurück zur Übersicht
        </button>
        <h2>{song.title}</h2>
        <p>Keine Noten-Bilder verfügbar für diesen Song.</p>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column" style={{ height: '100vh', overflow: 'hidden', background: '#1a1a1a' }}>
      {/* Header mit zwei Spalten: Titel links, Schaltflächen rechts */}
      <div className="flex-shrink-0 px-4" style={{ paddingTop: '10px', paddingBottom: '5px' }}>
        <div className="d-flex justify-content-between align-items-center" style={{ width: '100%' }}>
          {/* Linke Spalte: Titel */}
          <div className="flex-grow-1">
            <h1 className="mb-0 text-white" style={{ fontSize: '2rem', fontWeight: '300', color: '#f8f9fa' }}>
              {song.title}
            </h1>
          </div>
          
          {/* Rechte Spalte: Alle Navigation Buttons */}
          <div className="d-flex" style={{ gap: '10px' }}>
            {/* Home-Button */}
            <button 
              onClick={() => onHome && onHome()}
              className="btn btn-lg text-white"
              style={{ 
                background: '#3a3a3a',
                border: '2px solid #5a5a5a',
                transition: 'all 0.3s ease',
                fontSize: '0.9rem',
                fontWeight: '400',
                width: '80px',
                height: '80px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              title="Zur Startseite"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#4a4a4a';
                e.currentTarget.style.borderColor = '#6a6a6a';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,255,255,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#3a3a3a';
                e.currentTarget.style.borderColor = '#5a5a5a';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              HOME
            </button>

            {/* Zurück-Button */}
            <button 
              onClick={onBack}
              className="btn btn-lg text-white"
              style={{ 
                background: '#4a4a4a',
                border: '2px solid #6a6a6a',
                transition: 'all 0.3s ease',
                fontSize: '0.9rem',
                fontWeight: '400',
                width: '80px',
                height: '80px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              title="Zurück zur Liste"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#5a5a5a';
                e.currentTarget.style.borderColor = '#7a7a7a';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,255,255,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#4a4a4a';
                e.currentTarget.style.borderColor = '#6a6a6a';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              ZURÜCK
            </button>

            {/* Pfeil-Buttons und Seitennummern bei mehreren Bildern */}
            {hasMultipleImages && (
              <>
                {/* Linker Pfeil */}
                <button 
                  onClick={prevImage}
                  className="btn btn-lg text-white"
                  style={{ 
                    background: '#6a6a6a',
                    border: '2px solid #8a8a8a',
                    transition: 'all 0.3s ease',
                    fontSize: '1.8rem',
                    fontWeight: '300',
                    width: '80px',
                    height: '80px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                  title="Vorherige Seite"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#7a7a7a';
                    e.currentTarget.style.borderColor = '#9a9a9a';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,255,255,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#6a6a6a';
                    e.currentTarget.style.borderColor = '#8a8a8a';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  ←
                </button>
                
                {/* Seitennummern - aktive Seite mit schwarzem Text auf weißem Hintergrund */}
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`btn btn-lg ${index === currentImageIndex ? '' : 'text-white'}`}
                    style={{ 
                      background: index === currentImageIndex ? '#ffffff' : '#6a6a6a',
                      border: `3px solid ${index === currentImageIndex ? '#ffffff' : '#8a8a8a'}`,
                      color: index === currentImageIndex ? '#000000' : '#ffffff',
                      transition: 'all 0.3s ease',
                      fontSize: '1.4rem',
                      fontWeight: index === currentImageIndex ? 'bold' : '300',
                      width: '80px',
                      height: '80px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: index === currentImageIndex ? '0 4px 15px rgba(255,255,255,0.3)' : 'none'
                    }}
                    title={`Seite ${index + 1} ${index === currentImageIndex ? '(aktuell)' : ''}`}
                    onMouseEnter={(e) => {
                      if (index !== currentImageIndex) {
                        e.currentTarget.style.background = '#7a7a7a';
                        e.currentTarget.style.borderColor = '#9a9a9a';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,255,255,0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (index !== currentImageIndex) {
                        e.currentTarget.style.background = '#6a6a6a';
                        e.currentTarget.style.borderColor = '#8a8a8a';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    {index + 1}
                  </button>
                ))}
                
                {/* Rechter Pfeil */}
                <button 
                  onClick={nextImage}
                  className="btn btn-lg text-white"
                  style={{ 
                    background: '#6a6a6a',
                    border: '2px solid #8a8a8a',
                    transition: 'all 0.3s ease',
                    fontSize: '1.8rem',
                    fontWeight: '300',
                    width: '80px',
                    height: '80px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                  title="Nächste Seite"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#7a7a7a';
                    e.currentTarget.style.borderColor = '#9a9a9a';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,255,255,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#6a6a6a';
                    e.currentTarget.style.borderColor = '#8a8a8a';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  →
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Bild-Container - zentriert mit kompaktem Layout */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        width: '100%',
        flex: '1',
        minHeight: '0'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          width: '100%', 
          textAlign: 'center',
          marginBottom: '10px'
        }}>
          <Image
            key={currentImageIndex}
            src={images[currentImageIndex]}
            alt={`${song.title} - Seite ${currentImageIndex + 1}`}
            width={1200}
            height={900}
            style={{ 
              height: availableHeight > 0 ? `${availableHeight}px` : '750px', // Nutzt die volle verfügbare Höhe
              maxWidth: 'calc(100vw - 40px)', // Passt in die Fensterbreite
              width: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 4px rgba(255,255,255,0.05))',
              borderRadius: '4px',
              display: 'block',
              margin: '0 auto'
            }}
            priority
          />
        </div>
        
        {/* Footer mit Tastatursteuerung - direkt unter dem Bild */}
        <div className="flex-shrink-0 d-flex justify-content-center align-items-center px-4" style={{ position: 'relative' }}>
          {/* Tastatursteuerung zentriert */}
          <div style={{ fontSize: '0.9rem', color: '#ffffff', textAlign: 'center' }}>
            <strong style={{ color: '#ffffff' }}>Steuerung:</strong> ← → = Blättern | ESC = Zurück | H = Home | 1-9 = Direkte Seitenauswahl
          </div>
        </div>
      </div>
      
      {/* Vollbild-Button - fixiert am rechten Rand des Viewports */}
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
          background: '#444',
          border: '1px solid #666',
          color: '#fff',
          zIndex: 1000
        }}
        title="Vollbild umschalten"
      >
        ⛶
      </button>
    </div>
  );
}
