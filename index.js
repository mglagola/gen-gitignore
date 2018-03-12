#! /usr/bin/env node

'use strict';

const Promise = require('bluebird');
global.Promise = Promise;

const pkg = require('./package.json');
const rp = require('request-promise');
const meow = require('meow');
const chalk = require('chalk');
const { logVersionCheck } = require('validate-package-version');
const fs = Promise.promisifyAll(require('fs'));

const cli = meow(`
  Usage
    $ genignore <gitignore-name>

  Examples
    $ genignore Swift
    $ genignore android
    $ genignore node
`);

const isNil = (value) => value === null || value === undefined;

function isEmpty (value) {
    if (isNil(value)) {
        return true;
    }
    switch (typeof value) {
    case 'string':
    case 'object':
        return Object.keys(value).length === 0;
    default:
        return false;
    }
}

function flatten (array) {
    return [].concat.apply([], array);
}

function capitalize (str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function requestGitIgnore (url) {
    return rp(url)
        .then(ignore => {
            console.log(chalk.green(`Successfully fethed gitignore from ${url}`));
            return ignore;
        })
        .catch(() => '');
}

function requestPossibleGitIgnores (name) {
    const possibilities = Array.from(new Set([name, capitalize(name), name.toLowerCase()]));
    const urls = flatten(possibilities.map(n => [
        `https://raw.githubusercontent.com/github/gitignore/master/${n}.gitignore`,
        `https://raw.githubusercontent.com/github/gitignore/master/Global/${n}.gitignore`,
    ]));
    return Promise.all(urls.map(url => requestGitIgnore(url)))
        .then(ignores => ignores.filter(x => x && x.length > 0));
}

async function gen (names) {
    console.log('Generating .gitignore for', names);
    const gitignores = await Promise.all(names.map(name => {
        return requestPossibleGitIgnores(name).then(results => results[0]);
    }));
    const gitignore = gitignores.filter(x => x).join('');
    await fs.writeFileAsync('.gitignore', gitignore);
    console.log(chalk.green('Generated .gitignore!'));
    return true;
}

(async function () {
    try {
        const input = cli.input;
        if (isEmpty(input)) {
            console.log(chalk.red('Please specify at least one gitignore file name to fetch.'), 'See --help for usage details');
            process.exit(1);
        }
        await logVersionCheck(pkg);
        const success = true // await gen(input);
        // const success = await gen(input);
        return process.exit(success ? 0 : 1);
    } catch (error) {
        console.log(chalk.red(error.message));
        console.error(error.stack);
        return process.exit(1);
    }
})();
