#! /usr/bin/env node

'use strict';

const Promise = require('bluebird');
global.Promise = Promise;

const rp = require('request-promise');
const meow = require('meow');
const chalk = require('chalk');
const fs = Promise.promisifyAll(require('fs'));

const cli = meow(`
  Usage
    $ node index.js <gitignore-name>

  Examples
    $ node index.js Swift
    $ node index.js android
    $ node index.js node
`);

function capitalize (str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function requestGitIgnore (url) {
    return rp(url)
        .then(ignore => {
            console.log(chalk.green(`Successfully fethed gitignore from ${url}`));
            return ignore;
        })
        .catch(error => {
            return '';
        });
}

function requestPossibleGitIgnores (name) {
    const possibilities = Array.from(new Set([name, capitalize(name), name.toLowerCase()]));
    return Promise.all(possibilities.map(n => {
        const url = `https://raw.githubusercontent.com/github/gitignore/master/${n}.gitignore`;
        return requestGitIgnore(url);
    }))
    .then(ignores => ignores.filter(x => x && x.length > 0));
}

async function gen (names) {
    console.log('Generating .gitignore for', names);
    const gitignores = await Promise.all(names.map(name => {
        return requestPossibleGitIgnores(name).then(results => results[0])
    }));
    const gitignore = gitignores.filter(x => x).join('');
    await fs.writeFileAsync('.gitignore', gitignore);
    console.log(chalk.green('Generated .gitignore!'));
}

gen(cli.input);
