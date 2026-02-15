import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { getWebdavClient, isWebdavEnabled, ensureDirectories } from '../../../lib/webdav';
import { getMediaCollection, makeSlug, type MediaCategory } from '../../../lib/mongo';
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') as string;
  const rawUrl = formData.get('url') as string;
  const url = (rawUrl || '').trim();
  const rawCategory = (formData.get('category') as string | null) || 'videos';
  const mediaCategory: MediaCategory = rawCategory === 'boomwhacker' ? 'boomwhacker' : 'videos';

    if (!title || !url) {
      return NextResponse.json(
        { message: 'Titel und URL sind erforderlich' },
        { status: 400 }
      );
    }

    // Validiere & extrahiere YouTube Video-ID (robuster, erlaubt zusätzliche Parameter)
    // Quelle ähnliches Muster wie in VideoDetail.tsx
    const idMatch = url.match(/^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]{11}).*/);
    const videoId = idMatch?.[1];
    if (!videoId || videoId.length !== 11 || /[^a-zA-Z0-9_-]/.test(videoId)) {
      return NextResponse.json({ message: 'Ungültige YouTube-URL oder Video-ID nicht gefunden' }, { status: 400 });
    }

    // Versuche MongoDB zuerst
    const collection = await getMediaCollection(mediaCategory);
    if (collection) {
      const slug = makeSlug(title);
  const doc = { slug, title: title.trim(), url, videoId, createdAt: new Date() };
      try {
        await collection.insertOne(doc);
        console.log(`[upload-video] In DB gespeichert: ${mediaCategory}/${slug}`);
        return NextResponse.json({ message: `${mediaCategory === 'boomwhacker' ? 'Boomwhacker' : 'Video'} "${title}" erfolgreich (DB) hinzugefügt!`, slug });
      } catch (e) {
        const err = e as { code?: number };
        if (err?.code === 11000) {
          await collection.updateOne({ slug }, { $set: { title: title.trim(), url, videoId } });
          return NextResponse.json({ message: `${mediaCategory === 'boomwhacker' ? 'Boomwhacker' : 'Video'} "${title}" aktualisiert (DB).`, slug });
        }
        console.error('DB Insert Fehler:', err);
      }
    }

    // Fallback auf bisherige Datei/WebDAV Variante
    const videosDir = path.join(process.cwd(), 'public', mediaCategory);
    if (!isWebdavEnabled() && !existsSync(videosDir)) {
      await mkdir(videosDir, { recursive: true });
    }
    const safeTitle = title.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
    const fileName = `${safeTitle}.json`;
    const filePath = path.join(videosDir, fileName);
  const videoData = { title: title.trim(), url, videoId, created: new Date().toISOString() };
    if (isWebdavEnabled()) {
      const client = getWebdavClient();
      const remoteDir = `/${mediaCategory}`;
      await ensureDirectories(client, [remoteDir]);
      await client.putFileContents(`${remoteDir}/${fileName}`, JSON.stringify(videoData, null, 2), { overwrite: true });
    } else {
      await writeFile(filePath, JSON.stringify(videoData, null, 2), 'utf-8');
    }
    console.log(`${mediaCategory} (Fallback) gespeichert: ${fileName}`);
    return NextResponse.json({ message: `${mediaCategory === 'boomwhacker' ? 'Boomwhacker' : 'Video'} "${title}" erfolgreich hinzugefügt!`, fileName });

  } catch (error) {
    console.error('Video-Upload-Fehler:', error);
    return NextResponse.json(
      { message: `Upload fehlgeschlagen: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
