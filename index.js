const core = require("@actions/core");
const github = require("@actions/github");
const recommendedBump = require("recommended-bump");
const { exec } = require("@actions/exec");
const fs = require("fs");
const semver = require("semver");

const EVENT = "pull_request";

const githubToken = core.getInput("github-token");
const octokit = new github.GitHub(githubToken);

const debugJSON = obj => core.debug(JSON.stringify(obj));

debugJSON(github.context);

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

const validatePullRequest = async () => {
  const { context } = github;
  const { payload } = context;

  const pull_number = payload.number;
  const { data: pull_request } = await octokit.pulls.get({
    ...context.repo,
    pull_number
  });

  debugJSON(pull_request);
  if (!pull_request.mergeable) throw Error(`PR isn't mergeable`);
};

const getBumpIncrement = async () => {
  const { context } = github;
  const { payload } = context;

  const pull_number = payload.number;

  const { data: commits } = await octokit.pulls.listCommits({
    ...context.repo,
    pull_number
  });

  const messages = commits.map(({ commit }) => commit.message);

  const { increment: release } = recommendedBump(messages);

  return release;
};

const bump = async (lastVersion, release) => {
  const version = semver.inc(lastVersion, release);

  await exec(`yarn version --new-version ${version} --no-git-tag-version`);
  const file = fs.readFileSync("package.json");
  const { version: newVersion } = JSON.parse(file.toString());

  core.debug(
    `lastVersion ${lastVersion} - intended version ${version} - newVersion: ${newVersion}`
  );
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
    await validatePullRequest();
    const release = await getBumpIncrement();
    const lastVersion = await getLastVersion(baseBranch);
    if (!release) {
      core.warning("no version release needed!");
      return;
    }

    await bump(lastVersion, release);
  } catch (e) {
    core.error(e.message);
    core.setFailed(`Action failed due: ${e}`);
  }
};

run();
