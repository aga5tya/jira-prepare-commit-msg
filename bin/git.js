"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeJiraTicket = exports.getJiraTicket = exports.getBranchName = exports.getRoot = exports.gitRevParse = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const cp = __importStar(require("child_process"));
const log_1 = require("./log");
// eslint-disable-next-line max-len
const conventionalCommitRegExp = /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([a-z ]+\)!?)?: ([\w ]+)$/g;
function getMsgFilePath(index = 0) {
    log_1.debug('getMsgFilePath');
    // Husky stashes git hook parameters $* into a HUSKY_GIT_PARAMS env var.
    const gitParams = process.env.HUSKY_GIT_PARAMS || '';
    // Throw a friendly error if the git params environment variable can't be found – the user may be missing Husky.
    if (!gitParams) {
        throw new Error(`The process.env.HUSKY_GIT_PARAMS isn't set. Is supported Husky version installed?`);
    }
    // Unfortunately, this will break if there are escaped spaces within a single argument;
    // I don't believe there's a workaround for this without modifying Husky itself
    return gitParams.split(' ')[index];
}
function escapeReplacement(str) {
    return str.replace(/[$]/, '$$$$'); // In replacement to escape $ needs $$
}
function replaceMessageByPattern(jiraTicket, message, pattern) {
    const result = pattern.replace('$J', escapeReplacement(jiraTicket)).replace('$M', escapeReplacement(message));
    log_1.debug(`Replacing message: ${result}`);
    return result;
}
function gitRevParse(cwd = process.cwd()) {
    // https://github.com/typicode/husky/issues/580
    // https://github.com/typicode/husky/issues/587
    const { status, stderr, stdout } = cp.spawnSync('git', ['rev-parse', '--show-prefix', '--git-common-dir'], { cwd });
    if (status !== 0) {
        throw new Error(stderr.toString());
    }
    const [prefix, gitCommonDir] = stdout
        .toString()
        .split('\n')
        .map((s) => s.trim())
        // Normalize for Windows
        .map((s) => s.replace(/\\\\/, '/'));
    return { prefix, gitCommonDir };
}
exports.gitRevParse = gitRevParse;
function getRoot() {
    log_1.debug('getRoot');
    const cwd = process.cwd();
    const { gitCommonDir } = gitRevParse(cwd);
    // Git rev-parse returns unknown options as is.
    // If we get --absolute-git-dir in the output,
    // it probably means that an old version of Git has been used.
    // There seem to be a bug with --git-common-dir that was fixed in 2.13.0.
    // See issues above.
    if (gitCommonDir === '--git-common-dir') {
        throw new Error('Husky requires Git >= 2.13.0, please upgrade Git');
    }
    return path.resolve(cwd, gitCommonDir);
}
exports.getRoot = getRoot;
async function getBranchName(gitRoot) {
    log_1.debug('gitBranchName');
    return new Promise((resolve, reject) => {
        cp.exec(`git --git-dir=${gitRoot} symbolic-ref --short HEAD`, { encoding: 'utf-8' }, (err, stdout, stderr) => {
            if (err) {
                return reject(err);
            }
            if (stderr) {
                return reject(new Error(String(stderr)));
            }
            resolve(String(stdout).trim());
        });
    });
}
exports.getBranchName = getBranchName;
function getJiraTicket(branchName, config) {
    log_1.debug('getJiraTicket');
    const jiraIdPattern = new RegExp(config.jiraTicketPattern, 'i');
    const matched = jiraIdPattern.exec(branchName);
    const jiraTicket = matched && matched[0];
    if (!jiraTicket) {
        throw new Error('The JIRA ticket ID not found');
    }
    return jiraTicket.toUpperCase();
}
exports.getJiraTicket = getJiraTicket;
function writeJiraTicket(jiraTicket, config) {
    var _a;
    log_1.debug('writeJiraTicket');
    const messageFilePath = getMsgFilePath();
    let message;
    // Read file with commit message
    try {
        message = fs.readFileSync(messageFilePath, { encoding: 'utf-8' });
    }
    catch (ex) {
        throw new Error(`Unable to read the file "${messageFilePath}".`);
    }
    log_1.debug(`Commit message: ${message}`);
    // ignore everything after commentChar or the scissors comment, which present when doing a --verbose commit,
    // or `git config commit.status true`
    const messageSections = message.split('------------------------ >8 ------------------------')[0];
    const lines = messageSections
        .trim()
        .split('\n')
        .map((line) => line.trimLeft())
        .filter((line) => !line.startsWith(config.commentChar));
    log_1.debug(`Lines: ${lines.join('\n')}`);
    if (config.isConventionalCommit) {
        // In the first line should be special conventional format
        const firstLine = lines[0];
        log_1.debug(`Finding conventional commit in: ${firstLine}`);
        conventionalCommitRegExp.lastIndex = -1;
        const [match, type, scope, msg] = (_a = conventionalCommitRegExp.exec(firstLine)) !== null && _a !== void 0 ? _a : [];
        if (match) {
            log_1.debug(`Conventional commit message: ${match}`);
            lines[0] = `${type}${scope || ''}: ${replaceMessageByPattern(jiraTicket, msg, config.messagePattern)}`;
        }
    }
    // Add jira ticket into the message in case of missing
    if (lines.every((line) => !line.includes(jiraTicket))) {
        lines[0] = replaceMessageByPattern(jiraTicket, lines[0], config.messagePattern);
    }
    // Write message back to file
    try {
        fs.writeFileSync(messageFilePath, lines.join('\n'), { encoding: 'utf-8' });
    }
    catch (ex) {
        throw new Error(`Unable to write the file "${messageFilePath}".`);
    }
}
exports.writeJiraTicket = writeJiraTicket;
