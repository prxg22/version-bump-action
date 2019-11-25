const core = require('@actions/core')
const github = require('@actions/github')
const { exec } = require('@actions/exec')

core.debug(github.context.eventName)
core.debug(github.context.action)
core.debug(JSON.stringify(github.context))

const { GITHUB_TOKEN } = process.env
const VERSIONS = ['patch', ]
const EVENT = 'pull_request'
const EVENT_TYPE = 'labeled'

const checkEvent = () => {
  const { eventName, payload } = github.context

  if (
    eventName === EVENT
    && !payload.action
    && payload.action !== EVENT_TYPE
  ) return

  throw Error('Event not supported')
}


const run = async () => {
  try {
    checkEvent
  } catch (e) {
    core.warning(e.message)
    return
  }
}
