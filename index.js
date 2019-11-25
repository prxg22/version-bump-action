const core = require('@actions/core')
const github = require('@actions/github')
const { exec } = require('@actions/exec')

const { GITHUB_TOKEN } = process.env
const VERSIONS = ['patch', 'minor', 'major']
const EVENT = 'pull_request'
const EVENT_ACTION = 'labeled'

const checkEvent = () => {
  const { eventName, payload } = github.context

  if (
    eventName === EVENT
    && payload.action
    && payload.action === EVENT_ACTION
  ) return

  throw Error('Event not supported')
}


const getPullRequestVersion = () => {
  const { payload } = github.context

  const { labels } = payload.pull_request

  const version = VERSIONS.reduce((found, searched) => {
    const label = labels.find(({ name }) => {
      return searched === name.toLowerCase()
    })
    return (label && label.name) || found
  }, undefined)

  if (!version) throw Error('no semver label found!')

  return version
}

const run = async () => {
  try {
    checkEvent()
    const version = getPullRequestVersion()
  } catch (e) {
    core.warning(e.message)
    return
  }

  try {
    await exec(`yarn version --${version} --no-git-tag-version`)
  } catch (e) {
    core.setFailed(e.message)  
  }
}

run()
