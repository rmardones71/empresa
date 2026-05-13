function isElementVisible(el) {
  if (!el) return false
  if (el.disabled) return false
  if (el.getAttribute('aria-hidden') === 'true') return false
  const type = (el.getAttribute('type') || '').toLowerCase()
  if (type === 'hidden') return false
  const style = window.getComputedStyle ? window.getComputedStyle(el) : null
  if (style && (style.visibility === 'hidden' || style.display === 'none')) return false
  // In modals (position: fixed), offsetParent can be null even when visible.
  // getClientRects is a better signal for rendered/visible elements.
  if (typeof el.getClientRects === 'function' && el.getClientRects().length === 0) return false
  return true
}

function getFocusableFields(container) {
  if (!container) return []
  const nodes = Array.from(container.querySelectorAll('input, select, textarea, [tabindex]'))
  return nodes
    .filter((el) => {
      if (!isElementVisible(el)) return false
      const tabIndexAttr = el.getAttribute('tabindex')
      if (tabIndexAttr === '-1') return false
      const tag = (el.tagName || '').toLowerCase()
      if (tag === 'input') {
        const type = (el.getAttribute('type') || '').toLowerCase()
        if (type === 'file') return false
      }
      if (!['input', 'select', 'textarea'].includes(tag) && !el.hasAttribute('tabindex')) return false
      return true
    })
}

export function focusFirstField(container) {
  const fields = getFocusableFields(container)
  const first = fields[0]
  if (!first) return false
  try {
    first.focus()
    if (first.tagName === 'INPUT') first.select?.()
    return document.activeElement === first
  } catch {
    return false
  }
}

export function scheduleFocusFirstField(containerOrGetter, { attempts = 30, intervalMs = 50 } = {}) {
  let cancelled = false
  let remaining = Math.max(1, Number(attempts) || 1)
  let firstEl = null

  const resolveContainer = () =>
    typeof containerOrGetter === 'function' ? containerOrGetter() : containerOrGetter

  const tick = () => {
    if (cancelled) return
    const container = resolveContainer()
    if (container) {
      // If user already moved focus inside the container, don't steal it back.
      const active = document.activeElement
      if (active && container.contains(active) && active !== firstEl) return

      const fields = getFocusableFields(container)
      firstEl = fields[0] || firstEl
      if (firstEl) {
        try {
          firstEl.focus()
          if (firstEl.tagName === 'INPUT') firstEl.select?.()
        } catch {
          // ignore
        }
      }
    }

    remaining -= 1
    if (remaining <= 0) return
    window.setTimeout(tick, intervalMs)
  }

  window.setTimeout(tick, 0)
  return () => {
    cancelled = true
  }
}

export function focusNextField(container, current) {
  const fields = getFocusableFields(container)
  if (!fields.length) return false
  const idx = fields.findIndex((el) => el === current)
  if (idx < 0) return false
  const next = fields[idx + 1]
  if (!next) return false
  try {
    next.focus()
    if (next.tagName === 'INPUT') next.select?.()
    return document.activeElement === next
  } catch {
    return false
  }
}

export function handleEnterToNextField(event, container) {
  if (!event || event.key !== 'Enter') return
  if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return

  const target = event.target
  if (!target) return
  const tag = (target.tagName || '').toLowerCase()
  if (tag === 'textarea') return

  // Evita submit por Enter y avanza al siguiente campo.
  event.preventDefault()
  focusNextField(container, target)
}
