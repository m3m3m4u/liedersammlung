import { NextResponse } from 'next/server';
import path from 'path';
import { getSongsCollection } from '@/lib/mongo';
import { getWebdavClient, isWebdavEnabled, buildPublicUrl, IMAGE_EXTENSIONS } from '@/lib/webdav';

interface WebDavEntry { type: string; basename: string; }

function safeError(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return 'error';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folder = searchParams.get('folder');
  const category = (searchParams.get('type') || 'noten') as 'noten'|'texte';
  if (!folder) return NextResponse.json({ error: 'folder missing' }, { status: 400 });
  try {
    const songsCol = await getSongsCollection();
  const publicBase = null; // Proxy erzwingen für Bilder
    if (songsCol) {
      const doc = await songsCol.findOne({ category, folder });
      if (doc && doc.images && doc.images.length) {
        const images = (isWebdavEnabled() ? doc.images.map(img => {
          const segs = [category, doc.folder, img].map(s => encodeURIComponent((s || '')));
          const relative = `${segs[0]}/${segs[1]}/${segs[2]}`;
          return `/api/webdav-file?path=${relative}`;
        }) : doc.images.map(img => {
          const segs = [category, doc.folder, img].map(s => encodeURIComponent((s || '')));
          return `/images/${segs[0]}/${segs[1]}/${segs[2]}`;
        }));
        const etag = `W/"song-${category}-${folder}-${images.length}-${doc.updatedAt?.valueOf?.() || Date.now()}"`;
        if (request.headers.get('if-none-match') === etag) {
          const notMod = new NextResponse(null, { status: 304 });
          notMod.headers.set('ETag', etag);
          notMod.headers.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
          return notMod;
        }
        const res = NextResponse.json({ _id: doc.folder.toLowerCase().replace(/\s+/g,'-'), title: doc.title, images });
        res.headers.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
        res.headers.set('ETag', etag);
        return res;
      }
    }
    // Fallback: direkt WebDAV lesen (und ggf. DB aktualisieren)
    if (isWebdavEnabled()) {
      const client = getWebdavClient();
      const bases = [`/${category}`, `/${category.charAt(0).toUpperCase()}${category.slice(1)}`];
      let files: WebDavEntry[] = [];
      for (const b of bases) {
        try {
          files = await client.getDirectoryContents(`${b}/${folder}`).catch(()=>[]) as WebDavEntry[];
          if (files.length) break;
        } catch {}
      }
      if (files.length) {
        const imgs = files.filter(f=> f.type==='file' && IMAGE_EXTENSIONS.includes(path.extname(f.basename).toLowerCase()))
          .sort((a,b)=>a.basename.localeCompare(b.basename)).map(f=>f.basename);
        if (songsCol && imgs.length) {
          await songsCol.updateOne({ category, folder }, { $set: { images: imgs, imageCount: imgs.length, updatedAt: new Date() } });
        }
        const images = imgs.map(img => {
          const segs = [category, folder, img].map(s => encodeURIComponent((s || '')));
          const relative = `${segs[0]}/${segs[1]}/${segs[2]}`;
          return `/api/webdav-file?path=${relative}`;
        });
        const etag = `W/"song-${category}-${folder}-${images.length}-${Date.now()}"`;
        if (request.headers.get('if-none-match') === etag) {
          const notMod = new NextResponse(null, { status: 304 });
          notMod.headers.set('ETag', etag);
          notMod.headers.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
          return notMod;
        }
        const res = NextResponse.json({ _id: folder.toLowerCase().replace(/\s+/g,'-'), title: folder, images });
        res.headers.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
        res.headers.set('ETag', etag);
        return res;
      }
    }
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: safeError(e) }, { status: 500 });
  }
}
