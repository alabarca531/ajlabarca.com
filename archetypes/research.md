---
title: "{{ replace .File.ContentBaseName "-" " " | title }}"
# Short name for menus and the project list
short: ""
# current or past. Current projects also show on the home page.
status: current
when: "{{ now.Year }} – present"
# Optional: collaborator or sponsor, shown as "In collaboration with ..."
partner: ""
tags: []
# One or two sentences for the project cards
summary: ""
# Lower numbers sort first
weight: 50
# Set to false (or delete this line) when it's ready to publish
draft: true
---

Write the project here in Markdown. Headings (##), lists, **bold**, links, and images all work.

To attach papers, set `project: {{ .File.ContentBaseName }}` on them in data/publications.yaml.
