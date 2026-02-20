import { externalLinks } from "../config";

/**
 * Footer component with project and privacy policy links.
 * Displays small centered text at the bottom of the page.
 */
export function Footer() {
  return (
    <footer className="bg-blue-50 py-4 text-center text-xs text-base-content/60">
      <a
        href={externalLinks.projectPageUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="link link-hover"
      >
        ExtremeXP Project
      </a>
      <span className="mx-2">•</span>
      <a
        href={externalLinks.privacyPolicyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="link link-hover"
      >
        Privacy Policy
      </a>
    </footer>
  );
}
