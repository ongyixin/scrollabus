declare module "pdf-parse" {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: object;
    metadata: object;
    text: string;
    version: string;
  }
  function pdfParse(
    dataBuffer: Buffer,
    options?: object
  ): Promise<PDFData>;
  export = pdfParse;
}
