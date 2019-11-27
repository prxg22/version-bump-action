# version-bump-action
This action bumps `package.json` version and push it on the head branch

## Inputs

### base-branch
  **required** *default: master*

  branch in which bumped branch will be merged in the future

### head-branch
  **required** *default: develop*

  branch in which package.json will be bumped and pushed

### github-token
  **required**

  github token with access to merge in head-branch

### initial-version
  *default: 0.0.0*

  initial version used if base-branch doesn't have package.json


## Example usage
```yml
uses: prxg22/version-bump-action@master
with:
  head-branch: release
  initial-version: 1.0.0
  github-token: ${{secrets.GITHUB_TOKEN}}
```
