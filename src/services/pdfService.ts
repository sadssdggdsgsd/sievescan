import * as pdfjs from 'pdfjs-dist';
// @ts-ignore - pdf.worker.mjs exists in the package but might not have types in some setups
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Define worker source for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function convertPdfToImages(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const images: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport, canvas: canvas }).promise;
    images.push(canvas.toDataURL('image/png'));
  }

  return images;
}
