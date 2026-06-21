# Changelog

All notable changes to Carbon Compass are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- Coverage thresholds enforced in CI via `@vitest/coverage-v8` (statements: 85%, branches: 80%, functions: 85%, lines: 85%)
- ESLint upgraded to `strictTypeChecked` with SonarJS cognitive-complexity gate (max 15) and jsx-a11y accessibility lint
- Import ordering enforced via `eslint-plugin-import`
- E2E Playwright tests added to GitHub Actions CI pipeline
- ai-core package now has enforced coverage thresholds (90% statements/functions/lines, 85% branches)

### Changed
- `npm test` now runs with coverage by default
- `eslint.config.js` extended with stricter TypeScript and accessibility rules

## [1.0.0] – 2026-06-01

### Added
- Initial production release
- Four-category footprint calculator: transport, electricity, diet, flights
- Deterministic recommendation ranking engine with weighted scoring
- Swap simulator for modelling behaviour changes
- Progress history snapshots via localStorage
- Optional Google Gemini AI coach via secure Render backend proxy
- Google Maps action deep-links (no API key required)
- 396 automated tests across frontend, ai-core, server, and functions
- Playwright E2E suite with automated Axe accessibility audits
- Firebase Functions reference wrapper for optional GCP deployment
- Full CI pipeline on GitHub Actions (4 independent quality jobs)
- Zod schema validation at every external data boundary
- Automated build-time secret scanner to prevent API key leaks
