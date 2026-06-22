import type { SavedDocument, ActiveView } from '../lib/types';
import { useDocuments } from '../hooks/useDocuments';
import { ViewShell } from './_ViewShell';
import { DocumentList } from './_DocumentList';

interface Props {
  onOpenDocument: (doc: SavedDocument) => void;
  onNavigate?: (view: ActiveView) => void;
}

export function FavoritesView({ onOpenDocument, onNavigate }: Props) {
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
        emptyMessage="Noch keine Favoriten."
        emptyDescription="Markiere Dokumente in „Meine Unterlagen“ mit dem Stern, um sie hier zu sammeln."
        actionLabel="Zu Meine Unterlagen"
        onAction={() => onNavigate?.('documents')}
        onOpen={onOpenDocument}
        onToggleFavorite={toggleFavorite}
        onDelete={softDelete}
      />
    </ViewShell>
  );
}
