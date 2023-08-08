/** @module Env */

import Helper from './Helper.js';

/** Set and remember the environment. */

export default class Logger {
  /**
   * Set helper variables.
   */
  constructor() {
    this.logs = [];
    if (document) {
      this.logElement = document.querySelector('#log');
    }
  }

  log(level, message) {
    this.logs.push({
      level: level,
      message: message,
    });
    if (this.logElement) {
      this.logElement.textContent += `${message}\n`;
    }
  }
  info(message) {
    this.log('info', message);
  }
  warning(message) {
    this.log('warning', message);
  }
  success(message) {
    this.log('success', message);
  }
  error(message) {
    this.log('error', message);
    this.showLog();
    console.table(this.logs);
    throw new Error(message);
  }
  showLog() {
    if (this.logElement) {
      this.logElement.removeAttribute('hidden');
    }
  }
}
