import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Markdown } from './Markdown'

const html = (src: string) => renderToStaticMarkup(<Markdown source={src} />)

describe('Markdown', () => {
  it('renders inline emphasis and code', () => {
    const out = html('A **bold** and *italic* and `code` word.')
    expect(out).toContain('<strong>bold</strong>')
    expect(out).toContain('<em>italic</em>')
    expect(out).toContain('<code')
    expect(out).toContain('code</code>')
  })

  it('renders bullet and numbered lists', () => {
    const ul = html('- one\n- two\n- three')
    expect(ul).toContain('<ul')
    expect((ul.match(/<li/g) ?? []).length).toBe(3)
    const ol = html('1. first\n2. second')
    expect(ol).toContain('<ol')
    expect((ol.match(/<li/g) ?? []).length).toBe(2)
  })

  it('renders nested lists', () => {
    const out = html('- parent\n  - child a\n  - child b')
    // an inner <ul> nested inside a <li>
    expect((out.match(/<ul/g) ?? []).length).toBe(2)
  })

  it('renders task lists as checkboxes', () => {
    const out = html('- [ ] todo\n- [x] done')
    expect(out).toContain('type="checkbox"')
    expect(out).toContain('checked')
    // the "done" item is checked, the "todo" is not
    expect((out.match(/type="checkbox"/g) ?? []).length).toBe(2)
  })

  it('renders headings, blockquotes, and fenced code', () => {
    expect(html('# Title')).toContain('<h3')
    expect(html('> quoted')).toContain('<blockquote')
    expect(html('```\ncode block\n```')).toContain('<pre')
  })

  it('links safe URLs but never javascript: schemes', () => {
    const safe = html('see [docs](https://example.com/x)')
    expect(safe).toContain('href="https://example.com/x"')
    expect(safe).toContain('rel="noreferrer noopener"')

    const danger = html('[click](javascript:alert(1))')
    expect(danger).not.toContain('href="javascript')
    expect(danger).not.toContain('<a ')
    expect(danger).toContain('click') // label still shown, just not linked
  })

  it('never emits raw HTML from the source (injection-safe)', () => {
    const out = html('hello <img src=x onerror=alert(1)> world')
    expect(out).not.toContain('<img')
    expect(out).toContain('&lt;img') // rendered as text, escaped
  })

  it('treats single newlines inside a paragraph as line breaks', () => {
    const out = html('line one\nline two')
    expect(out).toContain('<br')
  })
})
