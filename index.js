const core = require("@actions/core");
const github = require("@actions/github");
const { exec } = require("@actions/exec");

const EVENT = "pull_request";

const checkEvent = (baseBranch, headBranch) => {
  const { eventName, payload } = github.context;
  const { pull_request } = payload;

  const prBaseBranch = pull_request.base.ref;
  const prHeadBranch = pull_request.head.ref;

  core.debug(`${eventName}, ${prBaseBranch}, ${prHeadBranch}`);

  if (
    eventName === EVENT &&
    prBaseBranch === baseBranch &&
    prHeadBranch === headBranch
  )
    return;

  throw Error("Event not supported");
};

const getLastVersion = async (baseBranch, githubToken) => {
  const { context } = github;
  const octokit = new github.GitHub(githubToken);

  const pkgFile = await octokit.repos.getContents({
    ...context.repo,
    ref: baseBranch,
    path: "package.json"
  });

  core.debug(JSON.stringify(pkgFile))
  core.debug(pkgFile.version)

  const { version } = JSON.parse(pkgFile.toString());

  return version;
};

const run = async () => {
  const baseBranch = core.getInput("base-branch");
  const headBranch = core.getInput("head-branch");
  const githubToken = core.getInput("github-token");

  try {
    checkEvent(baseBranch, headBranch);
  } catch (e) {
    core.warning(e.message);
    return;
  }

  try {
    const version = await getLastVersion(baseBranch, githubToken);
    core.debug(version)
  } catch (e) {
    core.error(e.message);
    core.setFailed(`Action failed due: ${e}`);
  }
};

run();
