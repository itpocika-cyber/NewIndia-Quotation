/**
 * Automatically compresses image files on the client-side using HTML5 Canvas.
 * Supports any file size (even 10MB - 25MB camera uploads),
 * resizes proportionally to max width/height of 1200px,
 * and encodes with optimal quality (0.82) to avoid clipping and massive payloads.
 * Returns a high-definition, compressed File object (~150KB - 300KB).
 */
export async function compressImage(file, { maxWidth = 1200, maxHeight = 1200, quality = 0.80 } = {}) {
  if (!file || !file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Proportional resize preserving aspect ratio without cropping
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP with 80% quality (~150KB - 250KB from 10MB+ camera shots)
        const outputMime = 'image/webp';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            const cleanFileName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
            const compressedFile = new File([blob], cleanFileName, {
              type: outputMime,
              lastModified: Date.now()
            });

            resolve(compressedFile);
          },
          outputMime,
          quality
        );
      };

      img.onerror = () => resolve(file);
      img.src = event.target.result;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
