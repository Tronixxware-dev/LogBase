// The LogBase mark (no tile behind it, so it sits on any background) as a loading graphic: the three layers (the "books") drop onto the stack one by one,
// rest for a moment, then lift away and start again. With "reduce motion" switched on it stays a still logo.
// <LogoLoader /> sits inline; <LogoLoader fullscreen /> fills the screen (used while the app opens).

export function LogoLoader({ size = 72, label = 'Loading…', fullscreen = false, showLabel = false, className = '' }) {
  const mark = (
    <svg viewBox="8 9 48 48" width={size} height={size} className="lb-loader shrink-0" aria-hidden="true">
      <g transform="translate(32 33) scale(1.15) translate(-32 -33)" strokeWidth="2.5" strokeLinejoin="round">
        <path className="lb-layer lb-layer-1" d="M32 33 51 42 32 51 13 42Z" fill="#0d9488" stroke="#0d9488" />
        <path className="lb-layer lb-layer-2" d="M32 24 51 33 32 42 13 33Z" fill="#14b8a6" stroke="#14b8a6" />
        <path className="lb-layer lb-layer-3" d="M32 15 51 24 32 33 13 24Z" fill="#2dd4bf" stroke="#2dd4bf" />
      </g>
    </svg>
  );

  const body = (
    <div role="status" aria-live="polite" className={`flex flex-col items-center justify-center gap-4 ${fullscreen ? '' : 'py-16'} ${className}`}>
      {mark}
      {showLabel ? <p className="text-sm font-medium text-gray-500">{label}</p> : <span className="sr-only">{label}</span>}
    </div>
  );

  if (!fullscreen) return body;
  return <div className="flex min-h-screen items-center justify-center">{body}</div>;
}

export default LogoLoader;
