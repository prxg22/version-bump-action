# version-bump-action

This action bumps `package.json` version and push it on the head branch

## Inputs

### github-token

_required_

github token with access to merge in head-branch

### base-branch

_default: master_

branch in which bumped branch will be merged in the future

### head-branch

_default: develop_

branch in which package.json will be bumped and pushed

### initial-version

_default: 0.0.0_

initial version used if base-branch doesn't have package.json

## Example usage

```yml
uses: prxg22/version-bump-action@master
with:
  head-branch: release
  initial-version: 1.0.0
  github-token: ${{secrets.GITHUB_TOKEN}}
```
