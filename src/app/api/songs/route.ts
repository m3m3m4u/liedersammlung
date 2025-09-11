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
  const minimal = searchParams.get('minimal') === '1'; // nur Metadaten (ohne images)
    
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
  const songsCol = await getSongsCollection();
  interface SongDocLite { _id?: unknown; category: 'noten' | 'texte'; folder: string; title: string; images?: string[]; createdAt?: Date; updatedAt?: Date; imageCount?: number; }
  // Helper zum Konstruieren finaler JSON Antwort
  const buildResponse = (docs: SongDocLite[]) => {
        const publicBase = buildPublicUrl('');
        return docs.map(d => {
          const imgs = (d.images || []) as string[];
          let images: string[] | undefined;
          if (!minimal) {
            images = isWebdavEnabled()
              ? imgs.map(img => {
                  const segs = [type, d.folder, img].map(s => encodeURIComponent((s || '').normalize('NFC')));
                  const relative = `${segs[0]}/${segs[1]}/${segs[2]}`;
                  // Wenn Public-Base gesetzt, ist relative bereits percent-encoded
                  return publicBase ? `${publicBase}${relative}` : `/api/webdav-file?path=${relative}`;
                })
              : imgs.map(img => {
                  const segs = [type, d.folder, img].map(s => encodeURIComponent((s || '').normalize('NFC')));
                  return `/images/${segs[0]}/${segs[1]}/${segs[2]}`;
                });
          }
          return { _id: d.folder.toLowerCase().replace(/\s+/g,'-'), title: d.title, images, folder: d.folder };
        });
      };
      if (songsCol) {
        try {
          const docs = await songsCol.find({ category: type }).sort({ title: 1 }).toArray();
          if (docs.length && docs.some(d => (d.images||[]).length === 0) && isWebdavEnabled()) {
            // Populate fehlender Bilder
            const client = getWebdavClient();
            const bulk = songsCol.initializeUnorderedBulkOp();
            let ops=0;
            for (const d of docs) {
              if (!d.images || d.images.length === 0) {
                const bases = [`/${type}`, `/${type.charAt(0).toUpperCase()}${type.slice(1)}`];
                let folderFiles: WebDavEntry[] = [];
                for (const b of bases) {
                  try { const raw = await client.getDirectoryContents(`${b}/${d.folder}`).catch(()=>[]) as WebDavEntry[]; if (raw.length) { folderFiles = raw; break; } } catch {}
                }
                if (folderFiles.length) {
                  const imgs = folderFiles.filter(f=> f.type==='file' && IMAGE_EXTENSIONS.includes(path.extname(f.basename).toLowerCase())).sort((a,b)=>a.basename.localeCompare(b.basename)).map(f=>f.basename);
                  if (imgs.length) { bulk.find({ _id: d._id }).updateOne({ $set: { images: imgs, imageCount: imgs.length, updatedAt: new Date() } }); d.images = imgs; ops++; }
                }
              }
            }
            if (ops) { try { await bulk.execute(); } catch (e) { console.warn('populate bulk error', e); } }
          }
          if (docs.length) {
            const payload = buildResponse(docs);
            // ETag basierend auf Anzahl + neuestem updatedAt
            const newest = Math.max(...docs.map(d => new Date(d.updatedAt || d.createdAt || Date.now()).getTime()));
            const etag = `W/"s-${type}-${docs.length}-${newest}"`;
            if (request.headers.get('if-none-match') === etag) {
              const notMod = new NextResponse(null, { status: 304 });
              notMod.headers.set('ETag', etag);
              notMod.headers.set('Cache-Control', minimal ? 'public, max-age=30, stale-while-revalidate=300' : 'public, max-age=120, stale-while-revalidate=600');
              return notMod;
            }
            const res = NextResponse.json(payload);
            res.headers.set('Cache-Control', minimal ? 'public, max-age=30, stale-while-revalidate=300' : 'public, max-age=120, stale-while-revalidate=600');
            res.headers.set('ETag', etag);
            return res;
          }
        } catch (e) { console.error('Song DB Query Fehler:', e); }
      }
      // DB leer → WebDAV Direkt-Scan + Insert
      if (isWebdavEnabled()) {
        try {
          const client = getWebdavClient();
          const bases = [`/${type}`, `/${type.charAt(0).toUpperCase()}${type.slice(1)}`];
          let baseUsed = bases[0]; let entries: WebDavEntry[] = [];
          for (const b of bases) { try { const r = await client.getDirectoryContents(b).catch(()=>[]) as WebDavEntry[]; if (r.length) { entries=r; baseUsed=b; break; } } catch{} }
          const dirs = entries.filter(e=> e.type==='directory');
          const docs: SongDocLite[] = [];
          for (const dir of dirs) {
            const folderPath = `${baseUsed}/${dir.basename}`;
            const files = await client.getDirectoryContents(folderPath).catch(()=>[]) as WebDavEntry[];
            const imgs = files.filter(f=> f.type==='file' && IMAGE_EXTENSIONS.includes(path.extname(f.basename).toLowerCase())).sort((a,b)=>a.basename.localeCompare(b.basename)).map(f=>f.basename);
            docs.push({ category: type, folder: dir.basename, title: dir.basename, images: imgs, createdAt: new Date(), updatedAt: new Date(), imageCount: imgs.length });
          }
          if (songsCol && docs.length) {
            try {
              await songsCol.insertMany(docs.map(d => ({
                category: d.category,
                folder: d.folder,
                title: d.title,
                images: d.images ?? [],
                createdAt: d.createdAt ?? new Date(),
                updatedAt: d.updatedAt ?? new Date(),
                imageCount: d.imageCount ?? (d.images ? d.images.length : 0)
              })), { ordered: false });
            } catch {/* dupe safe */}
          }
          const payload = buildResponse(docs);
          const newest = Math.max(...docs.map(d => new Date(d.updatedAt || d.createdAt || Date.now()).getTime()), 0);
          const etag = `W/"w-${type}-${docs.length}-${newest}"`;
          if (request.headers.get('if-none-match') === etag) {
            const notMod = new NextResponse(null, { status: 304 });
            notMod.headers.set('ETag', etag);
            notMod.headers.set('Cache-Control', minimal ? 'public, max-age=30, stale-while-revalidate=300' : 'public, max-age=120, stale-while-revalidate=600');
            return notMod;
          }
          const res = NextResponse.json(payload);
          res.headers.set('Cache-Control', minimal ? 'public, max-age=30, stale-while-revalidate=300' : 'public, max-age=120, stale-while-revalidate=600');
          res.headers.set('ETag', etag);
          return res;
        } catch (e) {
          console.error('WebDAV Scan Fehler', e);
          return NextResponse.json([]);
        }
      }
      return NextResponse.json([]);
    }
  } catch (error) {
    const { searchParams } = new URL(request.url);
    console.error(`Error reading ${searchParams?.get('type') || 'texte'} directory:`, error);
    return NextResponse.json(
      { error: `Failed to read songs from filesystem` },
      { status: 500 }
    );
  }
}
