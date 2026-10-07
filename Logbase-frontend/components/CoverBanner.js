// The wide picture across the top of a profile. With no picture chosen yet it shows a designed default
// (brand-coloured gradient, soft rings, dots and waves) so the page never looks unfinished.
//
// The size and colours are set inline on purpose: the banner must look right even if the page's utility
// classes have not been rebuilt yet.

const BOX = {
  position: 'relative',
  width: '100%',
  height: 'clamp(8rem, 20vw, 11rem)',
  overflow: 'hidden',
};

function DefaultCover() {
  return (
    <div
      data-default-cover="true"
      aria-hidden="true"
      style={{
        ...BOX,
        background:
          'linear-gradient(120deg, var(--primary-dark, #0f766e) 0%, var(--primary, #0d9488) 55%, #2dd4bf 100%)',
      }}
    >
      <svg
        viewBox="0 0 800 200"
        preserveAspectRatio="xMidYMid slice"
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0, display: 'block' }}
      >
        <defs>
          <pattern id="cover-dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="#ffffff" fillOpacity="0.22" />
          </pattern>
          <radialGradient id="cover-glow" cx="85%" cy="10%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="800" height="200" fill="url(#cover-glow)" />
        <rect x="430" width="370" height="200" fill="url(#cover-dots)" />

        {/* soft rings, top right */}
        <circle cx="690" cy="30" r="150" fill="#ffffff" fillOpacity="0.07" />
        <circle cx="690" cy="30" r="95" fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1.5" />
        <circle cx="610" cy="205" r="80" fill="#ffffff" fillOpacity="0.08" />
        <circle cx="70" cy="40" r="46" fill="none" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1.5" />

        {/* waves along the bottom */}
        <path
          d="M0 150 C 120 110, 240 190, 380 150 S 640 105, 800 150 L800 200 L0 200 Z"
          fill="#ffffff"
          fillOpacity="0.1"
        />
        <path
          d="M0 175 C 150 140, 280 205, 430 172 S 680 140, 800 172 L800 200 L0 200 Z"
          fill="#ffffff"
          fillOpacity="0.12"
        />
      </svg>
    </div>
  );
}

export default function CoverBanner({ url, alt = 'Profile cover' }) {
  if (!url) return <DefaultCover />;
  return (
    <div style={BOX}>
      <img src={url} alt={alt} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
}
