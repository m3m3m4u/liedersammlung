'use client';

import { useState, useEffect } from 'react';
import SongDetail from './SongDetail';
import Login from './Login';

interface Song {
  _id: string;
  title: string;
  images?: string[];
}

export default function SongList() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [contentType, setContentType] = useState<'noten' | 'texte'>('texte'); // Startet standardmäßig bei Texten

  // Alphabet für Navigation plus Zahlen-Button
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const allButtons = ['1', ...alphabet]; // Zahlen-Button "1" am Anfang

  // Authentication Check beim Start
  useEffect(() => {
    const checkAuth = () => {
      const authStatus = localStorage.getItem('notenverwaltung_authenticated');
      setIsAuthenticated(authStatus === 'true');
    };
    
    checkAuth();
  }, []);

  // Hilfsfunktion um Titel vor öffnender Klammer umzubrechen
  const formatTitleWithLineBreak = (title: string) => {
    // Suche nach der ersten öffnenden Klammer und füge davor einen Zeilenumbruch ein
    const parts = title.split('(');
    if (parts.length > 1) {
      return (
        <>
          {parts[0].trim()}
          <br />
          ({parts.slice(1).join('(')}
        </>
      );
    }
    return title;
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSongs();
    }
  }, [isAuthenticated, contentType]); // Auch bei Änderung des contentType neu laden

  // Songs nach Buchstaben oder Zahlen filtern
  const getSongsForLetter = (letter: string) => {
    if (letter === '1') {
      // Für Zahlen-Button: Songs die mit Zahlen beginnen
      return songs.filter(song => 
        /^\d/.test(song.title)
      ).sort((a, b) => a.title.localeCompare(b.title));
    }
    return songs.filter(song => 
      song.title.toUpperCase().startsWith(letter)
    ).sort((a, b) => a.title.localeCompare(b.title));
  };

  // Verfügbare Buttons ermitteln (Zahlen + Buchstaben mit Songs)
  const getAvailableLetters = () => {
    const usedLetters = new Set(
      songs.map(song => song.title.charAt(0).toUpperCase())
    );
    const availableButtons = [];
    
    // Zahlen-Button hinzufügen wenn Songs mit Zahlen existieren
    const hasNumberSongs = songs.some(song => /^\d/.test(song.title));
    if (hasNumberSongs) {
      availableButtons.push('1');
    }
    
    // Buchstaben hinzufügen
    alphabet.forEach(letter => {
      if (usedLetters.has(letter)) {
        availableButtons.push(letter);
      }
    });
    
    return availableButtons;
  };

  // Tastatursteuerung für Navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key.toLowerCase()) {
        case 'h':
          // H = Home - zurück zur Hauptseite
          event.preventDefault();
          setSelectedLetter(null);
          setSelectedSong(null);
          break;
        case 'escape':
          // ESC = eine Ebene zurück
          event.preventDefault();
          if (selectedSong) {
            setSelectedSong(null); // Zurück zur Buchstaben-Seite
          } else if (selectedLetter) {
            setSelectedLetter(null); // Zurück zur Hauptseite
          }
          break;
      }

      // Auf Buchstaben-Seite: Zifferntasten für direkte Song-Auswahl
      if (selectedLetter && !selectedSong) {
        const songsForLetter = getSongsForLetter(selectedLetter);
        const num = parseInt(event.key);
        if (num >= 1 && num <= 9 && num <= songsForLetter.length) {
          event.preventDefault();
          setSelectedSong(songsForLetter[num - 1]);
        }
      }

      // Hauptseite: Buchstaben-Tasten und "1" für direkte Navigation
      if (!selectedLetter && !selectedSong) {
        const letter = event.key.toUpperCase();
        const availableLetters = getAvailableLetters();
        
        if (letter === '1' && availableLetters.includes('1')) {
          event.preventDefault();
          setSelectedLetter('1');
        } else if (alphabet.includes(letter) && availableLetters.includes(letter)) {
          event.preventDefault();
          setSelectedLetter(letter);
        }
        
        // F1 oder ? für Help Toggle
        if (event.key === 'F1' || event.key === '?') {
          event.preventDefault();
          setShowHelp(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [selectedSong, selectedLetter, songs, alphabet, showHelp]);

  const fetchSongs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/songs?type=${contentType}`);
      if (!response.ok) {
        throw new Error('Failed to fetch songs');
      }
      const data = await response.json();
      setSongs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Login-Handler
  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  // Logout-Handler
  const handleLogout = () => {
    localStorage.removeItem('notenverwaltung_authenticated');
    setIsAuthenticated(false);
    setSelectedSong(null);
    setSelectedLetter(null);
  };

  // Content-Type Umschaltung
  const handleContentTypeChange = (newType: 'noten' | 'texte') => {
    setContentType(newType);
    setSelectedSong(null);
    setSelectedLetter(null);
    setSongs([]); // Songs zurücksetzen für besseres UX
  };

  // Login-Ansicht anzeigen, wenn nicht authentifiziert
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Song-Detail-Ansicht
  if (selectedSong) {
    return (
      <SongDetail 
        song={selectedSong} 
        onBack={() => setSelectedSong(null)}
        onHome={() => {
          setSelectedSong(null);
          setSelectedLetter(null);
        }}
      />
    );
  }

  // Buchstaben-Seite (Songs für einen bestimmten Buchstaben)
  if (selectedLetter) {
    const songsForLetter = getSongsForLetter(selectedLetter);
    
    return (
      <div className="d-flex flex-column" style={{ height: '100vh', overflow: 'auto', background: '#1a1a1a' }}>
        {/* Header mit mehr Abstand von oben */}
        <div className="flex-shrink-0 px-4 text-center text-white" style={{ paddingTop: '60px', paddingBottom: '40px' }}>
          <div className="d-flex justify-content-center">
            <h1 className="mb-4" style={{ fontSize: '3rem', fontWeight: '300', color: '#f8f9fa', textAlign: 'center' }}>
              {selectedLetter === '1' ? 'Zahlen' : `Buchstabe ${selectedLetter}`}
            </h1>
          </div>
        </div>
        
        {/* Songs Navigation mit Abstand und Hover-Anzeige */}
        <div className="flex-grow-1 d-flex justify-content-center px-4" style={{ paddingTop: '20px', paddingBottom: '20px', minHeight: '0' }}>
          <div className="text-center">
            {songsForLetter.length === 0 ? (
              <div className="text-white">
                <h4>Keine Songs mit &quot;{selectedLetter}&quot; gefunden</h4>
                <p className="text-muted">
                  Keine Songs für diesen Buchstaben vorhanden
                </p>
              </div>
            ) : (
              <div 
                className="d-flex flex-wrap justify-content-center"
                style={{ 
                  maxWidth: '1500px', // Platz für 5 × 288px + Margins (≈1440px + Margins)
                  margin: '0 auto',
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'wrap'
                }}
              >
                {/* Zurück-Button in eigener Zeile */}
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                  <button
                    className="btn btn-lg text-white"
                    style={{ 
                      background: '#4a4a4a',
                      border: '2px solid #6a6a6a',
                      transition: 'all 0.3s ease',
                      fontSize: '1.8rem',
                      fontWeight: '300',
                      width: '120px',
                      height: '100px', // Gleiche Höhe wie Song-Buttons
                      borderRadius: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={() => setSelectedLetter(null)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#5a5a5a';
                      e.currentTarget.style.borderColor = '#7a7a7a';
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,255,255,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#4a4a4a';
                      e.currentTarget.style.borderColor = '#6a6a6a';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    ←
                  </button>
                </div>

                {/* Song-Buttons - 5 pro Zeile */}
                {songsForLetter.map((song) => (
                  <button
                    key={song._id}
                    className="btn btn-lg text-white"
                    style={{ 
                      background: '#6a6a6a',
                      border: '2px solid #8a8a8a',
                      transition: 'all 0.3s ease',
                      fontSize: '1.2rem',
                      fontWeight: '300',
                      width: '288px', // 20% breiter: 240px * 1.2 = 288px
                      height: '100px', // Erhöht von 80px auf 100px für 3 Zeilen
                      borderRadius: '14px',
                      cursor: 'pointer',
                      margin: '5px',
                      flexBasis: '288px', // 20% breiter: 240px * 1.2 = 288px
                      flexGrow: 0,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      padding: '15px 20px' // Mehr Padding oben/unten
                    }}
                    onClick={() => setSelectedSong(song)}
                    title={`${song.title} - ${song.images?.length || 0} Seite${(song.images?.length || 0) !== 1 ? 'n' : ''}`}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#7a7a7a';
                      e.currentTarget.style.borderColor = '#9a9a9a';
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,255,255,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#6a6a6a';
                      e.currentTarget.style.borderColor = '#8a8a8a';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ 
                      fontSize: song.title.length < 15 ? '1.5rem' : song.title.length <= 25 ? '1.7rem' : '1.3rem', // Angepasste Schriftgrößen: kurz kleiner, mittel und lang größer
                      fontWeight: 'bold', // Fettgedruckter Text
                      lineHeight: '1.3', // Bessere Zeilenhöhe
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'normal', // Erlaubt Zeilenumbruch
                      maxWidth: '240px', // 20% breiter: 200px * 1.2 = 240px
                      wordBreak: 'break-word', // Bricht lange Wörter um
                      display: '-webkit-box',
                      WebkitLineClamp: 3, // Maximal 3 Zeilen statt 2
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {formatTitleWithLineBreak(song.title)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tastatursteuerung immer im Footer */}
        <div className="flex-shrink-0 d-flex justify-content-center align-items-center px-4" style={{ paddingBottom: '30px', position: 'relative' }}>
          {/* Tastatursteuerung zentriert */}
          <div style={{ fontSize: '0.9rem', color: '#ffffff', textAlign: 'center' }}>
            <strong style={{ color: '#ffffff' }}>Steuerung:</strong> ESC = Zurück | H = Home | Klicken = Song auswählen
          </div>
          
          {/* Vollbild-Button rechts unten */}
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

  // Hauptseite mit A-Z Navigation
  const availableLetters = getAvailableLetters();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', background: '#1a1a1a' }}>
        <div className="text-white">
          <div className="spinner-border text-light me-3" role="status"></div>
          Lade Songs...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', background: '#1a1a1a' }}>
        <div className="text-center text-white">
          <h3 className="text-danger mb-3">Fehler beim Laden</h3>
          <p>{error}</p>
          <button onClick={fetchSongs} className="btn btn-primary">
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column" style={{ height: '100vh', overflow: 'auto', background: '#1a1a1a' }}>
      {/* Header mit mehr Abstand von oben */}
      <div className="flex-shrink-0 px-4 text-center text-white" style={{ paddingTop: '60px', paddingBottom: '40px' }}>
        <div className="d-flex justify-content-center">
          <h1 className="mb-4" style={{ fontSize: '3rem', fontWeight: '300', color: '#f8f9fa', textAlign: 'center' }}>
            Liedersammlung mit {contentType === 'noten' ? 'Noten' : 'Texten'}
          </h1>
        </div>
      </div>
      
      {/* Buchstaben-Navigation mit Abstand und Hover-Anzeige */}
      <div className="flex-grow-1 d-flex justify-content-center px-4" style={{ paddingTop: '20px', paddingBottom: '20px', minHeight: '0' }}>
        <div className="text-center">

          
          {availableLetters.length === 0 ? (
            <div className="text-white">
              <h4>Keine {contentType === 'noten' ? 'Noten' : 'Texte'} gefunden</h4>
              <p className="text-muted">
                Fügen Sie Ordner in <code>public/images/{contentType}/</code> hinzu
              </p>
            </div>
          ) : (
            <div 
              className="d-flex flex-wrap justify-content-center"
              style={{ 
                maxWidth: '1470px', // 9 × (120px + 30px margin) = 1350px + Puffer
                margin: '0 auto'
              }}
            >
              {allButtons.map((button) => {
                const isAvailable = availableLetters.includes(button);
                const songsCount = getSongsForLetter(button).length;
                
                return (
                  <button
                    key={button}
                    className={`btn btn-lg ${isAvailable ? 'text-white' : 'text-muted'}`}
                    style={{ 
                      background: isAvailable ? '#6a6a6a' : '#5a5a5a', // Noch heller gemacht
                      border: `2px solid ${isAvailable ? '#8a8a8a' : '#6a6a6a'}`, // Passend angepasst
                      transition: 'all 0.3s ease',
                      fontSize: '2.8rem', // Noch größer: von 2.2rem auf 2.8rem
                      fontWeight: '300',
                      width: '120px',
                      height: '120px',
                      borderRadius: '14px',
                      cursor: isAvailable ? 'pointer' : 'not-allowed',
                      margin: '15px',
                      flex: '0 0 120px'
                    }}
                    onClick={() => isAvailable && setSelectedLetter(button)}
                    disabled={!isAvailable}
                    title={isAvailable ? `${songsCount} Song${songsCount !== 1 ? 's' : ''}` : 'Keine Songs'}
                    onMouseEnter={(e) => {
                      if (isAvailable) {
                        e.currentTarget.style.background = '#7a7a7a'; // Noch hellerer Hover-Effekt
                        e.currentTarget.style.borderColor = '#9a9a9a';
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,255,255,0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isAvailable) {
                        e.currentTarget.style.background = '#6a6a6a'; // Zurück zu noch hellerem Standard
                        e.currentTarget.style.borderColor = '#8a8a8a';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    {button}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tastatursteuerung immer im Footer */}
      <div className="flex-shrink-0 d-flex flex-column justify-content-center align-items-center px-4" style={{ paddingBottom: '30px', position: 'relative' }}>
        {/* Umschalt-Buttons für Noten/Texte */}
        <div className="d-flex justify-content-center mb-3" style={{ gap: '15px' }}>
          <button
            onClick={() => handleContentTypeChange('texte')}
            className={`btn btn-lg ${contentType === 'texte' ? 'text-white' : 'text-muted'}`}
            style={{
              background: contentType === 'texte' ? '#6a6a6a' : '#4a4a4a',
              border: `2px solid ${contentType === 'texte' ? '#8a8a8a' : '#5a5a5a'}`,
              transition: 'all 0.3s ease',
              fontSize: '1.1rem',
              fontWeight: '400',
              padding: '8px 20px',
              borderRadius: '8px',
              minWidth: '80px'
            }}
            onMouseEnter={(e) => {
              if (contentType !== 'texte') {
                e.currentTarget.style.background = '#5a5a5a';
                e.currentTarget.style.borderColor = '#6a6a6a';
              }
            }}
            onMouseLeave={(e) => {
              if (contentType !== 'texte') {
                e.currentTarget.style.background = '#4a4a4a';
                e.currentTarget.style.borderColor = '#5a5a5a';
              }
            }}
          >
            Texte
          </button>
          <button
            onClick={() => handleContentTypeChange('noten')}
            className={`btn btn-lg ${contentType === 'noten' ? 'text-white' : 'text-muted'}`}
            style={{
              background: contentType === 'noten' ? '#6a6a6a' : '#4a4a4a',
              border: `2px solid ${contentType === 'noten' ? '#8a8a8a' : '#5a5a5a'}`,
              transition: 'all 0.3s ease',
              fontSize: '1.1rem',
              fontWeight: '400',
              padding: '8px 20px',
              borderRadius: '8px',
              minWidth: '80px'
            }}
            onMouseEnter={(e) => {
              if (contentType !== 'noten') {
                e.currentTarget.style.background = '#5a5a5a';
                e.currentTarget.style.borderColor = '#6a6a6a';
              }
            }}
            onMouseLeave={(e) => {
              if (contentType !== 'noten') {
                e.currentTarget.style.background = '#4a4a4a';
                e.currentTarget.style.borderColor = '#5a5a5a';
              }
            }}
          >
            Noten
          </button>
        </div>
        
        {/* Logout-Button links */}
        <button
          onClick={handleLogout}
          className="btn btn-outline-secondary"
          style={{
            position: 'absolute',
            left: '20px',
            bottom: '30px',
            fontSize: '0.7rem',
            padding: '4px 8px',
            borderRadius: '6px',
            background: 'transparent',
            border: '1px solid #666',
            color: '#aaa',
            opacity: 0.6,
            transition: 'opacity 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.6';
            e.currentTarget.style.color = '#aaa';
          }}
          title="Abmelden"
        >
          Logout
        </button>
        
        {/* Tastatursteuerung zentriert */}
        <div style={{ fontSize: '0.9rem', color: '#ffffff', textAlign: 'center' }}>
          <strong style={{ color: '#ffffff' }}>Steuerung:</strong> 1,  A-Z = zu den Songs | ESC = Zurück | H = Home | Pfeiltasten: umblättern
        </div>
        
        {/* Vollbild-Button rechts unten */}
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
