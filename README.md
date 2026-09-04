# Road Safety Game — Australia

This repository contains a small educational road safety game tailored for Australian driving rules: left-hand driving, speeds in km/h, school zones, Give Way and Roundabout reminders.

How to use

- This repository is set up for GitHub Pages. To publish the game on GitHub Pages:
  1. Go to the repository Settings → Pages.
  2. Under "Source" select Branch: `main` and Folder: `/ (root)` then Save.
  3. The site will be available at `https://<your-username>.github.io/RoadSafteyGame/` (may take a minute).

- To run locally:
  - Use a simple static server (Python 3): `python -m http.server 8000` then open `http://localhost:8000/`.

Notes and suggestions

- I focused on an accessible, mobile-friendly canvas game. You can extend it by adding:
  - Sound effects for brakes, collisions, pedestrian alerts.
  - A tutorial level that explicitly shows Australian road signs and expected behaviour.
  - More accurate traffic simulation (traffic lights with red/amber/green timings, roundabout behaviour).
  - Artwork: SVG-based Australian sign images and car sprites in place of the simple shapes.

Privacy / Pages

- Your repository is currently private. GitHub Pages can publish content from private repos depending on your account plan; if you want the site publicly accessible, set the repository visibility to public in Settings → General → Change repository visibility.

