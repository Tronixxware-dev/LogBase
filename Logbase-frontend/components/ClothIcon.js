// One small outline picture for each kind of clothing the laundry register knows (Native, Jean, Polo, Agbada, Socks...).
// 24x24 grid, drawn the same way as the other icons in the app, so they take the colour of the text around them.
// <ClothIcon name="Short Jean" className="h-6 w-6" />. A name the list does not know gets a clothes hanger.
// No hooks in here, so it works in any page.

const SHIRT_BODY = 'M8 4 3.5 6.5l2 4L8 9.3V20h8V9.3l2.5 1.2 2-4L16 4';

const dot = (x, y) => <circle cx={x} cy={y} r="0.75" fill="currentColor" stroke="none" />;

const PICTURES = {
  // a traditional top: wide body, short wide sleeves, round neck with embroidery
  native: (
    <>
      <path d="M8.5 4 5 6 2.5 10l2.5 1.7 2-2.2V20h10V9.5l2 2.2 2.5-1.7L19 6l-3.5-2" />
      <path d="M8.5 4Q12 8.2 15.5 4" />
      <path d="M12 7.2V12" />
      <path d="M10 13.5h4M10.5 15.5h3" />
    </>
  ),
  // long trousers
  jean: (
    <>
      <path d="M7 3h10l1.2 18H13.6L12 10.5 10.4 21H5.8Z" />
      <path d="M7 6.5h10" />
      <path d="M12 6.5v4" />
      <path d="M8.6 8.2q1.6.2 2 2" />
      <path d="M15.4 8.2q-1.6.2-2 2" />
    </>
  ),
  // denim shorts: pockets and a stitched hem
  shortjean: (
    <>
      <path d="M5.5 5h13l1 11h-6L12 11l-1.5 5h-6Z" />
      <path d="M5.5 8h13" />
      <path d="M12 8v3" />
      <path d="M7.2 9.6q1.4.1 1.8 1.6M16.8 9.6q-1.4.1-1.8 1.6" />
      <path d="M4.9 14h5M13.9 14h5" strokeDasharray="1.3 1.2" />
    </>
  ),
  // sports shorts: drawstring and a side stripe
  short: (
    <>
      <path d="M5.5 5h13l1 11h-6L12 11l-1.5 5h-6Z" />
      <path d="M5.5 7.5h13" />
      <path d="M12 7.5v2.6" />
      <path d="M10.6 7.5 9.6 10.2M13.4 7.5l1 2.7" />
      <path d="M7 10.5l-.6 4.8" />
    </>
  ),
  // T-shirt with a round neck
  roundneck: (
    <>
      <path d={SHIRT_BODY} />
      <path d="M8 4Q12 8 16 4" />
    </>
  ),
  // long sleeves with ribbed cuffs and hem
  sweatshirt: (
    <>
      <path d="M8.5 4 4 6 3 17h3.6L7 10.8V20h10v-9.2l.4 6.2H21L20 6l-4.5-2" />
      <path d="M8.5 4Q12 7 15.5 4" />
      <path d="M7 17.4h10" />
      <path d="M3.2 14.8h3.2M17.6 14.8h3.2" />
    </>
  ),
  // shirt with a collar and a short button placket
  polo: (
    <>
      <path d={SHIRT_BODY} />
      <path d="M8 4 10.4 3.1 12 7.4 9.6 8.4Z" />
      <path d="M16 4 13.6 3.1 12 7.4 14.4 8.4Z" />
      {dot(12, 10)}
      {dot(12, 12.4)}
    </>
  ),
  // long-sleeved shirt with a collar and full row of buttons
  shirt: (
    <>
      <path d="M9 3.5 4.5 5.5 3 17.5l2.6.5L7.5 10v10.5h9V10l1.9 8 2.6-.5L19.5 5.5 15 3.5" />
      <path d="M9 3.5 12 7l3-3.5" />
      {dot(12, 9.8)}
      {dot(12, 12.6)}
      {dot(12, 15.4)}
      {dot(12, 18.2)}
    </>
  ),
  // short-sleeved shirt with a collar, buttons and a chest pocket
  shortshirt: (
    <>
      <path d="M8.5 3.5 3.5 6.5l1.8 3.6L7.5 9v11.5h9V9l2.2 1.1 1.8-3.6-5-3" />
      <path d="M8.5 3.5 12 7l3.5-3.5" />
      {dot(12, 9.8)}
      {dot(12, 12.6)}
      {dot(12, 15.4)}
      {dot(12, 18.2)}
      <path d="M13.8 11.5h2v2.6h-2Z" />
    </>
  ),
  // open knitted jacket: deep V, buttons, ribbed hem
  cardigan: (
    <>
      <path d="M9 3.5 4.5 5.5 3.2 17.2h3.4L7.2 10v10.5h9.6V10l.6 7.2h3.4L19.5 5.5 15 3.5" />
      <path d="M9 3.5 12 11l3-7.5" />
      <path d="M12 11v9.5" />
      {dot(10.2, 13.5)}
      {dot(10.2, 16)}
      <path d="M7.2 18.4h9.6" />
    </>
  ),
  // a wide flowing robe with big hanging sleeves
  agbada: (
    <>
      <path d="M9 3.5 3 8.6l-.5 10L8 14.2V21h8v-6.8l5.5 4.4-.5-10L15 3.5Q12 6.6 9 3.5Z" />
      <path d="M12 6.4v5.6" />
      <path d="M10.2 9h3.6" />
      <path d="M10 15.5h4" />
    </>
  ),
  // jacket with lapels, a tie and a pocket
  suit: (
    <>
      <path d="M8.5 3 4.5 5 4 20.5h16L19.5 5l-4-2" />
      <path d="M8.5 3 12 12.5 15.5 3" />
      <path d="M12 5.2 10.9 7.2 12 12.5l1.1-5.3Z" />
      <path d="M12 12.5v8" />
      <path d="M6.3 15.4h3" />
      {dot(14.2, 16)}
    </>
  ),
  // a dress: neckline, fitted waist, flared skirt
  gown: (
    <>
      <path d="M9 3 8 8l1.6 3L5 21h14l-4.6-10L16 8l-1-5" />
      <path d="M9 3Q12 7.2 15 3" />
      <path d="M9.6 11h4.8" />
    </>
  ),
  // a long loose robe: straight sleeves, a V opening and an embroidered hem
  jalabia: (
    <>
      <path d="M9 3 4 5 3 12.5l2.6.4L7 9.4V21h10V9.4l1.4 3.5 2.6-.4L20 5l-5-2Q12 6 9 3Z" />
      <path d="M12 5.4v5" />
      <path d="M7 18.4h10" />
    </>
  ),
  // a sock: ribbed cuff, leg, heel and toe
  socks: (
    <>
      <path d="M8 3h7v8.5l4.6 3q2.3 2.9-.3 5.1-3 1.5-5.6-.4L8 14.5Z" />
      <path d="M8 6h7M8 8.2h7" />
    </>
  ),
  // a baseball cap
  cap: (
    <>
      <path d="M5 14.5C5 8.4 8 6 12 6s7 2.4 7 8.5" />
      <path d="M5 14.5Q13 18.4 22 15.8Q21.2 14.5 19 14.5Z" />
      <path d="M12 6v8.5" />
      <circle cx="12" cy="5.4" r="0.8" />
    </>
  ),
  // a knitted beanie with a folded rim and a pom-pom
  headwarmer: (
    <>
      <path d="M5.5 14C5.5 8 8.2 6 12 6s6.5 2 6.5 8" />
      <path d="M4.5 14h15v4.5h-15Z" />
      <path d="M8.3 14v4.5M12 14v4.5M15.7 14v4.5" />
      <circle cx="12" cy="4" r="1.7" />
    </>
  ),
  // a folded towel with stripes and a wavy fold
  facetowel: (
    <>
      <path d="M4.5 4.5h15v15h-15Z" />
      <path d="M4.5 8.6q3.7 1.9 7.5 0t7.5 0" />
      <path d="M4.5 14.2h15M4.5 16.6h15" />
      <path d="M7 19.5v1.8M10 19.5v1.8M14 19.5v1.8M17 19.5v1.8" />
    </>
  ),
  // a square cloth with a stitched border, set on its corner
  handkerchief: (
    <>
      <path d="M12 2.8 21.2 12 12 21.2 2.8 12Z" />
      <path d="M12 6.6 17.4 12 12 17.4 6.6 12Z" strokeDasharray="1.4 1.3" />
    </>
  ),
  // a quilted cover
  duvet: (
    <>
      <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <path d="M4 9.7h16M4 14.4h16" />
      <path d="M9.3 5v15M14.7 5v15" />
    </>
  ),
  // a bed with its cover hanging over the sides
  bedspread: (
    <>
      <path d="M3.5 5.5v14M20.5 11v8.5" />
      <path d="M3.5 12.5h17" />
      <path d="M6 12.5V16q1.5 1.7 3 0 1.5 1.7 3 0 1.5 1.7 3 0 1.5 1.7 3 0v-3.5" />
      <path d="M5.8 8.8Q5.8 8 6.6 8h3.8q.8 0 .8.8v3.7H5.8Z" />
    </>
  ),
  // a duvet with its pillow
  completeduvet: (
    <>
      <path d="M6.5 3.6h11a1 1 0 0 1 1 1V8.8h-13V4.6a1 1 0 0 1 1-1Z" />
      <path d="M3.5 12a1.8 1.8 0 0 1 1.8-1.8h13.4a1.8 1.8 0 0 1 1.8 1.8v6.7a1.8 1.8 0 0 1-1.8 1.8H5.3a1.8 1.8 0 0 1-1.8-1.8Z" />
      <path d="M3.5 15.3h17" />
      <path d="M9.2 10.2v10.3M14.8 10.2v10.3" />
    </>
  ),
  // anything else: a clothes hanger
  hanger: (
    <>
      <path d="M12 8.2V7q0-1 1-1.5a2.2 2.2 0 1 0-3.4-1.8" />
      <path d="M12 8.2 3.6 14.6q-.9.8.1 1.4h16.6q1-.6.1-1.4Z" />
    </>
  ),
};

// What each item name is drawn as. The first rule that matches the name wins, so the specific ones come first
// ("Short Jean" before "Jean", "Complete duvet" before "Duvet"). Owners add their own items, so these also catch
// close names such as "T-shirt", "Trousers" or "Blanket".
const RULES = [
  [/short.*jean|jean.*short/, 'shortjean'],
  [/short.*shirt|half.?sleeve/, 'shortshirt'],
  [/complete.*duvet|duvet.*(set|complete)/, 'completeduvet'],
  [/head.?warm|beanie|woolly|scarf|muffler|balaclava/, 'headwarmer'],
  [/native|senator|ankara|kaftan|buba|dashiki/, 'native'],
  [/agbada|boubou|babariga/, 'agbada'],
  [/jalab|abaya|thobe|caftan/, 'jalabia'],
  [/jean|denim|trouser|pant|chino|jogger|legging/, 'jean'],
  [/short|boxer|brief/, 'short'],
  [/round.?neck|t-?shirt|tee\b|singlet|vest|tank/, 'roundneck'],
  [/sweat|hood|jumper|pullover|fleece/, 'sweatshirt'],
  [/polo/, 'polo'],
  [/cardigan|sweater|knit|shawl/, 'cardigan'],
  [/shirt|blouse|top\b/, 'shirt'],
  [/suit|blazer|jacket|coat|waistcoat|tuxedo/, 'suit'],
  [/gown|dress|skirt|wrapper|iro\b|nightie/, 'gown'],
  [/sock|stocking|hosiery/, 'socks'],
  [/\bcap\b|\bhat\b|beret|fila/, 'cap'],
  [/towel|napkin|cloth\b/, 'facetowel'],
  [/handkerchief|hankie|kerchief|bandana/, 'handkerchief'],
  [/duvet|blanket|comforter|quilt|throw/, 'duvet'],
  [/bed.?spread|bed.?sheet|sheet|bedding|curtain|pillow|cover/, 'bedspread'],
];

export function clothKeyFor(name) {
  const text = String(name || '').toLowerCase().trim();
  if (!text) return 'hanger';
  const hit = RULES.find(([pattern]) => pattern.test(text));
  return hit ? hit[1] : 'hanger';
}

export const CLOTH_KEYS = Object.keys(PICTURES);

export function ClothIcon({ name, className = 'h-6 w-6', title }) {
  const picture = PICTURES[clothKeyFor(name)] || PICTURES.hanger;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : 'true'}
    >
      {picture}
    </svg>
  );
}

// The picture in a soft rounded square, for the first column of a table. size: 'sm', 'md' (default) or 'lg'.
export function ClothTile({ name, size = 'md', className = '' }) {
  const box = size === 'sm' ? 'h-8 w-8 rounded-lg' : size === 'lg' ? 'h-11 w-11 rounded-xl' : 'h-9 w-9 rounded-xl';
  return (
    <span className={`inline-flex shrink-0 items-center justify-center bg-primary/10 text-primary ${box} ${className}`}>
      <ClothIcon name={name} className={size === 'sm' ? 'h-[18px] w-[18px]' : size === 'lg' ? 'h-7 w-7' : 'h-5 w-5'} />
    </span>
  );
}
