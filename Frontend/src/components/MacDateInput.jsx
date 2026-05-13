import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCalendar, cilChevronLeft, cilChevronRight, cilX } from '@coreui/icons'

const weekdayLabels = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']

function parseDateValue(value, mode = 'date') {
  if (!value) return null
  const raw = String(value)
  const [datePart, timePart = '12:00'] = raw.split('T')
  const [year, month, day] = String(datePart).split('-').map(Number)
  if (!year || !month || !day) return null
  const [hours, minutes] =
    mode === 'datetime-local'
      ? String(timePart)
          .slice(0, 5)
          .split(':')
          .map(Number)
      : [12, 0]
  const date = new Date(year, month - 1, day, Number.isFinite(hours) ? hours : 12, Number.isFinite(minutes) ? minutes : 0, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0)
}

function addMonths(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1, 12, 0, 0, 0)
}

function formatDateValue(date, mode = 'date') {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  if (mode !== 'datetime-local') return `${year}-${month}-${day}`
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function formatDisplayValue(value, mode = 'date') {
  const date = parseDateValue(value, mode)
  if (!date) return ''
  return new Intl.DateTimeFormat('es-CL', mode === 'datetime-local'
    ? {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    : {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
      }).format(date)
}

function formatTimeValue(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatMonthLabel(date) {
  const label = new Intl.DateTimeFormat('es-CL', {
    month: 'long',
    year: 'numeric',
  }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function sameDay(left, right) {
  return (
    left &&
    right &&
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function buildCalendarDays(viewMonth) {
  const start = startOfMonth(viewMonth)
  const monthIndex = start.getMonth()
  const firstWeekday = (start.getDay() + 6) % 7
  const cursor = new Date(start)
  cursor.setDate(cursor.getDate() - firstWeekday)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(cursor)
    date.setDate(cursor.getDate() + index)
    return {
      key: formatDateValue(date),
      date,
      outside: date.getMonth() !== monthIndex,
    }
  })
}

const MacDateInput = ({
  value = '',
  onChange,
  disabled = false,
  placeholder,
  className = '',
  mode = 'date',
}) => {
  const resolvedPlaceholder = placeholder || (mode === 'datetime-local' ? 'Seleccionar fecha y hora' : 'Seleccionar fecha')
  const selectedDate = useMemo(() => parseDateValue(value, mode), [value, mode])
  const displayValue = useMemo(() => formatDisplayValue(value, mode), [value, mode])
  const [isOpen, setIsOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate || new Date()))
  const [timeValue, setTimeValue] = useState(() => formatTimeValue(selectedDate || new Date()))
  const rootRef = useRef(null)
  const timeInputId = useId()

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false)
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!selectedDate || isOpen) return
    setViewMonth(startOfMonth(selectedDate))
    if (mode === 'datetime-local') setTimeValue(formatTimeValue(selectedDate))
  }, [selectedDate, isOpen, mode])

  const days = useMemo(() => buildCalendarDays(viewMonth), [viewMonth])
  const today = useMemo(() => new Date(), [])

  const commitValue = (nextValue) => {
    onChange?.(nextValue)
  }

  const selectDate = (date) => {
    const nextDate = new Date(date)
    if (mode === 'datetime-local') {
      const [hours, minutes] = String(timeValue || '00:00')
        .split(':')
        .map((item) => Number(item || 0))
      nextDate.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0)
    }
    commitValue(formatDateValue(nextDate, mode))
    setViewMonth(startOfMonth(date))
    setIsOpen(false)
  }

  const clearDate = (event) => {
    event.preventDefault()
    event.stopPropagation()
    commitValue('')
    setIsOpen(false)
  }

  const openPicker = () => {
    if (disabled) return
    setViewMonth(startOfMonth(selectedDate || new Date()))
    if (mode === 'datetime-local') setTimeValue(formatTimeValue(selectedDate || new Date()))
    setIsOpen((current) => !current)
  }

  const applyTime = (nextTimeValue) => {
    setTimeValue(nextTimeValue)
    if (!selectedDate) return
    const [hours, minutes] = String(nextTimeValue || '00:00')
      .split(':')
      .map((item) => Number(item || 0))
    const nextDate = new Date(selectedDate)
    nextDate.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0)
    commitValue(formatDateValue(nextDate, mode))
  }

  return (
    <div
      ref={rootRef}
      className={`mac-date-input ${mode === 'datetime-local' ? 'is-datetime' : 'is-date'} ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${className}`.trim()}
    >
      <button
        type="button"
        className="mac-date-input-trigger"
        onClick={openPicker}
        disabled={disabled}
        aria-expanded={isOpen}
      >
        <span className={`mac-date-input-value ${displayValue ? '' : 'is-placeholder'}`}>
          {displayValue || resolvedPlaceholder}
        </span>
      </button>

      {value && !disabled && (
        <button type="button" className="mac-date-input-clear" onClick={clearDate} aria-label="Limpiar fecha">
          <CIcon icon={cilX} />
        </button>
      )}

      <button
        type="button"
        className="mac-date-input-open"
        onClick={openPicker}
        disabled={disabled}
        aria-label="Abrir calendario"
      >
        <CIcon icon={cilCalendar} />
      </button>

      {isOpen && (
        <div className={`mac-date-popover ${mode === 'datetime-local' ? 'is-datetime' : 'is-date'}`}>
          <div className="mac-date-popover-header">
            <CButton
              type="button"
              color="light"
              className="mac-date-nav"
              onClick={() => setViewMonth((current) => addMonths(current, -1))}
            >
              <CIcon icon={cilChevronLeft} />
            </CButton>
            <div className="mac-date-month-label">{formatMonthLabel(viewMonth)}</div>
            <CButton
              type="button"
              color="light"
              className="mac-date-nav"
              onClick={() => setViewMonth((current) => addMonths(current, 1))}
            >
              <CIcon icon={cilChevronRight} />
            </CButton>
          </div>

          <div className="mac-date-weekdays">
            {weekdayLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="mac-date-grid">
            {days.map((day) => (
              <button
                type="button"
                key={day.key}
                className={[
                  'mac-date-day',
                  day.outside ? 'is-outside' : '',
                  sameDay(day.date, today) ? 'is-today' : '',
                  sameDay(day.date, selectedDate) ? 'is-selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => selectDate(day.date)}
              >
                {day.date.getDate()}
              </button>
            ))}
          </div>

          {mode === 'datetime-local' && (
            <div className="mac-date-time-panel">
              <label className="mac-date-time-label" htmlFor={timeInputId}>
                Hora
              </label>
              <input
                id={timeInputId}
                className="mac-date-time-input"
                type="time"
                step="60"
                value={timeValue}
                onChange={(event) => applyTime(event.target.value)}
              />
            </div>
          )}

          <div className="mac-date-popover-footer">
            <button
              type="button"
              className="mac-date-action"
              onClick={() => selectDate(new Date())}
            >
              Hoy
            </button>
            <button type="button" className="mac-date-action" onClick={clearDate}>
              Limpiar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MacDateInput
