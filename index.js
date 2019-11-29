const core = require("@actions/core");
const github = require("@actions/github");
const recommendedBump = require("recommended-bump");
const { exec } = require("@actions/exec");
const semver = require("semver");
const fs = require("fs");
const EVENT = "pull_request";

const githubToken = core.getInput("github-token");
const octokit = new github.GitHub(githubToken);

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

  if (!pull_request.mergeable) throw Error(`PR isn't mergeable`);
};

const validateCommitMessage = message => {
  if (typeof message !== "string") return false;

  const [header = message] = message.split("\n\n");
  const commitRegex = /^(feat|fix|chore|refactor|style|test|docs)(?:\((.+)\))?: (.+)$/g;

  return commitRegex.test(header.trim());
};

const getRelease = async () => {
  const { context } = github;
  const { payload } = context;

  const pull_number = payload.number;

  const { data: commits } = await octokit.pulls.listCommits({
    ...context.repo,
    pull_number
  });

  const messages = commits
    .map(({ commit }) => commit.message)
    .filter(validateCommitMessage);

  const { increment: release } = recommendedBump(messages);

  return release;
};

const bump = async (lastVersion, release) => {
  const version = semver.inc(lastVersion, release);

  try {
    // npm version --new-version
    await exec(`npm version --new-version ${version} --git-tag-version false`);
    const file = fs.readFileSync("package.json");
    const { version: bumped } = JSON.parse(file.toString());

    return bumped;
  } catch (e) {
    core.error(e);
  }
};

const pushBumpedVersion = async (version, head) => {
  const actor = process.env.GITHUB_ACTOR;
  const repository = process.env.GITHUB_REPOSITORY;

  let isDirty
  try {
    await exec("git diff --exit-code");
    isDirty = false
  } catch (e) {
    isDirty = true
  }

  if (!isDirty) {
    core.warning(`version ${version} was already pushed`);
    return false;
  }

  await exec(`git commit -m "chore: Released version ${version}" -a`);
  const remote = `https://${actor}:${githubToken}@github.com/${repository}.git`;
  await exec(`git push "${remote}" HEAD:${head}`);
  return true
};

const configGit = async head => {
  await exec(`git config --local user.email "action@github.com"`);
  await exec(`git config --local user.name "Version Bump Action"`);
  await exec(`git checkout ${head}`);
};

const run = async () => {
  const base = core.getInput("base-branch");
  const head = core.getInput("head-branch");
  const initialVersion = core.getInput("initial-version");

  try {
    checkEvent(base, head);
    await configGit(head);
    await validatePullRequest();
    console.log("pull request validated");
    const release = await getRelease();
    if (!release) {
      core.warning("no release needed!");
      return;
    }

    console.log(`starting ${release} release`);
    const lastVersion = await getLastVersion(base, initialVersion);
    console.log(`got last version: ${lastVersion}`);
    const version = await bump(lastVersion, release);
    console.log(`bumped to version ${version}!`);
    const pushed = await pushBumpedVersion(version, head);
    if (pushed) console.log(`version ${version} pushed!`);
  } catch (e) {
    core.setFailed(e);
  }
};

run();
