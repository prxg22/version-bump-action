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


const getPullRequestVersion = async () => {
  const { payload } = github.context

  const { labels } = payload.pull_request

  const version = VERSIONS.reduce((acc, searched) => {
    const label = labels.find(({ name }) => searched === name.toLowerCase())
    return label
  }, undefined)

  if (!version) throw Error('no semver label found!')

  return version
}

const run = async () => {
  try {
    checkEvent()
    const version = await getPullRequestVersion()
  } catch (e) {
    core.warning(e.message)
    return
  }
}

run()
