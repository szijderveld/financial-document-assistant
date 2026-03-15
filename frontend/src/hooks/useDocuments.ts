import { useState, useEffect, useMemo } from 'react';
import type { ConvFinQARecord, ExampleRecords, SampleDocument } from '../lib/types';

const DOCUMENT_META: { label: string; shortLabel: string; description: string }[] = [
  { label: 'JKHY Corp — Cash Flow Analysis', shortLabel: 'JK', description: 'Fiscal Year 2007–2009' },
  { label: 'Republic Services — Pro Forma', shortLabel: 'RS', description: 'Fiscal Year 2007–2008' },
  { label: 'UPS — Financial Overview', shortLabel: 'UP', description: 'Fiscal Year 2008–2009' },
  { label: 'UPS — Revenue Analysis', shortLabel: 'UP', description: 'Fiscal Year 2008–2009' },
  { label: 'Celanese Corp — Segment Data', shortLabel: 'CE', description: 'Fiscal Year 2008–2010' },
];

function mapRecordToSampleDocument(record: ConvFinQARecord, index: number): SampleDocument {
  const meta = DOCUMENT_META[index] ?? {
    label: `Document ${index + 1}`,
    shortLabel: `D${index + 1}`,
    description: '',
  };

  return {
    id: record.id,
    label: meta.label,
    shortLabel: meta.shortLabel,
    description: meta.description,
    record,
  };
}

export function useDocuments() {
  const [documents, setDocuments] = useState<SampleDocument[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/data/example_records.json')
      .then((res) => res.json())
      .then((data: ExampleRecords) => {
        const docs = data.examples.map(mapRecordToSampleDocument);
        setDocuments(docs);
      })
      .catch((err) => {
        console.error('Failed to load example records:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const selectedDocument = documents[selectedIndex] ?? null;

  const suggestions = useMemo(() => {
    if (!selectedDocument) return [];
    return selectedDocument.record.dialogue.conv_questions;
  }, [selectedDocument]);

  const selectDocument = (index: number) => {
    if (index >= 0 && index < documents.length) {
      setSelectedIndex(index);
    }
  };

  return {
    documents,
    selectedIndex,
    selectedDocument,
    suggestions,
    isLoading,
    selectDocument,
  };
}
