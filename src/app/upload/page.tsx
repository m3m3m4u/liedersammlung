'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SongUpload from '@/components/SongUpload';

export default function UploadPage() {
  const router = useRouter();
  const [uploadMessage, setUploadMessage] = useState<string>('');

  const handleUploadSuccess = (message: string) => {
    setUploadMessage(message);
    // Nach 3 Sekunden zur Hauptseite zurück
    setTimeout(() => {
      router.push('/');
    }, 3000);
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <div className="container-fluid p-4">
      <div className="row">
        <div className="col-12">
          <h1 className="mb-4">Neuen Song hochladen</h1>
          
          {uploadMessage && (
            <div className="alert alert-success" role="alert">
              {uploadMessage}
              <br />
              <small>Du wirst in 3 Sekunden zur Hauptseite weitergeleitet...</small>
            </div>
          )}
          
          <SongUpload 
            onBack={handleBack}
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
                <strong>3.</strong> Wähle die Kategorie: &quot;Noten&quot; oder &quot;Texte&quot;
              </li>
              <li className="mb-2">
                <strong>4.</strong> Ziehe die ZIP-Datei in das Upload-Feld oder klicke zum Auswählen
              </li>
              <li className="mb-2">
                <strong>5.</strong> Der Song wird automatisch in den richtigen Ordner entpackt
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
