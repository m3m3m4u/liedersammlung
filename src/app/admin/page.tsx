'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SongUpload from '@/components/SongUpload';
import AdminSongList from '@/components/AdminSongList';

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('manage');
  const [uploadMessage, setUploadMessage] = useState<string>('');

  const handleUploadSuccess = (message: string) => {
    setUploadMessage(message);
    setTimeout(() => {
      setUploadMessage('');
      setActiveTab('manage');
    }, 3000);
  };

  return (
    <div className="container-fluid p-4" style={{ background: '#1a1a1a', minHeight: '100vh', color: '#fff' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Admin-Bereich</h1>
        <button onClick={() => router.push('/')} className="btn btn-outline-light">
          ← Zurück zur Hauptseite
        </button>
      </div>

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => setActiveTab('manage')}
            style={{ background: activeTab === 'manage' ? '#343a40' : 'transparent', color: '#fff', border: '1px solid #495057' }}
          >
            Songs verwalten
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
            style={{ background: activeTab === 'upload' ? '#343a40' : 'transparent', color: '#fff', border: '1px solid #495057' }}
          >
            Upload
          </button>
        </li>
      </ul>

      {uploadMessage && (
        <div className="alert alert-success" role="alert">
          {uploadMessage}
        </div>
      )}

      {activeTab === 'upload' ? (
        <div>
          <h2 className="mb-4">Neuen Song hochladen</h2>
          <SongUpload 
            onBack={() => setActiveTab('manage')}
            onUploadSuccess={handleUploadSuccess}
          />
          <div className="mt-5">
            <h3>Anleitung:</h3>
            <ul className="list-unstyled">
              <li className="mb-2">
                <strong>1.</strong> Erstelle eine ZIP-Datei mit allen Bildern deines Songs
              </li>
              <li className="mb-2">
                <strong>2.</strong> Benenne die ZIP-Datei nach dem Song-Namen (z.B. &quot;Mein neuer Song.zip&quot;)
              </li>
              <li className="mb-2">
                <strong>3.</strong> Wähle die Kategorie (Noten oder Texte)
              </li>
              <li className="mb-2">
                <strong>4.</strong> Lade die ZIP-Datei hoch
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <AdminSongList />
      )}
    </div>
  );
}
