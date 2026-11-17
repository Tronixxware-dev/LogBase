import { redirect } from 'next/navigation';

// The Sales Agent pages now have their own place, /agent (an agent has no business menu).
export default function OldAgentPage() {
  redirect('/agent');
}
