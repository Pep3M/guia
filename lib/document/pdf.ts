import { getDocumentProxy, extractText, getMeta } from 'unpdf'
import { PDFData, PDFExtractOptions, PDFMetadata } from './document-processing'

/**
 * Get PDF text content from a URL using unpdf
 * @param url - URL to the PDF file
 * @param options - Options to control text extraction
 * @returns Extracted text as string
 */
export async function getPdfContentFromUrl(
  url: string,
  options?: PDFExtractOptions
): Promise<string> {
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)
    
    // Get document proxy
    const pdf = await getDocumentProxy(data, options)
    
    // Extract text with mergePages enabled
    const result = await extractText(pdf, { mergePages: true })
    
    return result.text
  } catch (error) {
    throw new Error(`Failed to get PDF content from URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get complete PDF data (metadata and text) from a URL
 * @param url - URL to the PDF file
 * @param options - Options to control extraction
 * @returns Object containing metadata and text
 */
export async function getPdfDataFromUrl(
  url: string,
  options?: PDFExtractOptions
): Promise<PDFData> {
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)
    
    // Get document proxy
    const pdf = await getDocumentProxy(data, options)
    
    // Extract metadata and text in parallel
    const [metaResult, textResult] = await Promise.all([
      getMeta(pdf),
      extractText(pdf, { mergePages: true })
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
    throw new Error(`Failed to get PDF data from URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get PDF text content from a Buffer
 * @param buffer - PDF file buffer
 * @param options - Options to control text extraction
 * @returns Extracted text as string
 */
export async function getPdfContentFromBuffer(
  buffer: Buffer,
  options?: PDFExtractOptions
): Promise<string> {
  try {
    // Convert Buffer to Uint8Array
    const data = new Uint8Array(buffer)
    
    // Get document proxy
    const pdf = await getDocumentProxy(data, options)
    
    // Extract text with mergePages enabled
    const result = await extractText(pdf, { mergePages: true })
    
    return result.text
  } catch (error) {
    throw new Error(`Failed to get PDF content from buffer: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get complete PDF data (metadata and text) from a Buffer
 * @param buffer - PDF file buffer
 * @param options - Options to control extraction
 * @returns Object containing metadata and text
 */
export async function getPdfDataFromBuffer(
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
      extractText(pdf, { mergePages: true })
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
    throw new Error(`Failed to get PDF data from buffer: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Verify if a Buffer contains a valid PDF by checking metadata
 * @param buffer - PDF file buffer
 * @returns Metadata information including number of pages
 */
export async function verifyPdfBuffer(
  buffer: Buffer
): Promise<PDFMetadata> {
  try {
    // Convert Buffer to Uint8Array
    const data = new Uint8Array(buffer)
    
    // Get document proxy
    const pdf = await getDocumentProxy(data)
    
    // Get metadata only
    const metaResult = await getMeta(pdf)
    
    return {
      numPages: pdf.numPages,
      info: metaResult.info,
      metadata: metaResult.metadata,
    }
  } catch (error) {
    throw new Error(`Failed to verify PDF buffer: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}