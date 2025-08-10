import type { NextConfig } from 'next';

// Dynamisch Domain für remote Images (Hetzner StorageBox) erlauben
const remotePatterns: NonNullable<NextConfig['images']>['remotePatterns'] = [];
if (process.env.STORAGEBOX_PUBLIC_BASE_URL) {
  try {
    const u = new URL(process.env.STORAGEBOX_PUBLIC_BASE_URL);
    remotePatterns.push({
      protocol: u.protocol.replace(':','') as 'http' | 'https',
      hostname: u.hostname,
      port: '',
      pathname: '/**'
    });
  } catch (e) {
    console.warn('Ungültige STORAGEBOX_PUBLIC_BASE_URL für images.remotePatterns:', e);
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;
