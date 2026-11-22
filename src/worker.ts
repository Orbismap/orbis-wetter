export default {
  async fetch(request: Request, env: { ASSETS: any }): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/wetter') {
      return Response.redirect(url.origin + '/wetter/', 301);
    }
    return env.ASSETS.fetch(request);
  },
};