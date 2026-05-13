import React, { useMemo } from 'react'
import { CDropdown, CDropdownItem, CDropdownMenu, CDropdownToggle, CFormCheck } from '@coreui/react'

const GridColumnPicker = ({
  storageKey,
  columns,
  value,
  onChange,
  title = 'Filtrar Columnas',
}) => {
  const filteredColumns = useMemo(() => columns.filter((c) => c.key !== 'actions'), [columns])

  const setColumnVisible = (key, checked) => {
    const next = { ...value, [key]: checked }
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      // ignore
    }
    onChange(next)
  }

  return (
    <CDropdown placement="bottom-end">
      <CDropdownToggle color="secondary" variant="outline">
        {title}
      </CDropdownToggle>
      <CDropdownMenu style={{ minWidth: 280, zIndex: 2000, maxHeight: 360, overflowY: 'auto' }}>
        {filteredColumns.map((c) => (
          <CDropdownItem as="div" key={c.key} className="py-2">
            <CFormCheck
              label={c.label}
              checked={!!value[c.key]}
              onChange={(e) => setColumnVisible(c.key, e.target.checked)}
            />
          </CDropdownItem>
        ))}
      </CDropdownMenu>
    </CDropdown>
  )
}

export default GridColumnPicker
