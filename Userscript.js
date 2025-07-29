// ==UserScript==
// @name         WebSocket Decoder for MBlox (Universal Logger)
// @namespace    https://miniblox.io
// @version      1.0
// @description  Logs and decodes WebSocket packets (text, JSON, pipe, binary)
// @author       ModuleMaster64
// @match        https://miniblox.io
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  function tryParse(data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      if (typeof data === 'string' && data.includes('|')) {
        return data.split('|');
      }
    }
    return data;
  }

  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function (...args) {
    const socket = new OriginalWebSocket(...args);
    console.log('[WS] 🎯 Connected:', args[0]);

    socket.addEventListener('message', event => {
      let decoded = event.data;

      if (typeof event.data === 'string') {
        const parsed = tryParse(event.data);
        console.log('%c[WS →] Text:', 'color:#0f0', parsed);
      } else if (event.data instanceof ArrayBuffer) {
        const view = new DataView(event.data);
        const hex = Array.from(new Uint8Array(event.data)).map(b => b.toString(16).padStart(2, '0')).join(' ');
        const opcode = view.getUint8(0);
        console.log(`%c[WS →] Binary: opcode=0x${opcode.toString(16)} | raw=`, 'color:#ff0', hex);

        // Optional: try to decode as UTF-8 if printable
        const utf8 = decoder.decode(event.data);
        if (/^[\x20-\x7E\s]+$/.test(utf8)) {
          console.log('%c↳ UTF8 (guess):', 'color:#aaa', utf8);
        }
      } else {
        console.log('%c[WS →] Unknown:', 'color:red', event.data);
      }
    });

    const originalSend = socket.send;
    socket.send = function (data) {
      let toSend = data;

      if (typeof data === 'string') {
        console.log('%c[WS ←] Send Text:', 'color:#0ff', tryParse(data));
      } else if (data instanceof ArrayBuffer) {
        const view = new DataView(data);
        const opcode = view.getUint8(0);
        const hex = Array.from(new Uint8Array(data)).map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.log(`%c[WS ←] Send Binary: opcode=0x${opcode.toString(16)} | raw=`, 'color:#f0f', hex);

        const utf8 = decoder.decode(data);
        if (/^[\x20-\x7E\s]+$/.test(utf8)) {
          console.log('%c↳ UTF8 (guess):', 'color:#aaa', utf8);
        }
      }

      return originalSend.call(this, toSend);
    };

    return socket;
  };
})();