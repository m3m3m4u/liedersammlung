import { NextResponse } from 'next/server';
import { getWebdavClient, isWebdavEnabled } from '../../../lib/webdav';

export async function GET() {
  if (!isWebdavEnabled()) return NextResponse.json({ enabled: false });
  try {
    const client = getWebdavClient();
    // Simple existence check at root
    await client.getDirectoryContents('/');
    return NextResponse.json({ enabled: true, ok: true });
  } catch (e) {
    return NextResponse.json({ enabled: true, ok: false, error: (e as Error).message }, { status: 500 });
  }
}
