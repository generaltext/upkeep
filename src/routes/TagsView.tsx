import { Link, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { allTags, entitiesWithTag } from '../lib/reducer'
import { KINDS } from '../lib/model'
import { EmptyState, PageHeader } from '../components/common'
import { TagChip } from '../components/TagEditor'
import { Icon } from '../components/Icon'

export function TagsView() {
  const { label } = useParams<{ label: string }>()
  const { state, version } = useStore()
  void version

  if (label) {
    const tagged = entitiesWithTag(state, label)
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <PageHeader
          title={<TagChip label={label} />}
          icon="Tag"
          subtitle={`${tagged.length} item${tagged.length === 1 ? '' : 's'}`}
        />
        {tagged.length === 0 ? (
          <EmptyState icon="Tag" title="Nothing here" hint="No active records carry this tag." />
        ) : (
          <div className="rowlist">
            {tagged.map((e) => (
              <Link key={e.id} to={`/e/${e.id}`} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-[var(--hover)]" style={{ color: 'var(--fg)' }}>
                <Icon name={KINDS[e.kind].icon as never} size={15} style={{ color: 'var(--muted)' }} />
                <span className="flex-1 truncate font-medium">{String(e.fields.name ?? 'Untitled')}</span>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  {KINDS[e.kind].singular}
                </span>
                <Icon name="ChevronRight" size={15} style={{ color: 'var(--muted)' }} />
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  const tags = allTags(state)
  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <PageHeader title="Tags" icon="Tag" subtitle={`${tags.length} tag${tags.length === 1 ? '' : 's'}`} />
      {tags.length === 0 ? (
        <EmptyState icon="Tag" title="No tags yet" hint="Tag properties, systems, and contacts to group them — by room, by season, by vehicle." />
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <Link key={t.label} to={`/tags/${encodeURIComponent(t.label)}`}>
              <span className="inline-flex items-center gap-1.5">
                <TagChip label={t.label} />
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  {t.count}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
