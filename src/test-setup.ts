import '@testing-library/jest-dom/vitest';

// jsdom does not implement scrollTo — mock it to suppress
// "Not implemented: Window's scrollTo() method" warnings.
window.scrollTo = (() => {}) as typeof window.scrollTo;

// jsdom does not implement HTMLDialogElement.showModal / .close.
// Mock them so components using <dialog> can render in tests.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal =
    HTMLDialogElement.prototype.showModal ||
    function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
  HTMLDialogElement.prototype.close =
    HTMLDialogElement.prototype.close ||
    function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
}
