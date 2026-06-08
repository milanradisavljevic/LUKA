import { useDocuments } from '../hooks/useDocuments';
import { ViewShell } from './_ViewShell';
import { DocumentList } from './_DocumentList';

export function TrashView() {
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
      <DocumentList
        documents={deleted}
        emptyMessage="Der Papierkorb ist leer."
        onRestore={restore}
        onPurge={handlePurge}
      />
    </ViewShell>
  );
}
