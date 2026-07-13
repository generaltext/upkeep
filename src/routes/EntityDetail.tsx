import { useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { EmptyState } from '../components/common'
import { PropertyDetail } from './PropertyDetail'
import { AssetDetail } from './AssetDetail'
import { VendorDetail } from './VendorDetail'

export function EntityDetail() {
  const { id } = useParams<{ id: string }>()
  const { state, version } = useStore()
  void version

  const entity = id ? state.entities[id] : undefined
  if (!entity) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <EmptyState icon="Package" title="Not found" hint="This record may have been removed." />
      </div>
    )
  }

  if (entity.kind === 'property') return <PropertyDetail entity={entity} />
  if (entity.kind === 'asset') return <AssetDetail entity={entity} />
  return <VendorDetail entity={entity} />
}
