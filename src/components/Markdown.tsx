import MarkdownToJsx from 'markdown-to-jsx'

// Notes render through markdown-to-jsx: a small, zero-dependency, battle-tested compiler
// that turns Markdown into a React element tree — no dangerouslySetInnerHTML, so untrusted
// note content can't inject markup. Hardened for multi-user text:
//   - disableParsingRawHTML: raw HTML tags in the source render as text, not elements.
//   - the built-in sanitizer (on by default) strips unsafe URL schemes (javascript:, etc.).
// We wrap the output in our own `.md` div rather than passing className to the component:
// with forceBlock the library does NOT forward className to its root, so the scoped styles
// in the `.md` block of global.css (list markers, code, headings — all reset by Tailwind's
// preflight) would never match. Styling lives there; links open in a new tab.
const OPTIONS = {
  forceBlock: true,
  disableParsingRawHTML: true,
  overrides: {
    a: { props: { target: '_blank', rel: 'noreferrer noopener' } },
  },
}

export function Markdown({ source, className = '' }: { source: string; className?: string }) {
  return (
    <div className={`md ${className}`}>
      <MarkdownToJsx options={OPTIONS}>{source}</MarkdownToJsx>
    </div>
  )
}
