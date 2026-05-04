export const runOnEnter = (callback) => (event) => {
  if (event.key !== 'Enter') return
  event.preventDefault()
  callback()
}
