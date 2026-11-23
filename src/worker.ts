/**
 * Orbis Wetter has moved into the orbis-map repo and lives at https://wetter.maltee.dev/.
 * This worker only keeps the old address working: everything under maps.maltee.dev/wetter* is redirected, so
 * bookmarks and PWAs installed from the old path land on the new origin.
 */
const TARGET = 'https://wetter.maltee.dev';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    // /wetter, /wetter/ and /wetter/anything → same path on the new host, without the /wetter prefix.
    const rest = url.pathname.replace(/^\/wetter\/?/, '/');
    return Response.redirect(`${TARGET}${rest}${url.search}${url.hash}`, 301);
  },
};
