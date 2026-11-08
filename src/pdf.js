import * as pdfjs from "pdfjs-dist";
import worker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {linesFromItems} from "./engine/lines.js";
pdfjs.GlobalWorkerOptions.workerSrc = worker;
export async function readPages(file,onProgress){
  const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;const pages=[];
  for(let i=1;i<=pdf.numPages;i++){
    pages.push({no:i,lines:linesFromItems((await(await pdf.getPage(i)).getTextContent()).items)});
    onProgress?.(i,pdf.numPages);
  }
  return pages;
}
