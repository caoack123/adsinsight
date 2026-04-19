import type { NextConfig } from "next";

// @react-pdf/renderer is a CJS package with internal singletons (font registry,
// style engine, yoga layout) AND a "browser" field in package.json that swaps
// in a browser-only build without `renderToBuffer`.
//
// Two-layer defence:
//  1. serverExternalPackages — Next.js tells its own bundler to skip these
//  2. webpack.externals function — belt-and-suspenders: explicitly marks every
//     @react-pdf/* import as a native commonjs external so webpack never
//     touches them (no browser-field substitution, no singleton splitting).
const REACT_PDF_PKGS = [
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
];

const nextConfig: NextConfig = {
  serverExternalPackages: REACT_PDF_PKGS,

  webpack(config, { isServer }) {
    if (isServer) {
      // Force every @react-pdf/* import to be resolved by Node at runtime,
      // bypassing webpack's browser-field substitution entirely.
      config.externals = [
        ...(Array.isArray(config.externals)
          ? config.externals
          : [config.externals].filter(Boolean)),
        (
          { request }: { request?: string },
          callback: (err?: Error | null, result?: string) => void,
        ) => {
          if (request && request.startsWith('@react-pdf/')) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    }
    return config;
  },
};

export default nextConfig;
