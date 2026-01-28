import { Buffer } from 'buffer';
window.Buffer = Buffer;
window.global = window;
window.process = { env: {} };
