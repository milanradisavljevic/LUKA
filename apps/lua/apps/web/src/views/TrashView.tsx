import { Trash2 } from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments';
import { ViewShell } from './_ViewShell';
import { DocumentList } from './_DocumentList';
import { EmptyState } from './_EmptyState';

interface Props {
  onCreateNew?: () => void;
}

export function TrashView({ onCreateNew }: Props) {
  const { documents, restore, purge, purgeAllDeleted } = useDocuments();

  const deleted = documents
    .filter((d) => d.isDeleted)
    .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''));

  const handlePurge = (id: string) => {
    if (window.confirm('Dieses Dokument endgültig löschen? Das kann nicht rückgängig gemacht werden.')) {
      purge(id);
    }
  };

  const handlePurgeAll = () => {
    if (window.confirm(`Alle ${deleted.length} Dokumente im Papierkorb endgültig löschen?`)) {
      purgeAllDeleted();
    }
  };

  return (
    <ViewShell
      title="Papierkorb"
      description="Gelöschte Dokumente. Wiederherstellen bringt sie zurück; endgültiges Löschen ist permanent."
      action={
        deleted.length > 0 ? (
          <button className="btn-danger" onClick={handlePurgeAll} style={{ fontSize: '0.8125rem' }}>
            Papierkorb leeren
          </button>
        ) : undefined
      }
    >
      {deleted.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="Papierkorb ist leer"
          description="Gelöschte Dokumente erscheinen hier und können wiederhergestellt oder endgültig entfernt werden."
          actionLabel={onCreateNew ? 'Neue Übung erstellen' : undefined}
          onAction={onCreateNew}
        />
      ) : (
        <DocumentList
          documents={deleted}
          onRestore={restore}
          onPurge={handlePurge}
        />
      )}
    </ViewShell>
  );
}
