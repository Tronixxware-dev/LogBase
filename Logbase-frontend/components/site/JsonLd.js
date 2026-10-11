// Hidden data that tells Google what a page is about (who makes LogBase, what it costs, which article this is).
export default function JsonLd({ data }) {
  // "<" is escaped so the text can never close the script tag early
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
