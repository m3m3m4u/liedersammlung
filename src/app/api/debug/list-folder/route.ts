import { NextResponse } from 'next/server';
import { isWebdavEnabled, getWebdavClient } from '@/lib/webdav';

interface WebDavEntry { type: string; basename: string; [k: string]: unknown }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get('type') || 'noten').toLowerCase();
  const folder = searchParams.get('folder');
  if (category !== 'noten' && category !== 'texte') {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  }
  if (!folder) {
    return NextResponse.json({ error: 'folder required' }, { status: 400 });
  }
  if (!isWebdavEnabled()) {
    return NextResponse.json({ error: 'webdav disabled' }, { status: 400 });
  }
  try {
    const client = getWebdavClient();
    const bases = [`/${category}`, `/${category.charAt(0).toUpperCase()}${category.slice(1)}`];
    let files: WebDavEntry[] = [];
    for (const b of bases) {
      try {
        files = await client.getDirectoryContents(`${b}/${folder}`).catch(()=>[]) as WebDavEntry[];
        if (files.length) break;
      } catch {}
    }
    return NextResponse.json({
      files: files.map(f => ({ name: f.basename, type: f.type }))
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
