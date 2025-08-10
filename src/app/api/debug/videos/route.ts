import { NextResponse } from 'next/server';
import { getVideoCollection } from '@/lib/mongo';
import { isWebdavEnabled, getWebdavClient } from '@/lib/webdav';

interface WebDavEntry { type: string; basename: string; [k: string]: unknown }
interface DebugResult { db: unknown; webdav: unknown; }

export async function GET() {
  const out: DebugResult = { db: null, webdav: null };
  try {
    const col = await getVideoCollection();
    if (col) {
      out.db = await col.find({}).limit(200).toArray();
    } else {
      out.db = 'no-db';
    }
  } catch (e: unknown) {
    out.db = { error: e instanceof Error ? e.message : 'unknown error' };
  }

  if (isWebdavEnabled()) {
    try {
      const client = getWebdavClient();
      const raw = await client.getDirectoryContents('/videos').catch(()=>[]) as unknown;
      const entries = raw as WebDavEntry[];
      out.webdav = entries.filter(e=> e.type==='file' && e.basename.endsWith('.json')).map(e=> e.basename);
    } catch (e: unknown) {
      out.webdav = { error: e instanceof Error ? e.message : 'unknown error' };
    }
  } else {
    out.webdav = 'disabled';
  }
  return NextResponse.json(out);
}
