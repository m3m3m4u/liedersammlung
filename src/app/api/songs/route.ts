import { NextResponse } from 'next/server';
import { readdir, access, readFile } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';
import { getWebdavClient, isWebdavEnabled, buildPublicUrl, IMAGE_EXTENSIONS } from '../../../lib/webdav';
import { getVideoCollection, getSongsCollection } from '../../../lib/mongo';

// Typisierung für WebDAV Einträge (minimale Felder, Rest generisch)
interface WebDavEntry {
  type: string;
  basename: string;
  [key: string]: unknown;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'texte'; // Default: texte
    
  // Für Videos verwenden wir ein anderes Verzeichnis und JSON-Dateien
  if (type === 'videos') {
    const collection = await getVideoCollection();
    if (collection) {
      try {
        const docs = await collection.find({}, { sort: { title: 1 } }).toArray();
        if (docs.length) {
          return NextResponse.json(docs.map(d => ({ _id: d.slug, title: d.title, videoUrl: d.url })));
        }
      } catch (e) {
        console.error('Video DB Query Fehler:', e);
      }
    }
    // Fallback: WebDAV /videos (falls DB leer oder nicht verfügbar)
    if (isWebdavEnabled()) {
      try {
        const client = getWebdavClient();
        const entries = await client.getDirectoryContents('/videos').catch(() => []) as WebDavEntry[];
        const jsonFiles = entries.filter(e => e.type === 'file' && e.basename.endsWith('.json'));
        const videos = await Promise.all(jsonFiles.map(async f => {
          try {
            const raw = await client.getFileContents(`/videos/${f.basename}`, { format: 'text' }) as string;
            const data = JSON.parse(raw);
            return { _id: f.basename.replace('.json','').toLowerCase().replace(/\s+/g,'-'), title: data.title || f.basename.replace('.json',''), videoUrl: data.url };
          } catch { return null; }
        }));
  const filtered = videos.filter((v): v is { _id: string; title: string; videoUrl: string } => Boolean(v));
  if (filtered.length) return NextResponse.json(filtered);
      } catch (e) {
        console.error('Video WebDAV Listing Fehler:', e);
      }
    }
    // Letzter Fallback: lokales public/videos
    const videosDir = path.join(process.cwd(), 'public', 'videos');
    try { await access(videosDir, constants.F_OK); } catch { return NextResponse.json([]); }
    try {
      const files = await readdir(videosDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      const videos = await Promise.all(jsonFiles.map(async f => {
        try {
          const filePath = path.join(videosDir, f);
          const raw = await readFile(filePath, 'utf-8');
          const data = JSON.parse(raw);
          return { _id: f.replace('.json','').toLowerCase().replace(/\s+/g,'-'), title: data.title || f.replace('.json',''), videoUrl: data.url };
        } catch { return null; }
      }));
      return NextResponse.json(videos.filter(Boolean));
    } catch { return NextResponse.json([]); }
  }
    
    if (type === 'noten' || type === 'texte') {
      // Erst DB versuchen
      const songsCol = await getSongsCollection();
      if (songsCol) {
        try {
          const docs = await songsCol.find({ category: type as 'noten' | 'texte' }).sort({ title: 1 }).toArray();
          if (docs.length) {
            // URLs konstruieren: Bei WebDAV über public URL oder Proxy, bei lokal /images Pfad
            const publicBase = buildPublicUrl('');
            const result = docs.map(d => {
              let images: string[];
              if (isWebdavEnabled()) {
                images = d.images.map(img => {
                  const relative = `${type}/${d.folder}/${img}`;
                  return publicBase ? buildPublicUrl(relative)! : `/api/webdav-file?path=${encodeURIComponent(relative)}`;
                });
              } else {
                images = d.images.map(img => `/images/${type}/${d.folder}/${img}`);
              }
              return { _id: d.folder.toLowerCase().replace(/\s+/g,'-'), title: d.title, images };
            });
            return NextResponse.json(result);
          }
        } catch (e) {
          console.error('Song DB Query Fehler:', e);
        }
      }
    }

    if (isWebdavEnabled() && (type === 'noten' || type === 'texte')) {
      try {
        const client = getWebdavClient();
        // Versuche Klein- und Großschreibung ("/noten" und "/Noten")
        const candidateDirs = [`/${type}`, `/${type.charAt(0).toUpperCase()}${type.slice(1)}`];
        let entries: WebDavEntry[] = [];
        let baseDirUsed = candidateDirs[0];
        for (const dir of candidateDirs) {
          try {
            const r = await client.getDirectoryContents(dir).catch(() => []) as WebDavEntry[];
            if (r.length) { entries = r; baseDirUsed = dir; break; }
            // falls leer, trotzdem merken falls keine Alternative existiert
            if (!entries.length) { entries = r; baseDirUsed = dir; }
          } catch { /* ignore and try next */ }
        }
        const folderEntries = entries.filter(e => e.type === 'directory');
        const songs = await Promise.all(folderEntries.map(async (folder) => {
          try {
            const folderPath = `${baseDirUsed}/${folder.basename}`;
            const files = await client.getDirectoryContents(folderPath).catch(() => []) as WebDavEntry[];
            const imageFiles = files
              .filter(f => f.type === 'file' && IMAGE_EXTENSIONS.includes(path.extname(f.basename).toLowerCase()))
              .sort((a, b) => a.basename.localeCompare(b.basename));
            const publicBase = buildPublicUrl('');
            const images = imageFiles.map(f => {
              const relative = `${type}/${folder.basename}/${f.basename}`; // relative Pfad weiter gemischt, Proxy akzeptiert
              const publicUrl = publicBase ? buildPublicUrl(relative)! : `/api/webdav-file?path=${encodeURIComponent(relative)}`;
              return publicUrl;
            });
            return { _id: folder.basename.toLowerCase().replace(/\s+/g, '-'), title: folder.basename, images };
          } catch { return null; }
        }));
        return NextResponse.json(songs.filter(Boolean));
      } catch (e) {
        console.error('WebDAV Listing Fehler', e);
        return NextResponse.json([], { status: 200 });
      }
    }

  // Fallback lokal (nur wenn nicht WebDAV oder DB leer)
    const baseDir = path.join(process.cwd(), 'public', 'images', type);
    
    console.log('Current working directory:', process.cwd());
    console.log('Looking for directory:', baseDir);
    
    // Prüfen ob das Verzeichnis existiert
    try {
      await access(baseDir, constants.F_OK);
      console.log('Directory exists:', baseDir);
    } catch (accessError) {
      console.error('Directory does not exist:', baseDir);
      console.error('Access error:', accessError);
      
      // Alternative Pfade versuchen
      const altPath1 = path.join(__dirname, '..', '..', '..', '..', 'public', 'images', type);
      const altPath2 = path.join(process.cwd(), '..', 'public', 'images', type);
      
      console.log('Trying alternative path 1:', altPath1);
      console.log('Trying alternative path 2:', altPath2);
      
      return NextResponse.json(
        { 
          error: `Directory not found: ${baseDir}`,
          debug: {
            cwd: process.cwd(),
            baseDir,
            type,
            altPath1,
            altPath2
          }
        },
        { status: 404 }
      );
    }
    
    // Alle Unterordner im entsprechenden Verzeichnis lesen
    const folders = await readdir(baseDir, { withFileTypes: true });
    const songFolders = folders.filter(dirent => dirent.isDirectory());
    
    console.log(`Found ${songFolders.length} song folders in ${type}`);
    
    const songs = await Promise.all(
      songFolders.map(async (folder) => {
        const songDir = path.join(baseDir, folder.name);
        
        try {
          // Alle Bilder im Song-Ordner lesen
          const files = await readdir(songDir);
          const imageFiles = files
            .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
            .sort() // Alphabetische Sortierung für konsistente Reihenfolge
            .map(file => `/images/${type}/${folder.name}/${file}`);
          
          return {
            _id: folder.name.toLowerCase().replace(/\s+/g, '-'), // ID für React key
            title: folder.name,
            images: imageFiles
          };
        } catch (error) {
          console.error(`Error reading folder ${folder.name}:`, error);
          return null;
        }
      })
    );
    
    // Null-Werte herausfiltern (falls ein Ordner nicht lesbar war)
    const validSongs = songs.filter(song => song !== null);
    
    console.log(`Returning ${validSongs.length} valid songs`);
    return NextResponse.json(validSongs);
  } catch (error) {
    const { searchParams } = new URL(request.url);
    console.error(`Error reading ${searchParams?.get('type') || 'texte'} directory:`, error);
    return NextResponse.json(
      { error: `Failed to read songs from filesystem` },
      { status: 500 }
    );
  }
}
