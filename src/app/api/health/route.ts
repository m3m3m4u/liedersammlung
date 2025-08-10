import { NextResponse } from 'next/server';
import { isWebdavEnabled, buildPublicUrl } from '../../../lib/webdav';

export async function GET() {
  const webdav = isWebdavEnabled();
  return NextResponse.json({
    storageMode: webdav ? 'webdav' : 'local',
    webdavPublicBase: webdav ? buildPublicUrl('') : null,
    timestamp: new Date().toISOString()
  });
}
