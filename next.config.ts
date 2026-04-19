import type { NextConfig } from "next";

// @react-pdf/renderer is a CJS package with internal singletons (font registry,
// style engine, yoga layout). Bundling it breaks those singletons.
// serverExternalPackages tells both webpack and Turbopack to skip bundling these
// packages — Node.js loads them natively at runtime instead.
//
// We list the top-level package AND every @react-pdf/* sub-package because each
// sub-package owns part of the singleton chain (stylesheet, font registry, etc.).
const nextConfig: NextConfig = {
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
