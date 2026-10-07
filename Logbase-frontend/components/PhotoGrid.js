// Photos that were added while a sale or purchase was recorded. A recorded entry is final,
// so they are only shown (click one to open it full size).
// images: array of { url, publicId }
// alt:    description for the pictures
export default function PhotoGrid({ images = [], alt = 'Photo' }) {
  if (images.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {images.map((img) => (
        <a
          key={img.publicId || img.url}
          href={img.url}
          target="_blank"
          rel="noreferrer"
          className="aspect-square overflow-hidden rounded-lg border border-gray-200"
        >
          <img src={img.url} alt={alt} className="h-full w-full object-cover" />
        </a>
      ))}
    </div>
  );
}
