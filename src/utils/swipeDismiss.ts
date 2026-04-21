/**
 * Pure swipe-dismiss predicate (#254).
 *
 * Returns true when a downward pointer drag exceeds a distance threshold,
 * used by ArtifactSheet to close itself on a swipe-down gesture.
 *
 *   shouldDismissFromSwipe(startY, currentY)  // default threshold 60px
 *     where currentY > startY means dragging down
 */
export function shouldDismissFromSwipe(
  startY: number,
  currentY: number,
  thresholdPx: number = 60,
): boolean {
  return currentY - startY >= thresholdPx;
}
