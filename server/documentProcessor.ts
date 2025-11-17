import mammoth from 'mammoth';

export interface ProcessedDocument {
  extractedText: string;
  pageCount?: number;
  error?: string;
}

export async function extractTextFromFile(
  fileUrl: string,
  fileType: string
): Promise<ProcessedDocument> {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    if (fileType === 'pdf' || fileType === 'application/pdf') {
      return await extractTextFromPDF(fileBuffer);
    } else if (
      fileType === 'docx' ||
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return await extractTextFromWord(fileBuffer);
    } else if (fileType === 'txt' || fileType === 'text/plain') {
      return {
        extractedText: fileBuffer.toString('utf-8'),
      };
    } else {
      return {
        extractedText: '',
        error: `Unsupported file type: ${fileType}`,
      };
    }
  } catch (error: any) {
    console.error('[Document Processor] Error extracting text:', error);
    return {
      extractedText: '',
      error: error.message || 'Failed to extract text from document',
    };
  }
}

async function extractTextFromPDF(buffer: Buffer): Promise<ProcessedDocument> {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    return {
      extractedText: data.text,
      pageCount: data.numpages,
    };
  } catch (error: any) {
    console.error('[PDF Parser] Error:', error);
    return {
      extractedText: '',
      error: error.message || 'Failed to parse PDF',
    };
  }
}

async function extractTextFromWord(buffer: Buffer): Promise<ProcessedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return {
      extractedText: result.value,
    };
  } catch (error: any) {
    console.error('[Word Parser] Error:', error);
    return {
      extractedText: '',
      error: error.message || 'Failed to parse Word document',
    };
  }
}

export function chunkText(text: string, chunkSize: number = 2000): string[] {
  const sentences = text.split(/[.!?]\s+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= chunkSize) {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = sentence;
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

export function findRelevantChunks(
  text: string,
  query: string,
  maxChunks: number = 3
): string[] {
  const chunks = chunkText(text);
  const queryTerms = query.toLowerCase().split(/\s+/);

  const scoredChunks = chunks.map((chunk) => {
    const chunkLower = chunk.toLowerCase();
    let score = 0;

    for (const term of queryTerms) {
      const matches = (chunkLower.match(new RegExp(term, 'g')) || []).length;
      score += matches;
    }

    return { chunk, score };
  });

  return scoredChunks
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks)
    .map((item) => item.chunk);
}
