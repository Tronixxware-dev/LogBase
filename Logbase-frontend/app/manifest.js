// What a phone or computer needs to install LogBase like an app (the "Install" / "Add to Home Screen" option).
export default function manifest() {
  return {
    name: 'LogBase',
    short_name: 'LogBase',
    description: 'Track products, purchases, sales and customers for your business.',
    id: '/dashboard',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#0d9488',
    orientation: 'portrait',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Record a sale', short_name: 'New sale', url: '/dashboard/sales/new', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
    ],
  };
}
