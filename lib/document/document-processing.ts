import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { getDocumentProxy, extractText as unpdfExtractText, getMeta } from 'unpdf'

export interface PDFExtractOptions {
  password?: string
}

export interface PDFMetadata {
  numPages: number
  info: Record<string, any>
  metadata: any
}

export interface PDFData {
  metadata: PDFMetadata
  text: string
  totalPages: number
}

/**
 * Extract text from a PDF buffer using unpdf
 * @param buffer - PDF file buffer
 * @param options - Options to control text extraction
 * @returns Extracted text as string
 */
export const sanitizeDocumentText = (text: string): string => {
  if (!text.includes('\u0000')) {
    return text
  }

  return text.replaceAll('\u0000', '')
}

export async function extractTextFromPDF(
  buffer: Buffer,
  options?: PDFExtractOptions
): Promise<string> {
  try {
    console.log(
      `[PDF-EXTRACT] Starting PDF text extraction, buffer size: ${buffer.length} bytes`
    )

    // Convert Buffer to Uint8Array
    const data = new Uint8Array(buffer)
    console.log(`[PDF-EXTRACT] Converted to Uint8Array: ${data.length} bytes`)

    // Get document proxy
    console.log(`[PDF-EXTRACT] Getting document proxy...`)
    const pdf = await getDocumentProxy(data, options)
    console.log(`[PDF-EXTRACT] Document proxy obtained, pages: ${pdf.numPages}`)

    // Extract text with mergePages enabled
    console.log(`[PDF-EXTRACT] Extracting text from ${pdf.numPages} pages...`)
    const result = await unpdfExtractText(pdf, { mergePages: true })
    console.log(
      `[PDF-EXTRACT] ✅ Text extraction successful: ${result.text.length} characters from ${result.totalPages} pages`
    )

    return sanitizeDocumentText(result.text)
  } catch (error) {
    console.error(`[PDF-EXTRACT] ❌ Error extracting text from PDF:`, error)
    throw new Error(
      `Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Extract complete PDF data including metadata and text
 * @param buffer - PDF file buffer
 * @param options - Options to control extraction
 * @returns Object containing metadata and text
 */
export async function extractPDFData(
  buffer: Buffer,
  options?: PDFExtractOptions
): Promise<PDFData> {
  try {
    // Convert Buffer to Uint8Array
    const data = new Uint8Array(buffer)
    
    // Get document proxy
    const pdf = await getDocumentProxy(data, options)
    
    // Extract metadata and text in parallel
    const [metaResult, textResult] = await Promise.all([
      getMeta(pdf),
      unpdfExtractText(pdf, { mergePages: true })
    ])
    
    return {
      metadata: {
        numPages: pdf.numPages,
        info: metaResult.info,
        metadata: metaResult.metadata,
      },
      text: textResult.text,
      totalPages: textResult.totalPages,
    }
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function extractTextFromTXT(buffer: Buffer): Promise<string> {
  return sanitizeDocumentText(buffer.toString('utf-8'))
}

export async function extractTextFromMD(buffer: Buffer): Promise<string> {
  return sanitizeDocumentText(buffer.toString('utf-8'))
}

export async function extractText(buffer: Buffer, fileType: string): Promise<string> {
  console.log(`[EXTRACT] Extracting text from file type: ${fileType}`)
  
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return extractTextFromPDF(buffer)
    case 'txt':
      return extractTextFromTXT(buffer)
    case 'md':
    case 'markdown':
      return extractTextFromMD(buffer)
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}

export interface ChunkMetadata {
  chunkIndex: number
  totalChunks: number
  startChar: number
  endChar: number
}

export async function chunkText(
  text: string,
  chunkSize: number = 800,
  chunkOverlap: number = 100
): Promise<{ text: string; metadata: ChunkMetadata }[]> {
  const sanitizedText = sanitizeDocumentText(text)

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  })

  const chunks = await splitter.createDocuments([sanitizedText])

  return chunks.map((chunk, index) => {
    const sanitizedChunkContent = sanitizeDocumentText(chunk.pageContent)

    return {
      text: sanitizedChunkContent,
      metadata: {
        chunkIndex: index,
        totalChunks: chunks.length,
        startChar: sanitizedText.indexOf(sanitizedChunkContent),
        endChar: sanitizedText.indexOf(sanitizedChunkContent) + sanitizedChunkContent.length,
      },
    }
  })
}

