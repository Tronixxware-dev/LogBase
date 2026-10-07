// Photos that were added while a sale was recorded. A recorded sale is final, so they are only shown.
// images: the sale's images ({ url, publicId })
export default function SaleGallery({ images = [] }) {
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
          <img src={img.url} alt="Sale" className="h-full w-full object-cover" />
        </a>
      ))}
    </div>
  );
}
