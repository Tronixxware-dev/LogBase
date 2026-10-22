'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/components/UserProvider';
import { canOpen } from '@/components/RoleGuard';
import { businessTypeOf, homePathFor } from '@/lib/businessTypes';

// A laundromat or a repair workshop does not open on the sales Overview: it opens on its own main page
// (the laundry register or the repair jobs). Shops, and people who may not open that page, keep the Overview.
export default function TypeHome({ children }) {
  const { user, isOwner, can } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  const home = homePathFor(businessTypeOf(user));
  const redirecting = /^\/dashboard\/?$/.test(pathname) && home !== '/dashboard' && canOpen(isOwner, can, home);

  useEffect(() => {
    if (redirecting) router.replace(home);
  }, [redirecting, home, router]);

  return redirecting ? null : children;
}
