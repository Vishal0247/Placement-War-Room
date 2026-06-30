import { PDFParse } from 'pdf-parse';

export async function parseResumePDF(buffer: Buffer): Promise<string> {
  try {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const textResult = await parser.getText();
    return textResult.text || '';
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error("Failed to parse resume PDF");
  }
}
