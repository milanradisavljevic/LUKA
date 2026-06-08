import type { SavedDocument } from '../lib/types';
import { useDocuments } from '../hooks/useDocuments';
import { ViewShell } from './_ViewShell';
import { DocumentList } from './_DocumentList';

interface Props {
  onOpenDocument: (doc: SavedDocument) => void;
}

export function DocumentsView({ onOpenDocument }: Props) {
  const { documents, toggleFavorite, softDelete } = useDocuments();

  const active = documents
    .filter((d) => !d.isDeleted)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <ViewShell
      title="Meine Unterlagen"
      description="Gespeicherte Dokumente. Öffnen lädt den vollständigen Stand zurück in den Assistenten."
    >
      <DocumentList
        documents={active}
        emptyMessage="Noch keine Dokumente gespeichert. Erstelle eines im Assistenten und klicke oben auf „Speichern“."
        onOpen={onOpenDocument}
        onToggleFavorite={toggleFavorite}
        onDelete={softDelete}
      />
    </ViewShell>
  );
}
