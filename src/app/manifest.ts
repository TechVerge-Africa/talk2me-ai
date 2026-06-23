import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Talk2Me — The AI-Powered Communication Platform',
    short_name: 'Talk2Me',
    description: 'AI-powered interpretation, real-time captions, and seamless streaming for accessible communication.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d0e12', // deep slate matching the dark mode theme
    theme_color: '#4f46e5', // indigo matching the primary brand color
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      {
        src: '/assets/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/assets/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/assets/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/assets/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  };
}
