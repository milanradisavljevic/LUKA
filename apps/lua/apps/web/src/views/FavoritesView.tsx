import type { SavedDocument } from '../lib/types';
import { useDocuments } from '../hooks/useDocuments';
import { ViewShell } from './_ViewShell';
import { DocumentList } from './_DocumentList';

interface Props {
  onOpenDocument: (doc: SavedDocument) => void;
}

export function FavoritesView({ onOpenDocument }: Props) {
  const { documents, toggleFavorite, softDelete } = useDocuments();

  const favorites = documents
    .filter((d) => d.isFavorite && !d.isDeleted)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <ViewShell
      title="Favoriten"
      description="Als Favorit markierte Dokumente für den schnellen Zugriff."
    >
      <DocumentList
        documents={favorites}
        emptyMessage="Noch keine Favoriten. Markiere Dokumente in „Meine Unterlagen“ mit dem Stern."
        onOpen={onOpenDocument}
        onToggleFavorite={toggleFavorite}
        onDelete={softDelete}
      />
    </ViewShell>
  );
}
