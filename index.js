const core = require('@actions/core')
const github = require('@actions/github')
const { exec } = require('@actions/exec')

core.debug(JSON.stringify(github.context))
// const { GITHUB_TOKEN } = process.env
// const VERSIONS = ['patch', ]
// const EVENT = 'pull_request'
// const EVENT_TYPE = 'labeled'
//
// const checkActionEvent = () => {
//   const { pull_request } = github.context.payload || {}
//
//   if (
//     pull_request
//     && !pull_request.action
//     && pull_request.action !== 'labeled'
//   ) return
//
//   throw Error('Event not supported')
// }
//
//
// const run = async () => {
//
// }
