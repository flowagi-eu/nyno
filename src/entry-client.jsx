import React from 'react';
import { hydrateRoot } from 'react-dom/client';

// Dynamically import all pages
const pages = import.meta.glob('./pages/*.jsx');

// Determine current page from URL
const path = window.location.pathname.slice(1) || 'index';
const loader = pages[`./pages/${path}.jsx`];

if (loader) {
  loader().then((mod) => {
    hydrateRoot(document.getElementById('app'), <mod.default />);
  });
} else {
  // Fallback to App if page not found
  import('./app.jsx').then((mod) => {
    hydrateRoot(document.getElementById('app'), <mod.default />);
  });
}

