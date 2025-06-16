# Changing the Render Engine

BlogposterCMS ships with a client-driven renderer by default. The dynamic
`pageRenderer.js` script lives under `public/assets/js/` and builds pages in the
browser. Some deployments may prefer a traditional server-side approach instead
of relying entirely on JavaScript on the client. This document explains where to
hook in your own rendering logic and what to consider for both strategies.

## Switching via Environment Variables

To avoid editing core files, you can toggle the renderer using the `RENDER_MODE` environment variable or by creating `config/runtime.local.js`. Set `RENDER_MODE=server` for server-side rendering or `RENDER_MODE=client` for the default client-side approach. When overriding via `runtime.local.js`, you may export `{ features: { renderMode: "server" } }` – Blogposter merges this with existing feature flags, so other settings remain intact. The application reads this flag during start-up so you modify configuration only, not the code. When `renderMode` is `server`, Blogposter automatically strips the `pageRenderer.js` script from the served HTML files. Currently there is no in-app toggle; switching via environment variables or `runtime.local.js` is the supported approach.


## Server-Side Rendering

1. **Disable the default client renderer** – Remove or comment out the
   `<script type="module" src="/assets/js/pageRenderer.js"></script>` line in
   `public/index.html` and other templates. With the script gone the server must
   provide fully rendered HTML.
2. **Implement a render function** – Modify `app.js` to call your preferred view
   engine (e.g. EJS, Pug, React SSR) when responding to page requests. The
   existing middleware already fetches page data via the meltdown event bus, so
   pass that data into your templates before sending the response.
3. **Sanitize any dynamic content** – When rendering on the server be mindful of
   cross-site scripting risks. Escape user input and use an established templating
   engine that auto‑escapes HTML by default.
4. **Cache carefully** – To keep load times reasonable, enable caching headers
   or server-side memoization. Never cache private content or pages containing
   user-specific data without additional controls.

## Client-Side Rendering (CSR)

1. **Keep `pageRenderer.js` enabled** – Ensure the script tag for
   `pageRenderer.js` remains in your HTML. The script loads widgets and layouts
   via API calls and assembles the page in the browser.
2. **Expose only needed APIs** – CSR requires the browser to fetch page data.
   Review the REST endpoints opened in `app.js` and disable any you do not need
   publicly. Use strict CORS and CSRF protections to guard admin APIs.
3. **Monitor bundle size** – Complex client renderers grow quickly. Use the
   provided Webpack config to split vendor libraries and enable compression so
   pages load fast even with many widgets.
4. **Consider a hydration step** – If SEO or first render speed is important,
   you can pre-generate minimal markup on the server and let `pageRenderer.js`
   hydrate it. This hybrid approach keeps interactive features without fully
   committing to SSR.

Changing the render engine involves editing core files. Back up your instance
and test thoroughly before deploying new rendering logic.
