import { NextResponse } from 'next/server';
import { getSongsCollection } from '@/lib/mongo';
import { isWebdavEnabled, getWebdavClient } from '@/lib/webdav';

interface WebDavEntry { type: string; basename: string; [k: string]: unknown }

export async function GET() {
  try {
    const col = await getSongsCollection();
    const dbDocs = col ? await col.find({}).limit(500).toArray() : [];
    let webdav: { noten: string[]; texte: string[] } | null = null;
    if (isWebdavEnabled()) {
      try {
        const client = getWebdavClient();
        const scan = async (base: string) => {
          const variants = [base, base.charAt(0).toUpperCase() + base.slice(1)];
          for (const v of variants) {
            const ents = await client.getDirectoryContents(`/${v}`).catch(() => []) as WebDavEntry[];
            if (ents.length) return ents.filter(e => e.type === 'directory').map(e => e.basename).sort();
          }
          return [] as string[];
        };
        webdav = { noten: await scan('noten'), texte: await scan('texte') };
      } catch {/* ignore */}
    }
    return NextResponse.json({
      dbCount: dbDocs.length,
      dbSample: dbDocs.map(d => ({ category: d.category, folder: d.folder, images: d.images?.length || 0 })).slice(0,50),
      webdav,
      webdavEnabled: isWebdavEnabled(),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
