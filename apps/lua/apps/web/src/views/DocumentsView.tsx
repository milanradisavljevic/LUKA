import type { SavedDocument, ActiveView } from '../lib/types';
import { useDocuments } from '../hooks/useDocuments';
import { ViewShell } from './_ViewShell';
import { DocumentList } from './_DocumentList';

interface Props {
  onOpenDocument: (doc: SavedDocument) => void;
  onNavigate?: (view: ActiveView) => void;
}

export function DocumentsView({ onOpenDocument, onNavigate }: Props) {
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
        emptyMessage="Noch keine Dokumente gespeichert."
        emptyDescription="Erstelle eine neue Unterlage im Assistenten und speichere sie oben mit „Speichern“."
        actionLabel="Neue Unterlage erstellen"
        onAction={() => onNavigate?.('wizard')}
        onOpen={onOpenDocument}
        onToggleFavorite={toggleFavorite}
        onDelete={softDelete}
      />
    </ViewShell>
  );
}
