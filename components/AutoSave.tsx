'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { saveDocument } from '@/lib/docService';

interface AutoSaveProps {
  userId: string | undefined;
  docId: string | null;
  content: string;
  title: string;
  onStatusChange: (status: 'Saving...' | 'Saved') => void;
}

const AutoSave = ({ userId, docId, content, title, onStatusChange }: AutoSaveProps) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContent = useRef(content);
  const lastSavedTitle = useRef(title);

  const performSave = useCallback(async () => {
    if (!userId || !docId) return;
    
    try {
      await saveDocument(db, userId, docId, { content, title });
      onStatusChange('Saved');
      lastSavedContent.current = content;
      lastSavedTitle.current = title;
    } catch (error) {
      console.error('AutoSave failed:', error);
      // We don't change status to 'Saved' if it fails
    }
  }, [userId, docId, content, title, onStatusChange]);

  useEffect(() => {
    // Only trigger if content or title actually changed from last saved state
    if (content === lastSavedContent.current && title === lastSavedTitle.current) {
      return;
    }

    if (!userId || !docId) return;

    onStatusChange('Saving...');

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [content, title, userId, docId, onStatusChange, performSave]);

  return null; // This is a logic-only component
};

export default AutoSave;
