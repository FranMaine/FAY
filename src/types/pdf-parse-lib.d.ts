// pdf-parse@1.1.1's package entrypoint (index.js) runs debug-only code at
// module load time when `module.parent` is undefined -exactly what happens
// during Next.js's build-time page-data tracing- so we import the inner
// submodule directly (see src/lib/extractors/pdf-extractor.ts). @types/pdf-parse
// only ships a declaration for the package root, so we declare this subpath
// ourselves, mirroring that same signature.
declare module 'pdf-parse/lib/pdf-parse.js' {
  // "import X = require(...)" es la forma correcta en TypeScript de tipar
  // un módulo CommonJS con "export =" -no es un require() de JS real, pero
  // la regla de lint no distingue el caso y lo marca igual.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  import PdfParse = require('pdf-parse');
  export = PdfParse;
}
