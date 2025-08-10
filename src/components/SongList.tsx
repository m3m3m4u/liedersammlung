// CLEAN REIMPLEMENTATION BELOW
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SongDetail from './SongDetail';
import VideoDetail from './VideoDetail';
import Login from './Login';

interface CleanSong { _id: string; title: string; images?: string[]; videoUrl?: string; }
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function SongList() {
  const router = useRouter();
  const [songs, setSongs] = useState<CleanSong[]>([]);
  const [selectedSong, setSelectedSong] = useState<CleanSong | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
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
      const res = await fetch(`/api/songs?type=${contentType}`);
      if (!res.ok) throw new Error('Fetch fehlgeschlagen');
      setSongs(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    } finally { setLoading(false); }
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
      if (key === 'h') { e.preventDefault(); setSelectedLetter(null); setSelectedSong(null); }
      else if (key === 'escape') { e.preventDefault(); if (selectedSong) setSelectedSong(null); else if (selectedLetter) setSelectedLetter(null); }
      if (selectedLetter && !selectedSong) { const list = songsForLetter(selectedLetter); const num = parseInt(e.key, 10); if (num >= 1 && num <= 9 && num <= list.length) { e.preventDefault(); setSelectedSong(list[num-1]); } }
      if (!selectedLetter && !selectedSong) { const L = e.key.toUpperCase(); const avail = availableLetters(); if (L === '1' && avail.includes('1')) { e.preventDefault(); setSelectedLetter('1'); } else if (LETTERS.includes(L) && avail.includes(L)) { e.preventDefault(); setSelectedLetter(L); } }
    }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [keyboardEnabled, selectedLetter, selectedSong, songsForLetter, availableLetters]);

  const logout = () => { localStorage.removeItem('notenverwaltung_authenticated'); setIsAuthenticated(false); setSelectedSong(null); setSelectedLetter(null); };
  const changeType = (t: 'noten' | 'texte' | 'videos') => { if (t !== contentType) { setContentType(t); setSelectedLetter(null); setSelectedSong(null); setSongs([]); } };

  if (!isAuthenticated) return <Login onLogin={() => setIsAuthenticated(true)} />;
  if (selectedSong) return contentType === 'videos' ? <VideoDetail song={selectedSong} onBack={() => setSelectedSong(null)} onHome={() => { setSelectedSong(null); setSelectedLetter(null); }} /> : <SongDetail song={selectedSong} onBack={() => setSelectedSong(null)} onHome={() => { setSelectedSong(null); setSelectedLetter(null); }} />;
  if (selectedLetter) { const list = songsForLetter(selectedLetter); return (
    <div className="d-flex flex-column" style={{ height: '100vh', background: '#1a1a1a' }}>
      <div className="flex-shrink-0 px-4 text-center text-white" style={{ paddingTop: 60, paddingBottom: 40 }}>
        <h1 className="mb-4" style={{ fontSize: '3rem', fontWeight: 300 }}>{selectedLetter === '1' ? 'Zahlen' : `Buchstabe ${selectedLetter}`}</h1>
      </div>
      <div className="flex-grow-1 d-flex justify-content-center px-4" style={{ paddingBottom: 20 }}>
        <div className="text-center" style={{ maxWidth: 1500 }}>
          <div style={{ marginBottom: 20 }}><button className="btn btn-lg text-white" style={{ background: '#4a4a4a', border: '2px solid #6a6a6a', width: 120, height: 100, borderRadius: 14 }} onClick={() => setSelectedLetter(null)}>←</button></div>
          {list.length === 0 ? <div className="text-white">Keine Songs</div> : <div className="d-flex flex-wrap justify-content-center">{list.map(s => <button key={s._id} className="btn btn-lg text-white" style={{ background: '#6a6a6a', border: '2px solid #8a8a8a', width: 288, height: 100, borderRadius: 14, margin: 5, padding: '15px 20px' }} onClick={() => setSelectedSong(s)}>{s.title}</button>)}</div>}
        </div>
      </div>
      <div className="flex-shrink-0 d-flex justify-content-center align-items-center px-4" style={{ paddingBottom: 30, position: 'relative' }}>
        <div style={{ fontSize: '.9rem', color: '#fff' }}>ESC = Zurück | H = Home</div>
        <button onClick={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }} className="btn btn-secondary" style={{ position: 'absolute', right: 20 }}>⛶</button>
      </div>
    </div> ); }
  const avail = availableLetters();
  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', background: '#1a1a1a', color: '#fff' }}>Lade Songs...</div>;
  if (error) return <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', background: '#1a1a1a', color: '#fff' }}><div className="text-center"><h3 className="text-danger">Fehler</h3><p>{error}</p><button className="btn btn-primary" onClick={fetchSongs}>Erneut</button></div></div>;
  return (
    <div className="d-flex flex-column" style={{ height: '100vh', background: '#1a1a1a' }}>
      <div className="flex-shrink-0 px-4 text-center text-white" style={{ paddingTop: 60, paddingBottom: 20 }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 300 }}>Liedersammlung mit {contentType === 'noten' ? 'Noten' : contentType === 'videos' ? 'Videos' : 'Texten'}</h1>
      </div>
      <div className="d-flex justify-content-center mb-3" style={{ gap: 15 }}>
        {(['texte','noten','videos'] as const).map(t => <button key={t} onClick={() => changeType(t)} className={`btn btn-sm ${contentType===t?'btn-light':'btn-outline-light'}`}>{t}</button>)}
      </div>
      <div className="flex-grow-1 d-flex justify-content-center px-4" style={{ paddingBottom: 20 }}>
        <div className="text-center" style={{ maxWidth: 1470 }}>
          {avail.length === 0 ? <div className="text-white">Keine Inhalte</div> : <div className="d-flex flex-wrap justify-content-center">{(['1',...LETTERS]).map(b => { const ok = avail.includes(b); return <button key={b} className="btn btn-lg text-white" style={{ background: ok?'#6a6a6a':'#2a2a2a', border:'2px solid #8a8a8a', width:173, height:144, borderRadius:14, margin:5, opacity: ok?1:.3, fontSize:'2rem', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600 }} disabled={!ok} onClick={()=> ok && setSelectedLetter(b)}>{b}</button>; })}</div>}
        </div>
      </div>
      <div className="flex-shrink-0 d-flex justify-content-center align-items-center px-4" style={{ paddingBottom:30, position:'relative' }}>
        <div style={{ fontSize:'.9rem', color:'#fff' }}>ESC = Zurück | H = Home</div>
        <button onClick={() => router.push('/upload')} className="btn btn-secondary" style={{ position:'absolute', right:70 }}>📤</button>
        <button onClick={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }} className="btn btn-secondary" style={{ position:'absolute', right:20 }}>⛶</button>
        <button onClick={logout} className="btn btn-outline-secondary" style={{ position:'absolute', left:20 }}>Logout</button>
      </div>
    </div>
  );
}
