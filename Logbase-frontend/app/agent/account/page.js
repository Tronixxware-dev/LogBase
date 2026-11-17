import { redirect } from 'next/navigation';

// Account became Profile
export default function AccountRedirect() {
  redirect('/agent/profile');
}
