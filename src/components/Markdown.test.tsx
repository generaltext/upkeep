import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Markdown } from './Markdown'

const html = (src: string) => renderToStaticMarkup(<Markdown source={src} />)

describe('Markdown (markdown-to-jsx)', () => {
  it('renders inline emphasis and code', () => {
    const out = html('A **bold** and *italic* and `code` word.')
    expect(out).toContain('<strong>bold</strong>')
    expect(out).toContain('<em>italic</em>')
    expect(out).toContain('<code>code</code>')
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
    expect((out.match(/<ul/g) ?? []).length).toBe(2) // inner <ul> nested in the item
  })

  it('renders GFM task lists as checkboxes', () => {
    const out = html('- [ ] todo\n- [x] done')
    expect((out.match(/type="checkbox"/g) ?? []).length).toBe(2)
    expect(out).toContain('checked') // the [x] item
  })

  it('renders headings, blockquotes, and fenced code', () => {
    expect(html('# Title')).toContain('<h1')
    expect(html('> quoted')).toContain('<blockquote')
    expect(html('```\ncode block\n```')).toContain('<pre')
  })

  it('links safe URLs (new tab) but strips javascript: schemes', () => {
    const safe = html('see [docs](https://example.com/x)')
    expect(safe).toContain('href="https://example.com/x"')
    expect(safe).toContain('rel="noreferrer noopener"')

    const danger = html('[click](javascript:alert(1))')
    expect(danger).not.toContain('javascript') // sanitizer dropped the unsafe href
    expect(danger).toContain('click') // label still shown
  })

  it('never emits raw HTML from the source (injection-safe)', () => {
    const out = html('hello <img src=x onerror=alert(1)> <b>world</b>')
    // Raw HTML in the source is rendered as inert, escaped text — never live elements.
    expect(out).not.toContain('<img')
    expect(out).not.toContain('<b>world</b>')
    expect(out).toContain('&lt;img')
  })
})
