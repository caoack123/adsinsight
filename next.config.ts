import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer is a CJS package with internal singletons (font registry,
  // style engine, yoga layout). Webpack bundling breaks those singletons and causes
  // "Cannot read properties of undefined (reading 'S')" errors.
  //
  // We must mark the top-level package AND every @react-pdf/* sub-package as external
  // so Node.js loads them all natively through the same require() cache.
  // Marking only @react-pdf/renderer is not enough — webpack still bundles the
  // sub-packages (e.g. @react-pdf/stylesheet) which own the broken singletons.
  serverExternalPackages: [
    '@react-pdf/renderer',
    '@react-pdf/fns',
    '@react-pdf/font',
    '@react-pdf/image',
    '@react-pdf/layout',
    '@react-pdf/pdfkit',
    '@react-pdf/primitives',
    '@react-pdf/reconciler',
    '@react-pdf/render',
    '@react-pdf/stylesheet',
    '@react-pdf/svg',
    '@react-pdf/textkit',
    '@react-pdf/types',
  ],
};

export default nextConfig;
