#!/usr/bin/env bash
# Prints the live version of every tool card as one JSON object, keyed by the cards' data-repo in index.html:
#   {"Coprimal/Histq": {"created": "2026-11-12T17:26:19Z", "version": "v0.3.0", "released": "2026-11-21T23:49:17Z"}, …}
# version and released come from the repo's latest release. A repo with no release gets "v" plus the
# version in its package.json and released null (version null too when that is missing).
# Any other GitHub API error stops the script, so a broken fetch fails the deploy instead of publishing empty data.
# The Pages workflow writes it to _site/tools.json. Local preview: bash scripts/tools-json.sh > tools.json
# Needs gh (signed in, or GH_TOKEN set) and jq.
set -euo pipefail
cd "$(dirname "$0")/.."

repos=$(grep -o 'data-repo="[^"]*"' index.html | cut -d'"' -f2 || true)
if [ -z "$repos" ]; then
  echo "tools-json: no data-repo in index.html" >&2
  exit 1
fi

err=$(mktemp)
trap 'rm -f "$err"' EXIT

# get <gh api args>: sets $body to the response; returns 1 on HTTP 404 and stops the script on any other error.
get() {
  if body=$(gh api "$@" 2>"$err"); then return 0; fi
  if grep -q 'HTTP 404' "$err"; then return 1; fi
  cat "$err" >&2
  exit 1
}

objs=''
for repo in $repos; do
  created=$(gh api "repos/$repo" --jq .created_at)
  released=null
  if get "repos/$repo/releases/latest"; then
    version=$(jq '.tag_name' <<<"$body")
    released=$(jq '.published_at' <<<"$body")
  elif get -H 'Accept: application/vnd.github.raw' "repos/$repo/contents/package.json"; then
    version=$(jq '.version // empty | "v\(.)"' <<<"$body")
  else
    version=''
  fi
  objs+=$(jq -n --arg repo "$repo" --arg created "$created" --argjson version "${version:-null}" --argjson released "$released" \
    '{($repo): {created: $created, version: $version, released: $released}}')
done
jq -s add <<<"$objs"
