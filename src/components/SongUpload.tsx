'use client';

import { useState, useRef } from 'react';

interface SongUploadProps {
  onBack: () => void;
  onUploadSuccess: (message: string) => void;
}

export default function SongUpload({ onBack, onUploadSuccess }: SongUploadProps) {
  const MAX_ZIP_SIZE_BYTES = 5 * 1024 * 1024;
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [message, setMessage] = useState('');
  const [selectedType, setSelectedType] = useState<'noten' | 'texte' | 'videos'>('texte');
  const [uploadResults, setUploadResults] = useState<string[]>([]);
  
  // Video upload specific
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  
  // Delete functionality
  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [deleteTitle, setDeleteTitle] = useState('');
  const [deleteCategory, setDeleteCategory] = useState<'noten' | 'texte' | 'videos'>('texte');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => 
      file.name.toLowerCase().endsWith('.zip')
    );
    const oversizedFiles = validFiles.filter(file => file.size > MAX_ZIP_SIZE_BYTES);
    const allowedFiles = validFiles.filter(file => file.size <= MAX_ZIP_SIZE_BYTES);
    
    if (allowedFiles.length > 0) {
      setSelectedFiles(allowedFiles);
      if (oversizedFiles.length > 0) {
        setMessage(`⚠️ ${allowedFiles.length} Datei(en) ausgewählt. ${oversizedFiles.length} Datei(en) sind größer als 5 MB und wurden ausgelassen.`);
      } else {
        setMessage(`📁 ${allowedFiles.length} Datei(en) ausgewählt`);
      }
    } else if (oversizedFiles.length > 0) {
      setSelectedFiles([]);
      setMessage('❌ Datei ist zu groß. Maximal erlaubt sind 5 MB pro ZIP-Datei.');
    } else {
      setMessage('❌ Bitte nur ZIP-Dateien hochladen!');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    const validFiles = files.filter(file => 
      file.name.toLowerCase().endsWith('.zip')
    );
    const oversizedFiles = validFiles.filter(file => file.size > MAX_ZIP_SIZE_BYTES);
    const allowedFiles = validFiles.filter(file => file.size <= MAX_ZIP_SIZE_BYTES);
    
    if (allowedFiles.length > 0) {
      setSelectedFiles(allowedFiles);
      if (oversizedFiles.length > 0) {
        setMessage(`⚠️ ${allowedFiles.length} Datei(en) ausgewählt. ${oversizedFiles.length} Datei(en) sind größer als 5 MB und wurden ausgelassen.`);
      } else {
        setMessage(`📁 ${allowedFiles.length} Datei(en) ausgewählt`);
      }
    } else if (oversizedFiles.length > 0) {
      setSelectedFiles([]);
      setMessage('❌ Datei ist zu groß. Maximal erlaubt sind 5 MB pro ZIP-Datei.');
    } else {
      setMessage('❌ Bitte ZIP-Dateien auswählen!');
    }
  };

  const handleSingleFileUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('zipFile', file);
      formData.append('type', selectedType);

      const response = await fetch('/api/upload-song', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, message: result.message, file: file.name };
      } else {
        const error = await response.json();
        return { success: false, message: error.message, file: file.name };
      }
    } catch (error) {
      console.error('Upload error:', error);
      return { success: false, message: (error as Error).message, file: file.name };
    }
  };

  const handleMultipleFileUpload = async () => {
    if (selectedFiles.length === 0) {
      setMessage('❌ Keine Dateien ausgewählt!');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setCurrentFileIndex(0);
    setUploadResults([]);
    setMessage(`🚀 Starte Upload von ${selectedFiles.length} Datei(en)...`);

    const results: string[] = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setCurrentFileIndex(i + 1);
      setMessage(`📤 Uploading ${file.name} (${i + 1}/${selectedFiles.length})...`);
      
      const result = await handleSingleFileUpload(file);
      
      if (result.success) {
        results.push(`✅ ${result.file}: ${result.message}`);
      } else {
        results.push(`❌ ${result.file}: ${result.message}`);
      }
      
      setUploadProgress(((i + 1) / selectedFiles.length) * 100);
      setUploadResults([...results]);
    }

    setIsUploading(false);
    
    const successCount = results.filter(r => r.startsWith('✅')).length;
    const errorCount = results.filter(r => r.startsWith('❌')).length;
    
    if (errorCount === 0) {
      const finalMessage = `🎉 Alle ${successCount} Songs erfolgreich hochgeladen!`;
      setMessage(finalMessage);
      
      setTimeout(() => {
        onUploadSuccess(finalMessage);
      }, 1000);
    } else {
      setMessage(`⚠️ Upload abgeschlossen: ${successCount} erfolgreich, ${errorCount} fehlgeschlagen`);
    }
  };

  // Video Upload Funktion
  const handleVideoUpload = async () => {
    if (!videoTitle.trim() || !videoUrl.trim()) {
      setMessage('❌ Bitte Titel und YouTube-URL eingeben!');
      return;
    }

    setIsUploading(true);
    setMessage('📤 Video wird hochgeladen...');

    try {
      const formData = new FormData();
      formData.append('title', videoTitle.trim());
      formData.append('url', videoUrl.trim());

      const response = await fetch('/api/upload-video', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`✅ ${result.message}`);
        setVideoTitle('');
        setVideoUrl('');
        
        setTimeout(() => {
          onUploadSuccess(result.message);
        }, 1000);
      } else {
        const error = await response.json();
        setMessage(`❌ ${error.message}`);
      }
    } catch (error) {
      console.error('Video upload error:', error);
      setMessage(`❌ Upload fehlgeschlagen: ${(error as Error).message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteSong = async () => {
    if (!deleteTitle.trim()) {
      setDeleteMessage('❌ Bitte Song-Titel eingeben!');
      return;
    }

    setIsDeleting(true);
    setDeleteMessage(`🗑️ Lösche "${deleteTitle}"...`);

    try {
      const response = await fetch('/api/delete-song', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          songName: deleteTitle.trim(),
          category: deleteCategory,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setDeleteMessage(`✅ ${result.message}`);
        setDeleteTitle('');
        
        // Nach 2 Sekunden zur Hauptseite zurück
        setTimeout(() => {
          onUploadSuccess(`Song "${deleteTitle}" wurde gelöscht`);
        }, 2000);
      } else {
        const error = await response.json();
        setDeleteMessage(`❌ ${error.message}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      setDeleteMessage('❌ Fehler beim Löschen. Bitte versuchen Sie es erneut.');
    }

    setIsDeleting(false);
  };

  const clearSelection = () => {
    setSelectedFiles([]);
    setMessage('');
    setUploadResults([]);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearDeleteForm = () => {
    setDeleteTitle('');
    setDeleteMessage('');
  };

  return (
    <div className="container-fluid p-4" style={{ background: '#1a1a1a', minHeight: '100vh', color: '#ffffff' }}>
      <div className="row justify-content-center">
        <div className="col-12 col-md-10 col-lg-8">
          
          {/* Header mit Tabs */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex gap-3">
              <button
                onClick={() => setShowDeleteSection(false)}
                className={`btn ${!showDeleteSection ? 'btn-primary' : 'btn-outline-primary'}`}
                disabled={isUploading || isDeleting}
              >
                📤 Hochladen
              </button>
              <button
                onClick={() => setShowDeleteSection(true)}
                className={`btn ${showDeleteSection ? 'btn-danger' : 'btn-outline-danger'}`}
                disabled={isUploading || isDeleting}
              >
                🗑️ Löschen
              </button>
            </div>
            <button 
              onClick={onBack}
              className="btn btn-secondary"
              disabled={isUploading || isDeleting}
            >
              ← Zurück
            </button>
          </div>

          {/* UPLOAD SECTION */}
          {!showDeleteSection && (
            <>
              {/* Kategorie-Auswahl für Upload */}
              <div className="mb-4">
                <label className="form-label text-white">Kategorie für Upload:</label>
                <div className="d-flex gap-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="uploadCategory"
                      id="uploadTexte"
                      value="texte"
                      checked={selectedType === 'texte'}
                      onChange={(e) => setSelectedType(e.target.value as 'noten' | 'texte')}
                      disabled={isUploading}
                    />
                    <label className="form-check-label text-white" htmlFor="uploadTexte">
                      📝 Texte
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="uploadCategory"
                      id="uploadNoten"
                      value="noten"
                      checked={selectedType === 'noten'}
                      onChange={(e) => setSelectedType(e.target.value as 'noten' | 'texte' | 'videos')}
                      disabled={isUploading}
                    />
                    <label className="form-check-label text-white" htmlFor="uploadNoten">
                      🎵 Noten
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="uploadCategory"
                      id="uploadVideos"
                      value="videos"
                      checked={selectedType === 'videos'}
                      onChange={(e) => setSelectedType(e.target.value as 'noten' | 'texte' | 'videos')}
                      disabled={isUploading}
                    />
                    <label className="form-check-label text-white" htmlFor="uploadVideos">
                      🎬 Videos
                    </label>
                  </div>
                </div>
              </div>

              {/* Upload Area - Videos vs. ZIP */}
              {selectedType === 'videos' ? (
                // Video Upload Form
                <div 
                  className="border-3 border-dashed border-secondary rounded p-5 mb-4"
                  style={{ backgroundColor: '#2a2a2a' }}
                >
                  <div className="mb-3">
                    <i className="fas fa-video" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                  </div>
                  <h5 className="text-white mb-4">YouTube-Video hinzufügen</h5>
                  
                  <div className="mb-3">
                    <label htmlFor="videoTitle" className="form-label text-white">
                      <strong>Video-Titel:</strong>
                    </label>
                    <input
                      type="text"
                      id="videoTitle"
                      className="form-control"
                      placeholder="z.B. Believer (Imagine Dragons)"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      disabled={isUploading}
                      style={{
                        backgroundColor: '#3a3a3a',
                        border: '1px solid #555',
                        color: 'white'
                      }}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="videoUrl" className="form-label text-white">
                      <strong>YouTube-URL:</strong>
                    </label>
                    <input
                      type="url"
                      id="videoUrl"
                      className="form-control"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      disabled={isUploading}
                      style={{
                        backgroundColor: '#3a3a3a',
                        border: '1px solid #555',
                        color: 'white'
                      }}
                    />
                  </div>
                  
                  <button
                    onClick={handleVideoUpload}
                    disabled={isUploading || !videoTitle.trim() || !videoUrl.trim()}
                    className="btn btn-lg"
                    style={{
                      background: '#6a6a6a',
                      border: '1px solid #8a8a8a',
                      color: '#fff',
                      transition: 'all 0.3s ease',
                      width: '100%'
                    }}
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.background = '#7a7a7a';
                        e.currentTarget.style.borderColor = '#9a9a9a';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.background = '#6a6a6a';
                        e.currentTarget.style.borderColor = '#8a8a8a';
                      }
                    }}
                  >
                    {isUploading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Video wird hinzugefügt...
                      </>
                    ) : (
                      '🎬 Video hinzufügen'
                    )}
                  </button>
                </div>
              ) : (
                // ZIP Upload für Noten/Texte
                <div
                  className={`border-3 border-dashed rounded p-5 text-center mb-4 ${
                    isDragging ? 'border-primary bg-primary bg-opacity-10' : 'border-secondary'
                  }`}
                  style={{ 
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    backgroundColor: isDragging ? '#0d6efd20' : '#2a2a2a'
                  }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                >
                  <div className="mb-3">
                    <i className="fas fa-cloud-upload-alt" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                  </div>
                  <h5 className="text-white mb-3">
                    {selectedFiles.length > 0 
                      ? `${selectedFiles.length} Datei(en) ausgewählt` 
                      : 'ZIP-Dateien hier hinziehen oder klicken zum Auswählen'
                    }
                  </h5>
                  <p className="text-muted mb-0">
                    {isUploading 
                      ? 'Upload läuft...' 
                      : 'Mehrere ZIP-Dateien gleichzeitig möglich'
                    }
                  </p>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    disabled={isUploading}
                  />
                </div>
              )}

              {/* Rest der Upload-UI - nur für ZIP-Uploads (Noten/Texte) */}
              {selectedType !== 'videos' && selectedFiles.length > 0 && (
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="text-white mb-0">Ausgewählte Dateien ({selectedFiles.length}):</h6>
                    <button 
                      onClick={clearSelection}
                      className="btn btn-sm btn-outline-secondary"
                      disabled={isUploading}
                    >
                      Auswahl löschen
                    </button>
                  </div>
                  <div className="bg-dark p-3 rounded">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="d-flex justify-content-between align-items-center py-1">
                        <span className="text-white">📁 {file.name}</span>
                        <small className="text-muted">{(file.size / 1024 / 1024).toFixed(1)} MB</small>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedFiles.length > 0 && (
                <div className="mb-4">
                  <button
                    onClick={handleMultipleFileUpload}
                    disabled={isUploading}
                    className="btn btn-lg w-100"
                    style={{ 
                      fontSize: '1.1rem', 
                      padding: '12px',
                      background: '#6a6a6a',
                      border: '2px solid #8a8a8a',
                      color: '#ffffff',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isUploading) {
                        e.currentTarget.style.background = '#7a7a7a';
                        e.currentTarget.style.borderColor = '#9a9a9a';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isUploading) {
                        e.currentTarget.style.background = '#6a6a6a';
                        e.currentTarget.style.borderColor = '#8a8a8a';
                      }
                    }}
                  >
                    {isUploading 
                      ? `📤 Uploading... (${currentFileIndex}/${selectedFiles.length})` 
                      : `🚀 ${selectedFiles.length} Song(s) hochladen`
                    }
                  </button>
                </div>
              )}

              {isUploading && (
                <div className="mb-4">
                  <div className="progress mb-2" style={{ height: '8px' }}>
                    <div
                      className="progress-bar progress-bar-striped progress-bar-animated"
                      role="progressbar"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <small className="text-muted">
                    {uploadProgress.toFixed(0)}% abgeschlossen
                  </small>
                </div>
              )}

              {message && (
                <div className={`alert ${message.includes('❌') || message.includes('⚠️') ? 'alert-danger' : 'alert-info'} mb-4`}>
                  {message}
                </div>
              )}

              {uploadResults.length > 0 && (
                <div className="mb-4">
                  <h6 className="text-white mb-3">Upload-Ergebnisse:</h6>
                  <div className="bg-dark p-3 rounded">
                    {uploadResults.map((result, index) => (
                      <div key={index} className="py-1">
                        <small className={result.startsWith('✅') ? 'text-success' : 'text-danger'}>
                          {result}
                        </small>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* DELETE SECTION */}
          {showDeleteSection && (
            <>
              <div className="alert alert-warning mb-4">
                <h6 className="mb-2">⚠️ ACHTUNG: Song löschen</h6>
                <p className="mb-0 small">
                  Das Löschen entfernt den Song und alle seine Bilder permanent vom Server. 
                  Diese Aktion kann nicht rückgängig gemacht werden!
                </p>
              </div>

              {/* Kategorie-Auswahl für Delete */}
              <div className="mb-4">
                <label className="form-label text-white">Kategorie des zu löschenden Songs:</label>
                <div className="d-flex gap-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="deleteCategory"
                      id="deleteTexte"
                      value="texte"
                      checked={deleteCategory === 'texte'}
                      onChange={(e) => setDeleteCategory(e.target.value as 'noten' | 'texte' | 'videos')}
                      disabled={isDeleting}
                    />
                    <label className="form-check-label text-white" htmlFor="deleteTexte">
                      📝 Texte
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="deleteCategory"
                      id="deleteNoten"
                      value="noten"
                      checked={deleteCategory === 'noten'}
                      onChange={(e) => setDeleteCategory(e.target.value as 'noten' | 'texte' | 'videos')}
                      disabled={isDeleting}
                    />
                    <label className="form-check-label text-white" htmlFor="deleteNoten">
                      🎵 Noten
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="deleteCategory"
                      id="deleteVideos"
                      value="videos"
                      checked={deleteCategory === 'videos'}
                      onChange={(e) => setDeleteCategory(e.target.value as 'noten' | 'texte' | 'videos')}
                      disabled={isDeleting}
                    />
                    <label className="form-check-label text-white" htmlFor="deleteVideos">
                      🎬 Videos
                    </label>
                  </div>
                </div>
              </div>

              {/* Song-Titel Eingabe */}
              <div className="mb-4">
                <label htmlFor="deleteTitle" className="form-label text-white">
                  Song-Titel (exakt wie in der App angezeigt):
                </label>
                <div className="input-group">
                  <input
                    type="text"
                    id="deleteTitle"
                    className="form-control form-control-lg"
                    value={deleteTitle}
                    onChange={(e) => setDeleteTitle(e.target.value)}
                    placeholder="z.B. Bohemian Rhapsody (Queen)"
                    disabled={isDeleting}
                    style={{ background: '#2a2a2a', border: '1px solid #444', color: '#fff' }}
                  />
                  <button
                    onClick={clearDeleteForm}
                    className="btn btn-outline-secondary"
                    disabled={isDeleting}
                    title="Eingabe löschen"
                  >
                    🗑️
                  </button>
                </div>
                <small className="text-muted">
                  Der Titel muss exakt so eingegeben werden, wie er in der App angezeigt wird (inklusive Klammern, Leerzeichen, etc.)
                </small>
              </div>

              {/* Delete Button */}
              <div className="mb-4">
                <button
                  onClick={handleDeleteSong}
                  disabled={isDeleting || !deleteTitle.trim()}
                  className="btn btn-danger btn-lg w-100"
                  style={{ fontSize: '1.1rem', padding: '12px' }}
                >
                  {isDeleting 
                    ? '🗑️ Lösche Song...' 
                    : '🗑️ Song permanent löschen'
                  }
                </button>
              </div>

              {deleteMessage && (
                <div className={`alert ${deleteMessage.includes('❌') ? 'alert-danger' : 'alert-success'} mb-4`}>
                  {deleteMessage}
                </div>
              )}

              {/* Sicherheits-Hinweise */}
              <div className="mt-5 p-4 rounded border border-danger" style={{ background: '#2a1a1a' }}>
                <h6 className="text-danger mb-3">🛡️ Sicherheitshinweise:</h6>
                <ul className="text-white mb-0" style={{ fontSize: '0.9rem' }}>
                  <li className="mb-2">
                    <strong className="text-danger">Titel exakt eingeben:</strong> Der Song-Name muss genau so geschrieben werden, wie er in der App erscheint
                  </li>
                  <li className="mb-2">
                    <strong className="text-danger">Permanente Löschung:</strong> Gelöschte Songs können nicht wiederhergestellt werden
                  </li>
                  <li className="mb-2">
                    <strong className="text-danger">Alle Dateien:</strong> Der komplette Song-Ordner mit allen Bildern wird gelöscht
                  </li>
                  <li className="mb-0">
                    <strong className="text-danger">Sofortige Wirkung:</strong> Der Song verschwindet sofort aus der App
                  </li>
                </ul>
              </div>
            </>
          )}

          {/* Anleitung */}
          {!showDeleteSection && (
            <div className="mt-5 p-4 rounded border" style={{ background: '#2a2a2a', borderColor: '#444 !important' }}>
              <h5 className="text-white mb-3">📋 Upload-Anleitung:</h5>
              <ul className="text-white mb-0" style={{ fontSize: '0.9rem' }}>
                <li className="mb-2">
                  <strong>📁 Für Noten/Texte (ZIP-Upload):</strong>
                  <ul className="mt-1">
                    <li>Erstelle für jeden Song eine ZIP-Datei mit allen Bildern</li>
                    <li>Benenne jede ZIP-Datei nach dem Song-Namen (z.B. &quot;Song 1.zip&quot;)</li>
                    <li>Wähle &quot;Noten&quot; oder &quot;Texte&quot; und lade mehrere ZIP-Dateien gleichzeitig hoch</li>
                  </ul>
                </li>
                <li className="mb-2">
                  <strong>🎬 Für Videos (YouTube-Links):</strong>
                  <ul className="mt-1">
                    <li>Wähle &quot;Videos&quot; als Kategorie</li>
                    <li>Gib den Titel und YouTube-URL ein</li>
                    <li>Videos werden einzeln hinzugefügt</li>
                  </ul>
                </li>
                <li className="mb-2">
                  <strong>3.</strong> Wähle die Kategorie: &quot;Noten&quot;, &quot;Texte&quot; oder &quot;Videos&quot;
                </li>
                <li className="mb-2">
                  <strong>4.</strong> Ziehe alle ZIP-Dateien gleichzeitig in das Upload-Feld oder wähle sie aus
                </li>
                <li className="mb-2">
                  <strong>5.</strong> Klicke auf &quot;Upload&quot; - alle Songs werden nacheinander verarbeitet
                </li>
                <li className="mb-0">
                  <strong>6.</strong> Die Songs sind sofort in der App verfügbar
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
