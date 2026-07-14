import MarkdownToJsx from 'markdown-to-jsx'

// Notes render through markdown-to-jsx: a small (~6KB gz), zero-dependency, battle-tested
// compiler that turns Markdown into a React element tree — no dangerouslySetInnerHTML, so
// untrusted note content can't inject markup. We harden it for multi-user text:
//   - disableParsingRawHTML: raw HTML tags in the source render as text, not elements.
//   - the built-in sanitizer (on by default) strips unsafe URL schemes (javascript:, etc.).
// Styling lives in the `.md` block in global.css so list markers / code / quotes survive
// Tailwind's preflight reset. Links open in a new tab.
export function Markdown({ source, className = '' }: { source: string; className?: string }) {
  return (
    <MarkdownToJsx
      className={`md ${className}`}
      options={{
        forceBlock: true,
        disableParsingRawHTML: true,
        overrides: {
          a: { props: { target: '_blank', rel: 'noreferrer noopener' } },
        },
      }}
    >
      {source}
    </MarkdownToJsx>
  )
}
