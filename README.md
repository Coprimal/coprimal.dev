# coprimal.dev
The source code of coprimal.dev.

## Tool versions

The version and the New/Updated tag on each tool card come from GitHub at deploy time. `scripts/tools-json.sh` writes `tools.json` from the latest release of each card's `data-repo`, and falls back to the version in the repo's package.json if it has no release. `main.js` shows "New" if the repo was created in the last 14 days, else "Updated" if its latest release is in the last 14 days.

The Pages workflow runs on push, once a day (03:17 UTC), and whenever a tool publishes a release. GitHub turns scheduled workflows off after 60 days without repo activity; re-enable it in the Actions tab.

### Deploy on release

Each tool repo has `.github/workflows/notify-site.yml`: when a release is published (not a prerelease), it starts this site's Pages workflow with `gh workflow run`. Repos whose release is created in Actions with `GITHUB_TOKEN` also list that workflow under `workflow_run`, since such a release starts no other workflow.

It uses the org secret `COPRIMAL_SITE_DEPLOY_TOKEN`: a fine-grained PAT, resource owner Coprimal, repository access only `Coprimal/coprimal.dev`, permission Actions: read and write. When it expires, create a new one and run `gh secret set COPRIMAL_SITE_DEPLOY_TOKEN --org Coprimal --visibility all` (it prompts for the value).

Start a deploy by hand (or from any hook or script): `bash scripts/trigger-deploy.sh`.

Local preview (needs `gh` signed in and `jq`):

```sh
bash scripts/tools-json.sh > tools.json && python3 -m http.server 8765
```

Then open http://localhost:8765.
