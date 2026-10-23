// The address a referred business signs up at: the sign-up page with the referrer's code already filled in.
export function signupLink(code) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}/signup?ref=${code}`;
}
