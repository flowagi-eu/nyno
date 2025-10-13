// src/entry-server.jsx
import { renderToString } from 'react-dom/server';

export async function render(page) {
  // Dynamically import the page component
  try {
  const mod = await import(`./pages/${page}.jsx`);
  const Page = mod.default;

  let pageProps = {};
  let pageTitle = "My App";

  if (mod.getServerSideProps) {
    const context = { params: { page } };
    const result = await mod.getServerSideProps(context);
    pageProps = result.props || {};
    if (pageProps.title) pageTitle = pageProps.title;
  }

  const html = renderToString(<Page {...pageProps} />);
  return { html, title: pageTitle };
} catch (err) {
  const fallbackMod = await import("./app.jsx");
  const Fallback = fallbackMod.default;

  let pageProps = {};
  let pageTitle = "My App";

  if (fallbackMod.getServerSideProps) {
    const context = { params: { page } };
    const result = await fallbackMod.getServerSideProps(context);
    pageProps = result.props || {};
    if (pageProps.title) pageTitle = pageProps.title;
  }

  const html = renderToString(<Fallback {...pageProps} />);
  return { html, title: pageTitle };
}

}

