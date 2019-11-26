const core = require("@actions/core");
const github = require("@actions/github");
const recommendedBump = require("recommended-bump");
const { exec } = require("@actions/exec");
const semver = require("semver");

const EVENT = "pull_request";

const githubToken = core.getInput("github-token");
const octokit = new github.GitHub(githubToken);

const debugJSON = obj => core.debug(JSON.stringify(obj));

debugJSON(github.context);
debugJSON(process.env);

const checkEvent = (base, head) => {
  const { eventName, payload } = github.context;
  const { pull_request } = payload;

  const prBase = pull_request.base.ref;
  const prHead = pull_request.head.ref;

  if (eventName === EVENT && prBase === base && prHead === head) return;

  throw Error("Event not supported");
};

const getLastVersion = async (base, initial = "0.0.0") => {
  const { context } = github;

  try {
    const pkgFile = await octokit.repos.getContents({
      ...context.repo,
      ref: base,
      path: "package.json"
    });

    const content = Buffer.from(pkgFile.data.content, "base64");

    const { version } = JSON.parse(content);

    return version;
  } catch (e) {
    if (e.toString() === "HttpError: Not Found") return initial;
    throw e;
  }
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

const getRelease = async () => {
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

  try {
    await exec(`yarn version --new-version ${version} --no-git-tag-version`);
  } catch (e) {
    core.error(e);
    debugJSON(e);
  }
};

const commitBumpedVersion = async version => {
  await exec(`git config --local user.email "action@github.com"`);
  await exec(`git config --local user.name "GitHub Action"`);
  await exec(`git commit -m "Release version ${version}" -a`);
  const remote_repo =
    "https://${GITHUB_ACTOR}:${INPUT_GITHUB_TOKEN}@github.com/${REPOSITORY}.git";
};

const run = async () => {
  const base = core.getInput("base-branch");
  const head = core.getInput("head-branch");
  const initialVersion = core.getInput("initial-version");

  try {
    checkEvent(base, head);
  } catch (e) {
    core.warning(e.message);
    return;
  }

  try {
    await validatePullRequest();
    core.debug("pull request validated");
    const release = await getRelease();
    core.debug(`got release: ${release}`);
    const lastVersion = await getLastVersion(base, initialVersion);
    core.debug(`got last version: ${lastVersion}`);

    if (!release) {
      core.warning("no version release needed!");
      return;
    }

    await bump(lastVersion, release);
    core.debug(`bumped!`);
  } catch (e) {
    debugJSON(e);
    core.setFailed(`Action failed due: ${e}`);
  }
};

run();
