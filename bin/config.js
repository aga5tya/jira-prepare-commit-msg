"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = void 0;
const cosmiconfig_1 = require("cosmiconfig");
const log_1 = require("./log");
const defaultConfig = {
    messagePattern: '[$J]\n$M',
    jiraTicketPattern: '([A-Z]+-\\d+)',
    commentChar: '#',
    isConventionalCommit: false,
};
function resolveConfig(configPath) {
    try {
        return require.resolve(configPath);
    }
    catch (_a) {
        return configPath;
    }
}
async function loadConfig(configPath) {
    try {
        const explorer = cosmiconfig_1.cosmiconfig('jira-prepare-commit-msg', {
            searchPlaces: [
                'package.json',
                '.jirapreparecommitmsgrc',
                '.jirapreparecommitmsgrc.json',
                '.jirapreparecommitmsgrc.yaml',
                '.jirapreparecommitmsgrc.yml',
                'jira-prepare-commit-msg.config.js',
            ],
        });
        const config = configPath ? await explorer.load(resolveConfig(configPath)) : await explorer.search();
        log_1.debug(`Loaded config: ${JSON.stringify(config)}`);
        if (config && !config.isEmpty) {
            const result = Object.assign(Object.assign({}, defaultConfig), config.config);
            log_1.debug(`Used config: ${JSON.stringify(result)}`);
            return result;
        }
    }
    catch (err) {
        log_1.error(`Loading configuration failed with error: ${err.toString()}`);
    }
    const result = Object.assign({}, defaultConfig);
    log_1.debug(`Used config: ${JSON.stringify(result)}`);
    return result;
}
exports.loadConfig = loadConfig;
