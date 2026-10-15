# ajlabarca.com

Professional site for Anthony (AJ) La Barca. Plain Hugo with no theme; deployed to GitHub Pages by `.github/workflows/hugo.yaml` on push to `main`.

```bash
hugo server        # preview at http://localhost:1313
hugo --minify      # build to public/
```

## Where things live

| To change…                             | Edit                                  |
| -------------------------------------- | ------------------------------------- |
| Email, Scholar, ORCID, GitHub, LinkedIn | `hugo.toml` → `[params]` (empty hides) |
| Home page bio                          | `content/_index.md`                   |
| News items                             | `data/news.yaml`                      |
| Publications (home, /publications, CV) | `data/publications.yaml`              |
| Research projects (home cards, /research) | one Markdown file per project in `content/research/` (see below) |
| CV                                     | `data/cv.yaml`                        |
| CV PDF download button                 | drop the file at `static/files/Anthony_LaBarca_CV.pdf` |
| Home page headshot                     | `assets/images/headshot.*` (keep only one) |
| Lecturing photo on CV (optional)       | `assets/images/lecturing.*`           |
| Styles                                 | `assets/css/main.css`                 |
| Hero particle-filter animation         | `assets/js/particle-filter.js`        |

Images in `assets/images/` are resized and converted to WebP at build time, so full-resolution originals are fine there.

## Adding research / current work

Each project is one file in `content/research/`. To start a new one:

```bash
hugo new content research/my-project.md
```

That creates a draft from `archetypes/research.md`. Fill in the front matter (`status: current` or `past`,
`when`, `partner`, `tags`, a one-line `summary`), write the body in Markdown, then delete `draft: true` to publish.
Preview drafts locally with `hugo server -D`. Current projects appear on the home page automatically.
`content/research/resilient-ai.md` (Draper) is a draft waiting for a write-up.
