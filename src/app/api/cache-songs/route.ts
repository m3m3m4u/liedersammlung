import { NextRequest } from 'next/server';
import { getSongsCollection } from '@/lib/mongo';
import { isWebdavEnabled, getWebdavClient, IMAGE_EXTENSIONS } from '@/lib/webdav';

// liefert schnelle Liste der Songtitel aus der DB, optional initialer Scan wenn leer
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get('category') as 'noten' | 'texte' | null;
    const col = await getSongsCollection();
    if (!col) {
      return new Response(JSON.stringify({ songs: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    const query: any = {};
    if (category) query.category = category;

    let docs = await col
      .find(query, { projection: { folder: 1, title: 1, category: 1, imageCount: 1 } })
      .sort({ title: 1 })
      .toArray();

    if (docs.length === 0 && isWebdavEnabled()) {
      // beide Kategorien scannen (oder nur angefragte, falls gesetzt)
      const cats: ("noten"|"texte")[] = category ? [category] : ['noten','texte'];
      const client = getWebdavClient();
      const bulk = col.initializeUnorderedBulkOp();
      for (const cat of cats) {
        // versuche kleinschreibung und Großschreibung (historische Inkonsistenz)
        const candidateDirs = [`/${cat}`, `/${cat.charAt(0).toUpperCase()+cat.slice(1)}`];
        let entries: any[] = [];
        for (const basePath of candidateDirs) {
          try {
            entries = (await client.getDirectoryContents(basePath, { deep: false })) as any[];
            if (entries.length) break; // gefunden
          } catch {/* ignore */}
        }
        const folders = entries.filter(e => e.type === 'directory');
        for (const f of folders) {
          const folderName = f.basename;
          bulk.find({ folder: folderName, category: cat }).upsert().updateOne({
            $setOnInsert: {
              folder: folderName,
              title: folderName,
              category: cat,
              images: [],
              createdAt: new Date(),
            },
            $set: { updatedAt: new Date(), lastSync: new Date() },
          });
        }
      }
      if ((bulk as any).length > 0) await bulk.execute();
      docs = await col
        .find(query, { projection: { folder: 1, title: 1, category: 1, imageCount: 1 } })
        .sort({ title: 1 })
        .toArray();
    }

    return new Response(JSON.stringify({ songs: docs }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

// POST triggert Refresh Scan
export async function POST(req: NextRequest) {
  try {
    if (!isWebdavEnabled())
      return new Response(JSON.stringify({ ok: false, reason: 'webdav disabled' }), { status: 400 });
    await req.json().catch(() => ({}));
  const col = await getSongsCollection();
  if (!col) return new Response(JSON.stringify({ ok: false, reason: 'no collection' }), { status: 500 });
    const client = getWebdavClient();
    const cats: ("noten"|"texte")[] = ['noten','texte'];
    let totalFolders = 0, updated = 0;
    const bulk = col.initializeUnorderedBulkOp();
    for (const cat of cats) {
      const candidateDirs = [`/${cat}`, `/${cat.charAt(0).toUpperCase()+cat.slice(1)}`];
      let entries: any[] = [];
      for (const basePath of candidateDirs) {
        try { entries = (await client.getDirectoryContents(basePath, { deep: false })) as any[]; if (entries.length) break; } catch {/* ignore */}
      }
      const folders = entries.filter(e => e.type === 'directory');
      totalFolders += folders.length;
      for (const f of folders) {
        const folderName = f.basename;
        bulk.find({ folder: folderName, category: cat }).upsert().updateOne({
          $setOnInsert: {
            folder: folderName,
            title: folderName,
            category: cat,
            images: [],
            createdAt: new Date(),
          },
          $set: { updatedAt: new Date(), lastSync: new Date() },
        });
        updated++;
      }
    }
    if ((bulk as any).length > 0) await bulk.execute();
    return new Response(JSON.stringify({ ok: true, totalFolders, upserts: updated }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
