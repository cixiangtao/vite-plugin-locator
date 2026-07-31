import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const version = process.argv[2] ?? packageJson.version;
const tag = `v${version}`;

assert.match(version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, `Invalid version: ${version}`);

const [{ stdout: remoteRefs }, { stdout: npmPackageJson }, { stdout: npmDistTagsJson }] =
  await Promise.all([
    execFileAsync("git", [
      "ls-remote",
      "--tags",
      "origin",
      `refs/tags/${tag}`,
      `refs/tags/${tag}^{}`,
    ]),
    execFileAsync("npm", ["view", `${packageJson.name}@${version}`, "--json"]),
    execFileAsync("npm", ["view", packageJson.name, "dist-tags", "--json"]),
  ]);

const refs = new Map(
  remoteRefs
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, ref] = line.split(/\s+/);
      return [ref, sha];
    }),
);
const tagCommit = refs.get(`refs/tags/${tag}^{}`) ?? refs.get(`refs/tags/${tag}`);

assert.ok(tagCommit, `Remote tag ${tag} does not exist`);

const npmPackage = JSON.parse(npmPackageJson);
const npmDistTags = JSON.parse(npmDistTagsJson);

assert.equal(npmPackage.version, version, `npm version does not match ${version}`);
assert.equal(npmPackage.gitHead, tagCommit, "npm gitHead does not match the remote tag commit");
assert.equal(npmDistTags.latest, version, `npm latest does not point to ${version}`);

console.log(
  `${packageJson.name}@${version} verified: npm latest and ${tag} both resolve to ${tagCommit}`,
);
