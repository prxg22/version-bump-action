const core = require("@actions/core");
const github = require("@actions/github");
const { exec } = require("@actions/exec");

const EVENT = "pull_request";

const checkEvent = () => {
  const { eventName, payload } = github.context;
  const prBaseBranch = payload.base.ref;
  const prHeadBranch = payload.head.ref;

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

  const pkgFile = await octokit.repos.getContet({
    ...context.repo,
    path: "package.json"
  });

  const pkg = JSON.parse(pkgFile.toString());

  core.debug(pkg);

  return pkg.version;
};

const run = async () => {
  const baseBranch = core.getInput("base-branch");
  const headBranch = core.getInput("head-branch");
  const githubToken = core.getInput("github-token");

  try {
    checkEvent();
  } catch (e) {
    core.warning(e.message);
    return;
  }

  try {
    const version = await getLastVersion(baseBranch, githubToken);
  } catch (e) {}
};

run();
