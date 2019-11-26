const core = require("@actions/core");
const github = require("@actions/github");
const { exec } = require("@actions/exec");

const EVENT = "pull_request";

const githubToken = core.getInput("github-token");
const octokit = new github.GitHub(githubToken);

const debugJSON = (obj) => core.debug(JSON.stringify(obj))

debugJSON(github.context)

const checkEvent = (baseBranch, headBranch) => {
  const { eventName, payload } = github.context;
  const { pull_request } = payload;

  const prBaseBranch = pull_request.base.ref;
  const prHeadBranch = pull_request.head.ref;

  if (
    eventName === EVENT &&
    prBaseBranch === baseBranch &&
    prHeadBranch === headBranch
  )
    return;

  throw Error("Event not supported");
};

const getLastVersion = async baseBranch => {
  const { context } = github;

  const pkgFile = await octokit.repos.getContents({
    ...context.repo,
    ref: baseBranch,
    path: "package.json"
  });

  const content = Buffer.from(pkgFile.data.content, "base64");

  const { version } = JSON.parse(content);

  return version;
};

const validatePullRequest = () => {
  const { context } = github;
  const { payload } = context;

  const prNumber = payload.number
  const pull_request = octokit.pull_request(context.repo, prNumber)

  debugJSON(pull_request)
  if (!pull_request.mergeable) throw Error(`PR isn't mergeable`);
};

const run = async () => {
  const baseBranch = core.getInput("base-branch");
  const headBranch = core.getInput("head-branch");

  try {
    checkEvent(baseBranch, headBranch);
  } catch (e) {
    core.warning(e.message);
    return;
  }


  try {
    validatePullRequest();
    const version = await getLastVersion(baseBranch);
  } catch (e) {
    core.error(e.message);
    core.setFailed(`Action failed due: ${e}`);
  }
};

run();
