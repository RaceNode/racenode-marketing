// A circuit's logo, downloaded and shrunk by the build (src/lib/calendar/logos.mjs) and served from the site:
// /calendar/logos/circuits/<circuit slug>.webp, the slug of its page's URL. Only the circuits whose logo came through
// have one.
import { catalog } from '../../../../lib/calendar/build.mjs';

export async function getStaticPaths() {
  const { circuitLogoFiles } = await catalog();
  return [...circuitLogoFiles.keys()].map((slug) => ({ params: { slug } }));
}

export async function GET({ params }: { params: { slug: string } }) {
  const { circuitLogoFiles } = await catalog();
  return new Response(circuitLogoFiles.get(params.slug)!.file, {
    headers: { 'content-type': 'image/webp' },
  });
}
