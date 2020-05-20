#!/usr/bin/env node
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
const git = __importStar(require("./git"));
const config_1 = require("./config");
const log_1 = require("./log");
(async () => {
    log_1.log('start');
    try {
        const gitRoot = git.getRoot();
        const branch = await git.getBranchName(gitRoot);
        const config = await config_1.loadConfig();
        const ticket = git.getJiraTicket(branch, config);
        log_1.log(`The JIRA ticket ID is: ${ticket}`);
        git.writeJiraTicket(ticket, config);
    }
    catch (err) {
        log_1.error(err);
    }
    log_1.log('done');
})();
