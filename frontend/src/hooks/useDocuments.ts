import { useState, useEffect, useCallback } from 'react';
import type { SampleDocument, ExtractedDocument, ExtractedSection, DocumentInfo } from '../lib/types';
import { fetchDocuments, fetchDocument } from '../lib/api';

export function useDocuments() {
  const [documents, setDocuments] = useState<SampleDocument[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedSection, setSelectedSection] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch document list from API on mount
  useEffect(() => {
    fetchDocuments()
      .then((items: DocumentInfo[]) => {
        const docs: SampleDocument[] = items.map((item) => ({
          id: item.id,
          label: item.label || item.filename.replace(/\.pdf$/i, ''),
          shortLabel: item.shortLabel || item.filename.slice(0, 2).toUpperCase(),
          description: item.description || `${item.page_count} pages · ${item.section_count} sections`,
          sectionCount: item.section_count,
          pageCount: item.page_count,
        }));
        setDocuments(docs);
      })
      .catch((err) => {
        console.error('Failed to load documents:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Fetch extracted data when selected document changes
  useEffect(() => {
    const doc = documents[selectedIndex];
    if (!doc) {
      setExtractedData(null);
      return;
    }

    setExtractedData(null);
    fetchDocument(doc.id)
      .then((data) => {
        setExtractedData(data);
      })
      .catch((err) => {
        console.error('Failed to fetch document data:', err);
      });
  }, [documents, selectedIndex]);

  const selectedDocument = documents[selectedIndex] ?? null;

  const sections: ExtractedSection[] = extractedData?.sections ?? [];

  const selectDocument = (index: number) => {
    if (index >= 0 && index < documents.length) {
      setSelectedIndex(index);
      setSelectedSection(0);
    }
  };

  const selectSection = (index: number) => {
    if (extractedData && index >= 0 && index < extractedData.sections.length) {
      setSelectedSection(index);
    }
  };

  const addUploadedDocument = useCallback((doc: DocumentInfo) => {
    const newDoc: SampleDocument = {
      id: doc.id,
      label: doc.label || doc.filename.replace(/\.pdf$/i, ''),
      shortLabel: doc.shortLabel || doc.filename.slice(0, 2).toUpperCase(),
      description: doc.description || `${doc.page_count} pages · ${doc.section_count} sections`,
      sectionCount: doc.section_count,
      pageCount: doc.page_count,
    };
    setDocuments((prev) => [...prev, newDoc]);
    setSelectedIndex(documents.length);
    setSelectedSection(0);
  }, [documents.length]);

  return {
    documents,
    selectedIndex,
    selectedDocument,
    selectedSection,
    sections,
    extractedData,
    isLoading,
    selectDocument,
    selectSection,
    addUploadedDocument,
  };
}
