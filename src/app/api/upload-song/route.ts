import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';
import { getWebdavClient, isWebdavEnabled, ensureDirectories, IMAGE_EXTENSIONS } from '../../../lib/webdav';
import { getSongsCollection } from '../../../lib/mongo';

async function uploadImagesWebdav(type: string, songName: string, files: { name: string; data: Buffer }[]) {
  const client = getWebdavClient();
  const baseDir = `/${type}`;
  const songDir = `${baseDir}/${songName}`;
  await ensureDirectories(client, [baseDir, songDir]);
  let count = 0;
  for (const f of files) {
    if (IMAGE_EXTENSIONS.includes(path.extname(f.name).toLowerCase())) {
      await client.putFileContents(`${songDir}/${f.name}`, f.data, { overwrite: true });
      count++;
    }
  }
  return count;
}

async function upsertSongMetadata(category: 'noten' | 'texte', folder: string, imageNames: string[]) {
  const col = await getSongsCollection();
  if (!col) return; // Falls keine DB
  const now = new Date();
  await col.updateOne(
    { category, folder },
    { $setOnInsert: { createdAt: now }, $set: { title: folder, images: imageNames, updatedAt: now } },
    { upsert: true }
  );
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const zipFile = formData.get('zipFile') as File;
    const type = formData.get('type') as string;

    if (!zipFile) {
      return NextResponse.json({ message: 'Keine ZIP-Datei gefunden' }, { status: 400 });
    }

    if (type !== 'noten' && type !== 'texte') {
      return NextResponse.json({ message: 'Ungültige Kategorie' }, { status: 400 });
    }

    // ZIP-Datei lesen
    const bytes = await zipFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ZIP entpacken
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

  // Song-Namen aus ZIP-Dateiname extrahieren (ohne .zip)
    const songName = zipFile.name.replace(/\.zip$/i, '');
    
    // Dateien sammeln
    const extracted: { name: string; data: Buffer }[] = [];
    for (const entry of zipEntries) {
      if (!entry.isDirectory) {
        const fileName = path.basename(entry.entryName);
        extracted.push({ name: fileName, data: entry.getData() });
      }
    }

    let extractedCount = 0;
    let storedImageNames: string[] = [];
    if (isWebdavEnabled()) {
      extractedCount = await uploadImagesWebdav(type, songName, extracted);
      storedImageNames = extracted
        .filter(f => IMAGE_EXTENSIONS.includes(path.extname(f.name).toLowerCase()))
        .map(f => f.name)
        .sort();
    } else {
      // Lokaler Fallback
      const targetDir = path.join(process.cwd(), 'public', 'images', type, songName);
      try { await mkdir(targetDir, { recursive: true }); } catch {}
      for (const f of extracted) {
        const ext = path.extname(f.name).toLowerCase();
        if (IMAGE_EXTENSIONS.includes(ext)) {
          await writeFile(path.join(targetDir, f.name), f.data);
          extractedCount++;
        }
      }
      storedImageNames = extracted
        .filter(f => IMAGE_EXTENSIONS.includes(path.extname(f.name).toLowerCase()))
        .map(f => f.name)
        .sort();
    }

    if (extractedCount === 0) {
      return NextResponse.json({ 
        message: 'Keine Bilddateien in der ZIP gefunden' 
      }, { status: 400 });
    }

    // Metadaten in DB upsert (auch bei lokalem Modus – für späteren Wechsel)
    if (storedImageNames.length) {
      upsertSongMetadata(type as 'noten' | 'texte', songName, storedImageNames).catch(e => console.error('SongMeta DB Fehler', e));
    }

    return NextResponse.json({
      message: `Song "${songName}" erfolgreich hochgeladen! ${extractedCount} Bilder in ${type} gespeichert.`,
      songName,
      extractedFiles: extractedCount,
      category: type,
      images: storedImageNames
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      message: 'Upload fehlgeschlagen: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
}
