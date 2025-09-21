const { EventEmitter } = require('events');

class FakePty extends EventEmitter {
  constructor(executable, args, options) {
    super();
    this.executable = executable;
    this.args = args;
    this.options = options;
    this.written = [];
    this.killedWith = null;
    this.colCount = options?.cols || 80;
    this.rowCount = options?.rows || 24;
  }

  write(data) {
    this.written.push(data);
    this.emit('write', data);
  }

  resize(cols, rows) {
    this.colCount = cols;
    this.rowCount = rows;
  }

  kill(signal = 'SIGTERM') {
    this.killedWith = signal;
    this.emit('exit', { exitCode: signal === 'SIGTERM' ? 0 : null, signal });
  }

  onData(handler) {
    this.on('data', handler);
  }

  onExit(handler) {
    this.on('exit', handler);
  }

  emitData(data) {
    this.emit('data', data);
  }
}

const spawned = [];

function spawn(executable, args = [], options = {}) {
  const pty = new FakePty(executable, args, options);
  spawned.push(pty);
  return pty;
}

module.exports = {
  spawn,
  __spawned: spawned,
  __FakePty: FakePty
};
