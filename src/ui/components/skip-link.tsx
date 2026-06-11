/**
 * Skip-to-content link for keyboard navigation.
 * Hidden until focused, then slides into view.
 * Styled in app.css via .skip-link class.
 */
export function SkipLink() {
  return (
    <a href="#main-content" className="skip-link">
      Skip to main content
    </a>
  );
}
