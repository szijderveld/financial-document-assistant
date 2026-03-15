import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ConvFinQARecord, ExampleRecords, FinancialDocument, SampleDocument } from '../lib/types';

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

  const addDocument = useCallback((doc: FinancialDocument) => {
    const customIndex = documents.filter((d) => d.id.startsWith('custom-')).length + 1;
    const newDoc: SampleDocument = {
      id: `custom-${Date.now()}`,
      label: `Custom Document ${customIndex}`,
      shortLabel: `C${customIndex}`,
      description: 'User-uploaded document',
      record: {
        id: `custom-${Date.now()}`,
        doc,
        dialogue: { conv_questions: [], conv_answers: [], turn_program: [], executed_answers: [], qa_split: [] },
        features: { num_dialogue_turns: 0, has_type2_question: false, has_duplicate_columns: false, has_non_numeric_values: false },
      },
    };
    setDocuments((prev) => [...prev, newDoc]);
    setSelectedIndex(documents.length); // select the newly added doc
  }, [documents.length]);

  return {
    documents,
    selectedIndex,
    selectedDocument,
    suggestions,
    isLoading,
    selectDocument,
    addDocument,
  };
}
