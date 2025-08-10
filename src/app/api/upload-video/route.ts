import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { getWebdavClient, isWebdavEnabled, ensureDirectories } from '../../../lib/webdav';
import { getVideoCollection, makeSlug } from '../../../lib/mongo';
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const url = formData.get('url') as string;

    if (!title || !url) {
      return NextResponse.json(
        { message: 'Titel und URL sind erforderlich' },
        { status: 400 }
      );
    }

    // Validiere YouTube-URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]{11}/;
    if (!youtubeRegex.test(url)) {
      return NextResponse.json(
        { message: 'Ungültige YouTube-URL' },
        { status: 400 }
      );
    }

    // Versuche MongoDB zuerst
    const collection = await getVideoCollection();
    if (collection) {
      const slug = makeSlug(title);
      const doc = { slug, title: title.trim(), url: url.trim(), createdAt: new Date() };
      try {
        await collection.insertOne(doc);
        console.log(`[upload-video] In DB gespeichert: ${slug}`);
        return NextResponse.json({ message: `Video "${title}" erfolgreich (DB) hinzugefügt!`, slug });
      } catch (e) {
        const err = e as { code?: number };
        if (err?.code === 11000) {
          await collection.updateOne({ slug }, { $set: { title: title.trim(), url: url.trim() } });
          return NextResponse.json({ message: `Video "${title}" aktualisiert (DB).`, slug });
        }
        console.error('DB Insert Fehler:', err);
      }
    }

    // Fallback auf bisherige Datei/WebDAV Variante
    const videosDir = path.join(process.cwd(), 'public', 'videos');
    if (!isWebdavEnabled() && !existsSync(videosDir)) {
      await mkdir(videosDir, { recursive: true });
    }
    const safeTitle = title.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
    const fileName = `${safeTitle}.json`;
    const filePath = path.join(videosDir, fileName);
    const videoData = { title: title, url: url, created: new Date().toISOString() };
    if (isWebdavEnabled()) {
      const client = getWebdavClient();
      const remoteDir = '/videos';
      await ensureDirectories(client, [remoteDir]);
      await client.putFileContents(`${remoteDir}/${fileName}`, JSON.stringify(videoData, null, 2), { overwrite: true });
    } else {
      await writeFile(filePath, JSON.stringify(videoData, null, 2), 'utf-8');
    }
    console.log(`Video (Fallback) gespeichert: ${fileName}`);
    return NextResponse.json({ message: `Video "${title}" erfolgreich hinzugefügt!`, fileName });

  } catch (error) {
    console.error('Video-Upload-Fehler:', error);
    return NextResponse.json(
      { message: `Upload fehlgeschlagen: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
