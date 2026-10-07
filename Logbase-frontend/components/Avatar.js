// A round picture of a person: their profile photo, or their first letter when they have none.
// tone: 'gray' (default), 'primary' (brand tint) or 'light' (for dark backgrounds)
// size: 'xs' (next to a name in a table), 'sm' (menu, staff list) or 'lg' (profile page)
const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  lg: 'h-16 w-16 text-2xl',
};

export default function Avatar({ name, photoUrl, size = 'sm', tone = 'gray', className = '' }) {
  const sizeClass = SIZES[size] || SIZES.sm;
  const toneClass =
    tone === 'primary'
      ? 'bg-primary/10 text-primary'
      : tone === 'light'
        ? 'bg-white/20 text-white' // on a dark background
        : 'bg-gray-100 text-gray-600';

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name ? `${name}’s photo` : 'Profile photo'}
        className={`${sizeClass} shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span className={`flex ${sizeClass} ${toneClass} shrink-0 items-center justify-center rounded-full font-semibold ${className}`}>
      {(name || '?').charAt(0).toUpperCase()}
    </span>
  );
}

// A small photo (or letter) followed by a name, on one line. Used for "Sold by".
export function PersonChip({ name, photoUrl }) {
  if (!name) return <span>—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar name={name} photoUrl={photoUrl} size="xs" />
      <span>{name}</span>
    </span>
  );
}
