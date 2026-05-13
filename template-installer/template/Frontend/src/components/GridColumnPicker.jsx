import React, { useMemo } from 'react'
import { CDropdown, CDropdownItem, CDropdownMenu, CDropdownToggle, CFormCheck } from '@coreui/react'

const GridColumnPicker = ({ storageKey, columns, value, onChange, title = 'Filtrar Columnas' }) => {
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
      <CDropdownToggle color="secondary" variant="outline" className="grid-column-picker-toggle">
        {title}
      </CDropdownToggle>
      <CDropdownMenu className="grid-column-picker-menu">
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
