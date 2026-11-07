import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Reine Leseansicht; der gespeicherte Quelltext wird niemals umgewandelt. */
export function RubricMarkdown({ source }: { source: string }) {
  return <div className="rubric-markdown" aria-label="Formatierte Rasteransicht">
    <Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
      img: ({ alt }) => <span>{alt ? `[Bild: ${alt}]` : '[Bild]'}</span>,
      a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
      table: ({ children }) => <div className="rubric-table-scroll" tabIndex={0} role="region" aria-label="Rastertabelle"><table>{children}</table></div>,
    }}>{source}</Markdown>
  </div>;
}
