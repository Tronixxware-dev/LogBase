'use client';

import { usePathname } from 'next/navigation';

// Gives every page a soft fade-and-rise when you open it. The key restarts the animation on each new address.
export default function PageTransition({ children }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-fade-up">
      {children}
    </div>
  );
}
