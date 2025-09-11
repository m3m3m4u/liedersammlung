import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getWebdavClient, isWebdavEnabled } from '../../../lib/webdav';

const mimeMap: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp'
};

export async function GET(request: NextRequest) {
  if (!isWebdavEnabled()) {
    return NextResponse.json({ message: 'WebDAV nicht aktiv' }, { status: 400 });
  }
  const { searchParams } = new URL(request.url);
  const rawParam = searchParams.get('path');
  const rel = rawParam ? decodeURIComponent(rawParam) : null;
  if (!rel) return NextResponse.json({ message: 'path erforderlich' }, { status: 400 });
  // Erlaube Umlaute und diverse Unicode-Zeichen in Ordner- und Dateinamen (zwei Segmente: Kategorie/Ordner/Datei)
  if (!/^((noten|texte)\/[\p{L}\p{N}\p{M}\p{Pc}\p{Pd}\s._()'&+,~\-]+\/[\p{L}\p{N}\p{M}\p{Pc}\p{Pd}\s._()'&+,~\-]+\.(jpg|jpeg|png|gif|webp))$/iu.test(rel)) {
    return NextResponse.json({ message: 'Ungültiger oder nicht erlaubter Pfad' }, { status: 400 });
  }
  try {
    const client = getWebdavClient();
  // WebDAV erwartet raw UTF-8; wir verwenden den exakt dekodierten Pfad ohne Normalisierung.
  const davPath = '/' + rel;
    const data = await client.getFileContents(davPath, { format: 'binary' });
    const ext = path.extname(rel).toLowerCase();
    const mime = mimeMap[ext] || 'application/octet-stream';
  return new NextResponse(data as ArrayBuffer, { headers: { 'Content-Type': mime, 'Cache-Control': 'public, max-age=3600' } });
  } catch (e) {
    return NextResponse.json({ message: 'Fehler beim Laden: ' + (e as Error).message }, { status: 500 });
  }
}
