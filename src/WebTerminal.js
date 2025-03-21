/* global MutationObserver */

import { cloneCommandNode, COMMANDS, markup } from './modules';
import style from './WebTerminal.css'; // eslint-disable-line

const KEY = 'WebTerm';

const { addEventListener, localStorage } = window;

class Terminal {
  constructor(props = {}) {
    const {
      container = 'web-terminal',
      commands = {},
      welcome = 'Welcome to the simple <a href="">Web Terminal</a>.',
      prompt = '',
      separator = '&gt;',
      ignoreBadCommand = false,
      autoFocus = true,
    } = props;
    this.commands = Object.assign({}, COMMANDS, commands);
    this.history = localStorage[KEY] ? JSON.parse(localStorage[KEY]) : [];
    this.historyCursor = this.history.length;
    this.welcome = welcome;
    this.shell = { prompt, separator };
    this.ignoreBadCommand = ignoreBadCommand;
    this.autoFocus = autoFocus;

    const el = document.getElementById(container);
    if (el) {
      this.cacheDOM(el);
      this.addListeners();
      if (welcome) this.output(welcome);
    } else throw Error(`Container #${container} doesn't exists.`);
  }

  state = {
    prompt: undefined,
    idle: undefined,
  };

  cacheDOM = (el) => {
    el.classList.add(KEY);
    el.insertAdjacentHTML('beforeEnd', markup(this));

    // Cache DOM nodes
    const container = el.querySelector('.container');
    this.DOM = {
      container,
      output: container.querySelector('output'),
      command: container.querySelector('.command'),
      input: container.querySelector('.command .input'),
      prompt: container.querySelector('.command .prompt'),
    };
  }

  addListeners = () => {
    const { DOM, autoFocus } = this;

    // Create a MutationObserver to observe changes in the output element
    const observer = new MutationObserver(() => {
      setTimeout(() => DOM.input.scrollIntoView(), 10);
    });

    // Start observing the output element for child list changes
    observer.observe(DOM.output, { childList: true, subtree: true });

    DOM.output.addEventListener('click', event => event.stopPropagation(), false);
    DOM.input.addEventListener('keyup', this.onKeyUp, false);
    DOM.input.addEventListener('keydown', this.onKeyDown, false);
    DOM.command.addEventListener('click', () => DOM.input.focus(), false);

    if (autoFocus) {
      addEventListener('click', () => DOM.input.focus(), false);

      addEventListener('keyup', (event) => {
        DOM.input.focus();
        event.stopPropagation();
        event.preventDefault();
      }, false);
    }
  }

  onKeyUp = (event) => {
    const { keyCode } = event;
    const { DOM, history = [], historyCursor } = this;

    if (keyCode === 27) { // ESC key
      DOM.input.value = '';
      event.stopPropagation();
      event.preventDefault();
    } else if ([38, 40].includes(keyCode)) {
      if (keyCode === 38 && historyCursor > 0) this.historyCursor -= 1; // {38} UP key
      if (keyCode === 40 && historyCursor < history.length - 1) this.historyCursor += 1; // {40} DOWN key

      if (history[this.historyCursor]) DOM.input.value = history[this.historyCursor];
    }
  }

  onKeyDown = ({ keyCode }) => {
    const {
      commands = {}, DOM, history, onInputCallback, state,
    } = this;
    const commandLine = DOM.input.value.trim();
    if (keyCode !== 13 || !commandLine) return;

    const [command, ...parameters] = commandLine.split(' ');

    if (state.prompt) {
      state.prompt = false;
      this.onAskCallback(command);
      this.setPrompt();
      this.resetCommand();
      return;
    }

    // Save command line in history
    history.push(commandLine);
    localStorage[KEY] = JSON.stringify(history);
    this.historyCursor = history.length;

    // Clone command as a new output line
    DOM.output.appendChild(cloneCommandNode(DOM.command));

    // Clean command line
    DOM.command.classList.add('hidden');
    DOM.input.value = '';

    // Dispatch command
    let handled = false;
    if (Object.keys(commands).includes(command)) {
      const callback = commands[command];
      if (callback) {
        callback(this, parameters);
        handled = true;
      }
    } else if (!this.ignoreBadCommand) {
      this.output(`<u>${command}</u>: command not found.`);
    }
    if (onInputCallback) onInputCallback(command, parameters, handled);
  }

  resetCommand = () => {
    const { DOM } = this;

    DOM.input.value = '';
    DOM.command.classList.remove('input');
    DOM.command.classList.remove('hidden');
    if (DOM.input.scrollIntoView) DOM.input.scrollIntoView();
  }

  clear() {
    this.DOM.output.innerHTML = '';
    if (!this.state.idle) {
      this.DOM.input.focus();
    }
    this.resetCommand();
  }

  idle() {
    const { DOM } = this;

    DOM.command.classList.add('idle');
    DOM.prompt.innerHTML = '<div class="spinner"></div>';
  }

  prompt(prompt, callback = () => { }) {
    this.state.prompt = true;
    this.onAskCallback = callback;
    this.DOM.prompt.innerHTML = `${prompt}:`;
    this.resetCommand();
    this.DOM.command.classList.add('input');
  }

  onInput(callback) {
    this.onInputCallback = callback;
  }

  output(html = '&nbsp;') {
    this.DOM.output.insertAdjacentHTML('beforeEnd', `<span>${html}</span>`);
    this.resetCommand();
  }

  setPrompt(prompt = this.shell.prompt) {
    const { DOM, shell: { separator } } = this;

    this.shell = { prompt, separator };
    DOM.command.classList.remove('idle');
    DOM.prompt.innerHTML = `${prompt}${separator}`;
    DOM.input.focus();
  }
}

if (window) window.WebTerminal = Terminal;

export default Terminal;
