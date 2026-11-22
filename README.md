# coprimal.dev
The source code of coprimal.dev.

## Tool versions

The version and the New/Updated tag on each tool card come from GitHub at deploy time. `scripts/tools-json.sh` writes `tools.json` from the latest release of each card's `data-repo`, and falls back to the version in the repo's package.json if it has no release. `main.js` shows "New" if the repo was created in the last 14 days, else "Updated" if its latest release is in the last 14 days.

The Pages workflow runs on push and every hour. GitHub turns scheduled workflows off after 60 days without repo activity; re-enable it in the Actions tab.

Local preview (needs `gh` signed in and `jq`):

```sh
bash scripts/tools-json.sh > tools.json && python3 -m http.server 8765
```

Then open http://localhost:8765.
