// A championship's official logo, downloaded and shrunk by the build (src/lib/calendar/logos.mjs) and served from
// the site: /calendar/logos/<series slug>.webp. Only the championships whose logo came through have one.
import { catalog } from '../../../lib/calendar/build.mjs';

export async function getStaticPaths() {
  const { logoFiles } = await catalog();
  return [...logoFiles.keys()].map((slug) => ({ params: { slug } }));
}

export async function GET({ params }: { params: { slug: string } }) {
  const { logoFiles } = await catalog();
  return new Response(logoFiles.get(params.slug)!.file, { headers: { 'content-type': 'image/webp' } });
}
