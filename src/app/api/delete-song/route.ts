import { NextRequest, NextResponse } from 'next/server';
import { rm } from 'fs/promises';
import path from 'path';
import { getWebdavClient, isWebdavEnabled } from '../../../lib/webdav';
import { getVideoCollection, makeSlug, getSongsCollection } from '../../../lib/mongo';

export async function DELETE(request: NextRequest) {
  try {
    const { songName, category } = await request.json();

    if (!songName || !category) {
      return NextResponse.json({ 
        message: 'Song-Name und Kategorie sind erforderlich' 
      }, { status: 400 });
    }

    if (category !== 'noten' && category !== 'texte' && category !== 'videos') {
      return NextResponse.json({ 
        message: 'Ungültige Kategorie' 
      }, { status: 400 });
    }

    if (category === 'videos') {
      const collection = await getVideoCollection();
      if (collection) {
        const slug = makeSlug(songName);
        const res = await collection.deleteOne({ slug });
        if (res.deletedCount === 0) {
          return NextResponse.json({ message: `Video "${songName}" wurde nicht gefunden` }, { status: 404 });
        }
        return NextResponse.json({ message: `Video "${songName}" gelöscht (DB).`, songName, category });
      }
      // Fallback Dateisystem
      const filePath = path.join(process.cwd(), 'public', 'videos', `${songName}.json`);
      try {
        await rm(filePath, { force: true });
        return NextResponse.json({ message: `Video "${songName}" gelöscht!`, songName, category });
      } catch (e) {
        return NextResponse.json({ message: 'Fehler beim Löschen: ' + (e as Error).message }, { status: 500 });
      }
    }

  if (isWebdavEnabled() && (category === 'noten' || category === 'texte')) {
      try {
        const client = getWebdavClient();
        const remoteDir = `/${category}/${songName}`;
        await client.deleteFile(remoteDir);
    // Metadaten entfernen
    getSongsCollection().then(col => col?.deleteOne({ category, folder: songName })).catch(()=>{});
        return NextResponse.json({ message: `Song "${songName}" erfolgreich aus ${category} gelöscht (WebDAV)!`, songName, category });
      } catch (e) {
        return NextResponse.json({ message: 'Fehler beim Löschen (WebDAV): ' + (e as Error).message }, { status: 500 });
      }
    }

    // Lokal (Bilder)
    const songPath = path.join(process.cwd(), 'public', 'images', category, songName);
    try {
      await rm(songPath, { recursive: true, force: true });
      if (category === 'noten' || category === 'texte') {
        getSongsCollection().then(col => col?.deleteOne({ category, folder: songName })).catch(()=>{});
      }
      return NextResponse.json({ message: `Song "${songName}" erfolgreich aus ${category} gelöscht!`, songName, category });
    } catch (error) {
      console.error('Delete error:', error);
      if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ENOENT') {
        return NextResponse.json({ message: `Song "${songName}" wurde nicht gefunden` }, { status: 404 });
      }
      return NextResponse.json({ message: 'Fehler beim Löschen des Songs: ' + (error as Error).message }, { status: 500 });
    }

  } catch (error) {
    console.error('Request parsing error:', error);
    return NextResponse.json({ 
      message: 'Ungültige Anfrage' 
    }, { status: 400 });
  }
}
