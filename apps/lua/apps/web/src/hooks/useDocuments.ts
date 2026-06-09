import { useCallback, useState } from 'react';
import type { SavedDocument } from '../lib/types';
import { loadDocuments, saveDocuments } from '../lib/storage';

export function useDocuments() {
  const [documents, setDocuments] = useState<SavedDocument[]>(() => loadDocuments());

  const reload = useCallback(() => setDocuments(loadDocuments()), []);

  const persist = useCallback((next: SavedDocument[]) => {
    saveDocuments(next);
    setDocuments(next);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    persist(
      loadDocuments().map((d) =>
        d.id === id ? { ...d, isFavorite: !d.isFavorite, updatedAt: new Date().toISOString() } : d,
      ),
    );
  }, [persist]);

  const softDelete = useCallback((id: string) => {
    const now = new Date().toISOString();
    persist(
      loadDocuments().map((d) =>
        d.id === id ? { ...d, isDeleted: true, deletedAt: now } : d,
      ),
    );
  }, [persist]);

  const restore = useCallback((id: string) => {
    persist(
      loadDocuments().map((d) =>
        d.id === id ? { ...d, isDeleted: false, deletedAt: null } : d,
      ),
    );
  }, [persist]);

  const purge = useCallback((id: string) => {
    persist(loadDocuments().filter((d) => d.id !== id));
  }, [persist]);

  const purgeAllDeleted = useCallback(() => {
    persist(loadDocuments().filter((d) => !d.isDeleted));
  }, [persist]);

  return { documents, reload, toggleFavorite, softDelete, restore, purge, purgeAllDeleted };
}