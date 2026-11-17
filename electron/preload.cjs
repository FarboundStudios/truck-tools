'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const call = (channel, ...args) => ipcRenderer.invoke(channel, ...args);
const listen = (channel, cb) => ipcRenderer.on(channel, (_e, payload) => cb(payload));

contextBridge.exposeInMainWorld('tt', {
  games: () => call('games:list'),
  profiles: gameId => call('profiles:list', gameId),
  saves: profileDir => call('saves:list', profileDir),
  load: (file, gameId) => call('save:load', file, gameId),
  apply: (file, changes, gameId) => call('save:apply', file, changes, gameId),
  running: gameId => call('game:running', gameId),
  open: dir => call('shell:open', dir),
  info: () => call('app:info'),
  link: url => call('link:open', url),
  settings: () => call('settings:get'),
  setSetting: (key, value) => call('settings:set', key, value),
  update: {
    check: () => call('update:check'),
    download: () => call('update:download'),
    install: () => call('update:install'),
    onAvailable: cb => listen('update:available', cb),
    onProgress: cb => listen('update:progress', cb),
  },
});
