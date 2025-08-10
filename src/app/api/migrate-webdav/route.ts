import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getWebdavClient, isWebdavEnabled, ensureDirectories, IMAGE_EXTENSIONS } from '../../../lib/webdav';

// Einmalige Migrations-Route: kopiert bestehende lokale Bilder & Video-JSONs nach WebDAV.
// Zugriff absichern: optional Header x-migration-token muss MIGRATION_TOKEN entsprechen.
// Nutzung (PowerShell Beispiel):
//  Invoke-WebRequest -Uri http://localhost:3000/api/migrate-webdav -Headers @{ 'x-migration-token' = 'DEINTOKEN' } -Method POST
// Voraussetzungen: STORAGEBOX_WEBDAV_URL, STORAGEBOX_USER, STORAGEBOX_PASS gesetzt.

export async function POST(req: NextRequest) {
  if (!isWebdavEnabled()) {
    return NextResponse.json({ message: 'WebDAV nicht aktiv (ENV nicht gesetzt)' }, { status: 400 });
  }

  const requiredToken = process.env.MIGRATION_TOKEN;
  if (requiredToken) {
    const provided = req.headers.get('x-migration-token');
    if (provided !== requiredToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
  }

  const client = getWebdavClient();
  const summary: Record<string, unknown> = { noten: {}, texte: {}, videos: {} };

  async function migrateCategory(cat: 'noten' | 'texte') {
    const localBase = path.join(process.cwd(), 'public', 'images', cat);
    if (!existsSync(localBase)) return { skipped: true };
    const songDirs = await readdir(localBase, { withFileTypes: true });
    let uploaded = 0; let skippedFiles = 0; let folders = 0;
    for (const dirent of songDirs) {
      if (!dirent.isDirectory()) continue;
      folders++;
      const songName = dirent.name;
      const localSongDir = path.join(localBase, songName);
      const files = await readdir(localSongDir);
      const imageFiles = files.filter(f => IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()));
      if (imageFiles.length === 0) continue;
      const remoteSongDir = `/${cat}/${songName}`;
      await ensureDirectories(client, [`/${cat}`, remoteSongDir]);
      for (const file of imageFiles) {
        try {
          const data = await readFile(path.join(localSongDir, file));
          await client.putFileContents(`${remoteSongDir}/${file}`, data, { overwrite: true });
          uploaded++;
        } catch (e) {
          skippedFiles++;
          console.error('Fehler beim Hochladen', `${remoteSongDir}/${file}`, e);
        }
      }
    }
    return { folders, uploaded, failed: skippedFiles };
  }

  async function migrateVideos() {
    const localVideosDir = path.join(process.cwd(), 'public', 'videos');
    if (!existsSync(localVideosDir)) return { skipped: true };
    const files = await readdir(localVideosDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    await ensureDirectories(client, ['/videos']);
    let uploaded = 0; let failed = 0;
    for (const jf of jsonFiles) {
      try {
        const data = await readFile(path.join(localVideosDir, jf));
        await client.putFileContents(`/videos/${jf}`, data, { overwrite: true });
        uploaded++;
      } catch (e) {
        failed++;
        console.error('Fehler beim Video Upload', jf, e);
      }
    }
    return { files: jsonFiles.length, uploaded, failed };
  }

  try {
    const noten = await migrateCategory('noten');
    const texte = await migrateCategory('texte');
    const videos = await migrateVideos();
    summary.noten = noten;
    summary.texte = texte;
    summary.videos = videos;
    return NextResponse.json({ message: 'Migration abgeschlossen', summary });
  } catch (e) {
    return NextResponse.json({ message: 'Migration fehlgeschlagen', error: (e as Error).message }, { status: 500 });
  }
}
