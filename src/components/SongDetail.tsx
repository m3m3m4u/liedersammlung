'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  const [preloadedImages, setPreloadedImages] = useState<Set<number>>(new Set());
  // Fortschritt entfernt (nicht genutzt im UI) – kann bei Bedarf wieder angezeigt werden
  
  // Touch/Swipe functionality
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchEndY = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const images = useMemo(() => song.images || [], [song.images]);
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

  // Erstes Bild gilt als vorgeladen (Index 0)
  useEffect(() => {
    if (images.length) {
      setPreloadedImages(new Set([0]));
    }
  }, [images]);

  const nextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Touch/Swipe Handler
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!hasMultipleImages) return;
    
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  }, [hasMultipleImages]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!hasMultipleImages) return;
    
    const touch = e.touches[0];
    touchEndX.current = touch.clientX;
    touchEndY.current = touch.clientY;
  }, [hasMultipleImages]);

  const handleTouchEnd = useCallback(() => {
    if (!hasMultipleImages) return;
    
    const deltaX = touchStartX.current - touchEndX.current;
    const deltaY = Math.abs(touchStartY.current - touchEndY.current);
    
    // Mindest-Swipe-Distanz und maximal erlaubte vertikale Bewegung
    const minSwipeDistance = 80; // Erhöht für präzisere Gesten
    const maxVerticalMovement = 120; // Toleranter für diagonale Bewegungen
    
    // Nur horizontale Swipes beachten (nicht bei vertikalem Scrollen)
    if (Math.abs(deltaX) > minSwipeDistance && deltaY < maxVerticalMovement) {
      // Verhältnis prüfen: horizontale Bewegung sollte dominieren
      const horizontalToVerticalRatio = Math.abs(deltaX) / (deltaY + 1);
      
      if (horizontalToVerticalRatio > 1.5) { // Horizontale Bewegung muss dominieren
        if (deltaX > 0) {
          // Swipe nach links = nächstes Bild
          nextImage();
        } else {
          // Swipe nach rechts = vorheriges Bild  
          prevImage();
        }
      }
    }
    
    // Reset touch positions
    touchStartX.current = 0;
    touchStartY.current = 0;
    touchEndX.current = 0;
    touchEndY.current = 0;
  }, [hasMultipleImages, nextImage, prevImage]);

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
  }, [hasMultipleImages, onBack, nextImage, prevImage]);

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
            <h1 className="mb-0 text-white song-detail-title" style={{ fontSize: '2rem', fontWeight: '300', color: '#f8f9fa' }}>
              {song.title}
            </h1>
          </div>
          
          {/* Rechte Spalte: Alle Navigation Buttons */}
          <div className="d-flex" style={{ gap: '10px' }}>
            {/* Home-Button */}
            <button 
              onClick={() => onHome && onHome()}
              className="btn btn-lg text-white song-detail-nav-button"
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
              className="btn btn-lg text-white song-detail-nav-button"
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
                  className="btn btn-lg text-white song-detail-arrow-button"
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
                    className={`btn btn-lg song-detail-page-button ${index === currentImageIndex ? '' : 'text-white'}`}
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
                      boxShadow: index === currentImageIndex ? '0 4px 15px rgba(255,255,255,0.3)' : 'none',
                      position: 'relative'
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
                  className="btn btn-lg text-white song-detail-arrow-button"
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
      <div 
        ref={containerRef}
        style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          width: '100%',
          flex: '1',
          minHeight: '0'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          width: '100%', 
          textAlign: 'center',
          marginBottom: '10px',
          position: 'relative'
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
              margin: '0 auto',
              // Übergang für smooth loading bei preloaded images
              opacity: preloadedImages.has(currentImageIndex) ? 1 : 0.8,
              transition: 'opacity 0.1s ease'
            }}
            priority={currentImageIndex === 0} // Erste Seite hat Priority
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyLli5i3Aw6p3XS59OOuuxJaajjzRwgSXq4q71/wE0fDXXOe2IiKAAAAAA//2Q=="
            onLoadingComplete={() => {
              setPreloadedImages(prev => {
                if (prev.has(currentImageIndex)) return prev;
                const n = new Set(prev);
                n.add(currentImageIndex);
                return n;
              });
            }}
          />
          
          {/* Unsichtbare Preloading-Bilder für bessere Performance */}
          {hasMultipleImages && (
            <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
              {/* Lade das nächste und vorherige Bild unsichtbar vor */}
              {images.map((imageSrc, index) => {
                // Nur die nächsten 2 und vorherigen 2 Bilder preloaden für bessere Performance
                const isNearby = Math.abs(index - currentImageIndex) <= 2 || 
                                 (currentImageIndex === 0 && index >= images.length - 2) ||
                                 (currentImageIndex >= images.length - 2 && index <= 2);
                
                if (index !== currentImageIndex && isNearby) {
                  return (
                    <Image
                      key={`preload-${index}`}
                      src={imageSrc}
                      alt=""
                      width={1200}
                      height={900}
                      style={{ display: 'none' }}
                      priority={false}
                    />
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
        
        {/* Footer mit Tastatursteuerung - direkt unter dem Bild */}
        <div className="flex-shrink-0 d-flex justify-content-center align-items-center px-4" style={{ position: 'relative' }}>
          {/* Tastatursteuerung zentriert */}
          <div style={{ fontSize: '0.9rem', color: '#ffffff', textAlign: 'center' }}>
            <strong style={{ color: '#ffffff' }}>Steuerung:</strong> ← → = Blättern | Wischen = Blättern | ESC = Zurück | H = Home | 1-9 = Direkte Seitenauswahl
          </div>
        </div>

        {/* Swipe-Hinweis nur auf Touch-Geräten anzeigen */}
        {hasMultipleImages && (
          <div className="d-block d-md-none text-center" style={{ padding: '10px 0 5px 0' }}>
            <small style={{ fontSize: '0.8rem', color: '#aaaaaa', opacity: 0.8 }}>
              💡 <strong>Tipp:</strong> Wischen zum Blättern zwischen den Seiten
            </small>
          </div>
        )}
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
