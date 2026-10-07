"use strict";

const bashKeywords = new Set([
    "case", "coproc", "do", "done", "elif", "else", "esac", "fi", "for",
    "function", "if", "in", "select", "then", "time", "until", "while"
]);
const bashBuiltins = new Set([
    ".", ":", "[", "[[", "alias", "bg", "break", "cd", "command", "continue",
    "declare", "echo", "eval", "exec", "exit", "export", "false", "fg",
    "getopts", "hash", "jobs", "let", "local", "logout", "printf", "pwd",
    "read", "readonly", "return", "set", "shift", "source", "test", "times",
    "trap", "true", "type", "typeset", "ulimit", "umask", "unalias", "unset",
    "wait"
]);
const shellCommands = new Set([
    "a2dissite", "a2enconf", "a2ensite", "apt", "apt-get", "apache2ctl",
    "bash", "cat", "certbot", "chmod", "cp", "curl", "git", "getent", "mkdir",
    "mysql", "nano", "php", "reboot", "rm", "scp", "sed", "ssh", "sudo",
    "systemctl", "tee", "ufw"
]);
const reservedWords = new Set(["!", "{", "}"]);

function span(className, text) {
    const element = document.createElement("span");
    element.className = className;
    element.textContent = text;
    return element;
}

function paintLine(line, state) {
    if (state.heredoc) {
        if (line.trim() === state.heredoc) {
            state.heredoc = null;
            return [span("bash-heredoc-marker", line)];
        }
        return [span("bash-heredoc", line)];
    }

    const fragments = [];
    let index = 0;
    let expectsCommand = true;
    let heredocDelimiter = null;

    while (index < line.length) {
        const rest = line.slice(index);
        const whitespace = rest.match(/^\s+/);
        if (whitespace) {
            fragments.push(document.createTextNode(whitespace[0]));
            index += whitespace[0].length;
            continue;
        }

        const heredoc = rest.match(/^<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/);
        if (heredoc) {
            fragments.push(span("bash-operator", heredoc[0]));
            heredocDelimiter = heredoc[2];
            index += heredoc[0].length;
            continue;
        }

        if (rest.startsWith("#")) {
            fragments.push(span("bash-comment", rest));
            break;
        }

        const assignment = rest.match(/^([A-Za-z_][A-Za-z0-9_]*)(=)("[^"]*"|'[^']*'|[^\s;|&<>]*)/);
        if (assignment) {
            fragments.push(span("bash-variable", assignment[1]));
            fragments.push(span("bash-operator", assignment[2]));
            fragments.push(span("bash-string", assignment[3]));
            index += assignment[0].length;
            continue;
        }

        const quote = rest[0];
        if (quote === "'" || quote === '"') {
            let end = 1;
            while (end < rest.length) {
                if (quote === '"' && rest[end] === "\\") {
                    end += 2;
                    continue;
                }
                if (rest[end] === quote) {
                    end++;
                    break;
                }
                end++;
            }
            const text = rest.slice(0, end);
            fragments.push(span("bash-string", text));
            index += text.length;
            continue;
        }

        const variable = rest.match(/^\$(?:\{[^}]*\}|[A-Za-z_][A-Za-z0-9_]*|[0-9@*#?$!_-])/);
        if (variable) {
            fragments.push(span("bash-variable", variable[0]));
            index += variable[0].length;
            continue;
        }

        const operator = rest.match(/^(?:&&|\|\||\|&|;;|;&|;;&|>>|>\||<<?|>&|<&|&>>|[;|&(){}])/);
        if (operator) {
            fragments.push(span("bash-operator", operator[0]));
            if (/^(?:[;|]|&&|\|\||&)$/.test(operator[0])) expectsCommand = true;
            index += operator[0].length;
            continue;
        }

        const word = rest.match(/^[^\s;|&(){}<>]+/);
        if (!word) {
            fragments.push(document.createTextNode(rest[0]));
            index++;
            continue;
        }

        const text = word[0];
        let className = "";
        if (bashKeywords.has(text) || reservedWords.has(text)) {
            className = "bash-keyword";
            if (["then", "do", "else", "elif", "!", "{", "}"].includes(text)) expectsCommand = true;
        } else if (text.startsWith("$")) {
            className = "bash-variable";
        } else if (/^-[A-Za-z0-9-]+$/.test(text)) {
            className = "bash-flag";
        } else if (/^\d+$/.test(text)) {
            className = "bash-number";
        } else if (expectsCommand && /^[A-Za-z_./][A-Za-z0-9_./-]*$/.test(text)) {
            if (bashBuiltins.has(text)) className = "bash-builtin";
            else if (shellCommands.has(text)) className = "bash-command";
            expectsCommand = text.includes("=") && !text.startsWith("./");
        }

        fragments.push(className ? span(className, text) : document.createTextNode(text));
        index += text.length;
    }

    if (heredocDelimiter) state.heredoc = heredocDelimiter;
    return fragments;
}

function highlightBash(code) {
    const state = { heredoc: null };
    const lines = code.textContent.split("\n");
    const fragment = document.createDocumentFragment();

    lines.forEach((line, index) => {
        for (const token of paintLine(line, state)) fragment.append(token);
        if (index < lines.length - 1) fragment.append(document.createTextNode("\n"));
    });

    code.replaceChildren(fragment);
}

window.highlightBash = highlightBash;

document.querySelectorAll("code.language-bash").forEach(highlightBash);
document.addEventListener("bash-code-ready", (event) => {
    if (event.target instanceof HTMLElement && event.target.matches("code.language-bash")) {
        highlightBash(event.target);
    }
});
