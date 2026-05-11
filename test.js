const rect = { left: 0, top: 0, right: 0, bottom: 0 }
const bubbleWidth = 46, bubbleHeight = 46, DRAG_MARGIN = 12
const left = rect.left + DRAG_MARGIN
const top = rect.top + DRAG_MARGIN
const right = Math.max(left, rect.right - bubbleWidth - DRAG_MARGIN)
const bottom = Math.max(top, rect.bottom - bubbleHeight - DRAG_MARGIN)
console.log({left, top, right, bottom})
