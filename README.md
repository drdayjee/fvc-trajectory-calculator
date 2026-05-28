# Early FVC Trajectory Probability Calculator

Single-page static web calculator that reproduces the validated Excel model for
early FVC trajectory group probabilities.

## What it does

Given:
- Baseline FVC (% predicted)
- Follow-up FVC (% predicted)
- Interval (3 or 6 months)

It computes:
- ΔFVC
- Probabilities of Trajectory 1–4 (numerically stable softmax)
- Predicted trajectory group
- Confidence label

## Files

| File         | Purpose                       |
|--------------|-------------------------------|
| `index.html` | Page structure                |
| `styles.css` | Styling, responsive layout    |
| `script.js`  | Calculation + validation      |
| `README.md`  | This document                 |

## Run locally

Open `index.html` directly in any modern browser. No build step, no server, no
dependencies.

## Deploy free

- GitHub Pages: upload these four files to a public repo, enable Pages on the
  `main` branch root. See the project documentation for a step-by-step guide.
- Cloudflare Pages: connect the repo or drag-drop the folder.

## Disclaimer

For informational and research use only. Not a clinical decision aid. Does not
replace clinical judgment.
