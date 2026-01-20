/**
 * PDF MCQ Feature Module
 * AI-powered PDF to MCQ generator
 * 
 * Features:
 * - Upload any PDF (notes, books, coaching material)
 * - AI extracts text and generates UPSC-level MCQs
 * - Bilingual: English + Hindi questions
 * - Local storage only - no backend required
 * - Progress tracking and score reports
 */

// Screens
export { default as PDFGeneratorScreen } from './screens/PDFGeneratorScreen';
export { default as PDFMCQListScreen } from './screens/PDFMCQListScreen';
export { default as AIMCQGeneratorScreen } from './screens/AIMCQGeneratorScreen';
export { default as AIMCQListScreen } from './screens/AIMCQListScreen';

// Utilities
export * from './utils/pdfMCQStorage';

// Lightning MCQ Generator (explicit exports to avoid duplicate MCQ type)
export {
    pickPDFFile,
    processAndGenerateMCQs,
    quickProcessPDF,
    type ProcessingStatus,
    type ProcessingResult,
} from './utils/lightningMCQGenerator';
