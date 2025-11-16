// CLEAN REIMPLEMENTATION BELOW
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SongDetail from './SongDetail';
import VideoDetail from './VideoDetail';
import Login from './Login';

interface CleanSong {
  _id: string;
  title: string;
  images?: string[];
  videoUrl?: string;
  folder?: string;
  isChristmas?: boolean;
}
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function SongList() {
  const router = useRouter();
  const [songs, setSongs] = useState<CleanSong[]>([]);
  const [selectedSong, setSelectedSong] = useState<CleanSong | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [showChristmas, setShowChristmas] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentType, setContentType] = useState<'noten' | 'texte' | 'videos'>('texte');
  const [keyboardEnabled, setKeyboardEnabled] = useState(false);
  // Buttons-Array konnte reduziert werden (Direkt generiert beim Rendern) – keine separate Konstante nötig

  useEffect(() => { setIsAuthenticated(localStorage.getItem('notenverwaltung_authenticated') === 'true'); }, []);
  useEffect(() => { if (!isAuthenticated) { setKeyboardEnabled(false); return; } const t = setTimeout(() => setKeyboardEnabled(true), 300); return () => clearTimeout(t); }, [isAuthenticated]);

  const fetchSongs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/songs?type=${contentType}&minimal=1`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Fetch fehlgeschlagen');
  const data: CleanSong[] = await res.json();
  setSongs(data.map(s => ({ _id: s._id, title: s.title, folder: s.folder, images: s.images, videoUrl: s.videoUrl, isChristmas: s.isChristmas })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [contentType]);

  useEffect(() => { if (isAuthenticated) fetchSongs(); }, [isAuthenticated, contentType, fetchSongs]);

  const songsForLetter = useCallback((letter: string) => {
    const list = letter === '1' ? songs.filter(s => /^\d/.test(s.title)) : songs.filter(s => s.title.toUpperCase().startsWith(letter));
    return list.sort((a, b) => a.title.localeCompare(b.title));
  }, [songs]);
  const availableLetters = useCallback(() => { const used = new Set(songs.map(s => s.title[0]?.toUpperCase())); const out: string[] = []; if (songs.some(s => /^\d/.test(s.title))) out.push('1'); LETTERS.forEach(l => used.has(l) && out.push(l)); return out; }, [songs]);

  useEffect(() => {
  if (!keyboardEnabled) return; const h = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'h') { e.preventDefault(); setSelectedLetter(null); setSelectedSong(null); setShowChristmas(false); }
      else if (key === 'escape') {
        e.preventDefault();
        if (selectedSong) setSelectedSong(null);
        else if (selectedLetter) setSelectedLetter(null);
        else if (showChristmas) setShowChristmas(false);
      }
      if (selectedLetter && !selectedSong) { const list = songsForLetter(selectedLetter); const num = parseInt(e.key, 10); if (num >= 1 && num <= 9 && num <= list.length) { e.preventDefault(); setSelectedSong(list[num-1]); } }
      if (!selectedLetter && !selectedSong) { const L = e.key.toUpperCase(); const avail = availableLetters(); if (L === '1' && avail.includes('1')) { e.preventDefault(); setSelectedLetter('1'); } else if (LETTERS.includes(L) && avail.includes(L)) { e.preventDefault(); setSelectedLetter(L); } }
    }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [keyboardEnabled, selectedLetter, selectedSong, showChristmas, songsForLetter, availableLetters]);

  const logout = () => { localStorage.removeItem('notenverwaltung_authenticated'); setIsAuthenticated(false); setSelectedSong(null); setSelectedLetter(null); setShowChristmas(false); };
  const changeType = (t: 'noten' | 'texte' | 'videos') => { if (t !== contentType) { setContentType(t); setSelectedLetter(null); setSelectedSong(null); setShowChristmas(false); setSongs([]); } };

  const openSong = useCallback(async (song: CleanSong) => {
    if (!song.images && contentType !== 'videos') {
      try {
        const r = await fetch(`/api/song?folder=${encodeURIComponent(song.folder || song._id)}&type=${contentType}`, { cache: 'no-store' });
        if (r.ok) {
          const full = await r.json();
          setSongs(prev => prev.map(p => p._id === song._id ? { ...p, images: full.images } : p));
          setSelectedSong({ ...song, images: full.images });
          return;
        }
      } catch {}
    }
    setSelectedSong(song);
  }, [contentType]);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const christmasSongs = songs.filter(s => s.isChristmas);
  const hasChristmas = christmasSongs.length > 0 && contentType !== 'videos';

  if (!isAuthenticated) return <Login onLogin={() => setIsAuthenticated(true)} />;
  if (selectedSong) return contentType === 'videos' ? <VideoDetail song={selectedSong} onBack={() => setSelectedSong(null)} onHome={() => { setSelectedSong(null); setSelectedLetter(null); setShowChristmas(false); }} /> : <SongDetail song={selectedSong} onBack={() => setSelectedSong(null)} onHome={() => { setSelectedSong(null); setSelectedLetter(null); setShowChristmas(false); }} />;
  if (showChristmas) { const list = christmasSongs.sort((a,b)=>a.title.localeCompare(b.title)); return (
    <div className="d-flex flex-column" style={{ height: '100vh', background: '#1a1a1a' }}>
      <div className="flex-shrink-0 px-4 text-center text-white" style={{ paddingTop: 60, paddingBottom: 40 }}>
        <h1 className="mb-4" style={{ fontSize: '3rem', fontWeight: 300 }}>Weihnachtslieder</h1>
      </div>
      <div className="flex-grow-1 d-flex justify-content-center px-4" style={{ paddingBottom: 20 }}>
        <div className="text-center" style={{ maxWidth: 1500 }}>
          <div style={{ marginBottom: 20 }}><button className="btn btn-lg text-white" style={{ background: '#4a4a4a', border: '2px solid #6a6a6a', width: 120, height: 100, borderRadius: 14 }} onClick={() => setShowChristmas(false)}>←</button></div>
          {list.length === 0 ? <div className="text-white">Keine Weihnachtslieder</div> : (
            <div className="d-flex flex-wrap justify-content-center">
              {list.map(s => (
                <button key={s._id} className="btn btn-lg text-white" style={{ background: '#6a6a6a', border: '2px solid #8a8a8a', width: 288, height: 100, borderRadius: 14, margin: 5, padding: '15px 20px' }} onClick={() => openSong(s)}>
                  {s.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 d-flex justify-content-center align-items-center px-4" style={{ paddingBottom: 30, position: 'relative' }}>
        <div style={{ fontSize: '.9rem', color: '#fff' }}>ESC = Zurück | H = Home</div>
        <button onClick={toggleFullscreen} className="btn btn-secondary" style={{ position: 'absolute', right: 20 }}>⛶</button>
      </div>
    </div>
  ); }
  if (selectedLetter) { const list = songsForLetter(selectedLetter); return (
    <div className="d-flex flex-column" style={{ height: '100vh', background: '#1a1a1a' }}>
      <div className="flex-shrink-0 px-4 text-center text-white" style={{ paddingTop: 60, paddingBottom: 40 }}>
        <h1 className="mb-4" style={{ fontSize: '3rem', fontWeight: 300 }}>{selectedLetter === '1' ? 'Zahlen' : `Buchstabe ${selectedLetter}`}</h1>
      </div>
      <div className="flex-grow-1 d-flex justify-content-center px-4" style={{ paddingBottom: 20 }}>
        <div className="text-center" style={{ maxWidth: 1500 }}>
          <div style={{ marginBottom: 20 }}><button className="btn btn-lg text-white" style={{ background: '#4a4a4a', border: '2px solid #6a6a6a', width: 120, height: 100, borderRadius: 14 }} onClick={() => setSelectedLetter(null)}>←</button></div>
          {list.length === 0 ? <div className="text-white">Keine Songs</div> : <div className="d-flex flex-wrap justify-content-center">{list.map(s => <button key={s._id} className="btn btn-lg text-white" style={{ background: '#6a6a6a', border: '2px solid #8a8a8a', width: 288, height: 100, borderRadius: 14, margin: 5, padding: '15px 20px' }} onClick={() => openSong(s)}>{s.title}</button>)}</div>}
        </div>
      </div>
      <div className="flex-shrink-0 d-flex justify-content-center align-items-center px-4" style={{ paddingBottom: 30, position: 'relative' }}>
        <div style={{ fontSize: '.9rem', color: '#fff' }}>ESC = Zurück | H = Home</div>
        <button onClick={toggleFullscreen} className="btn btn-secondary" style={{ position: 'absolute', right: 20 }}>⛶</button>
      </div>
    </div> ); }
  const avail = availableLetters();
  if (loading && songs.length === 0) return <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', background: '#1a1a1a', color: '#fff' }}>Lade Songs...</div>;
  if (error) return <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', background: '#1a1a1a', color: '#fff' }}><div className="text-center"><h3 className="text-danger">Fehler</h3><p>{error}</p><button className="btn btn-primary" onClick={fetchSongs}>Erneut</button></div></div>;
  return (
    <div className="d-flex flex-column" style={{ height: '100vh', background: '#1a1a1a' }}>
      <div className="flex-shrink-0 px-4 text-white" style={{ paddingTop: 50, paddingBottom: 20 }}>
        <div className="d-flex flex-wrap justify-content-between align-items-center" style={{ gap: 15 }}>
          <h1 className="mb-0 text-center text-md-start" style={{ fontSize: '3rem', fontWeight: 300, flex: '1 1 260px' }}>
            Liedersammlung mit {contentType === 'noten' ? 'Noten' : contentType === 'videos' ? 'Videos' : 'Texten'}
          </h1>
          <div className="d-flex" style={{ gap: 10 }}>
            <button onClick={() => router.push('/admin')} className="btn btn-secondary" style={{ minWidth: 120, fontWeight: 600 }}>⚙️ Admin</button>
            <button onClick={toggleFullscreen} className="btn btn-outline-light" style={{ minWidth: 120, fontWeight: 600 }}>⛶ Vollbild</button>
          </div>
        </div>
      </div>
      <div className="d-flex justify-content-center mb-3" style={{ gap: 15 }}>
        {(['texte','noten','videos'] as const).map(t => <button key={t} onClick={() => changeType(t)} className={`btn btn-lg ${contentType===t?'btn-light':'btn-outline-light'}`} style={{ minWidth: 140, height: 60, fontSize: '1.2rem', fontWeight: 600 }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
        <button
          onClick={() => setShowChristmas(true)}
          className="btn btn-lg btn-outline-light"
          style={{ minWidth: 200, height: 60, fontSize: '1.1rem', fontWeight: 600 }}
          disabled={!hasChristmas}
        >
          Weihnachtslieder
        </button>
      </div>
      <div className="flex-grow-1 d-flex justify-content-center px-4" style={{ paddingBottom: 20 }}>
        <div className="text-center" style={{ maxWidth: 1470 }}>
          {avail.length === 0 ? <div className="text-white">Keine Inhalte</div> : <div className="d-flex flex-wrap justify-content-center">{(['1',...LETTERS]).map(b => { const ok = avail.includes(b); return <button key={b} className="btn btn-lg text-white" style={{ background: ok?'#6a6a6a':'#2a2a2a', border:'2px solid #8a8a8a', width:173, height:144, borderRadius:14, margin:5, opacity: ok?1:.3, fontSize:'2rem', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600 }} disabled={!ok} onClick={()=> ok && setSelectedLetter(b)}>{b}</button>; })}</div>}
        </div>
      </div>
      <div className="flex-shrink-0 d-flex justify-content-center align-items-center px-4" style={{ paddingBottom:30, position:'relative' }}>
        <div style={{ fontSize:'.9rem', color:'#fff' }}>ESC = Zurück | H = Home</div>
        <button onClick={logout} className="btn btn-outline-secondary" style={{ position:'absolute', left:20 }}>Logout</button>
      </div>
    </div>
  );
}
