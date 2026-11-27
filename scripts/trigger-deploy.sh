#!/usr/bin/env bash
# Starts the Pages workflow of coprimal.dev now, so the tool cards pick up a release without waiting for the daily run.
#   bash scripts/trigger-deploy.sh
# Needs gh, signed in or with GH_TOKEN set to a token that may run workflows of Coprimal/coprimal.dev
# (fine-grained PAT with Actions: read and write on that repo). The tool repos' notify-site.yml does the same call
# with the org secret COPRIMAL_SITE_DEPLOY_TOKEN.
set -euo pipefail
gh workflow run pages.yml --repo Coprimal/coprimal.dev --ref main
echo "Started a deploy: https://github.com/Coprimal/coprimal.dev/actions/workflows/pages.yml"
