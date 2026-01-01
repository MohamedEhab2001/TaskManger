import { readFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const contentType = 'image/x-icon';

export default async function Icon() {
  const filePath = path.join(process.cwd(), 'public', 'brand', 'icon.ico');
  const bytes = await readFile(filePath);

  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
