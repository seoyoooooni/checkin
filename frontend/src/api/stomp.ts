import { loadAuth } from './storage';

const MAX_RETRY_MS = 10_000;

function parseFrame(raw: string) {
  const frame = raw.replace(/^[\r\n]+/, '');
  if (!frame) return null;
  const sep = frame.indexOf('\n\n');
  const head = sep < 0 ? frame : frame.slice(0, sep);
  const body = sep < 0 ? '' : frame.slice(sep + 2);
  const [command, ...lines] = head.split('\n');
  const headers: Record<string, string> = {};
  for (const line of lines) {
    const i = line.indexOf(':');
    if (i > 0) headers[line.slice(0, i)] = line.slice(i + 1);
  }
  return { command, headers, body };
}

export function subscribeStomp(
  destination: string,
  onMessage: (body: string) => void,
  onError?: (message: string) => void,
): () => void {
  let ws: WebSocket | null = null;
  let stopped = false;
  let retry = 0;
  let timer: number | undefined;

  const send = (command: string, headers: Record<string, string>) => {
    if (ws?.readyState !== WebSocket.OPEN) return;
    const lines = Object.entries(headers).map(([k, v]) => `${k}:${v}`);
    ws.send([command, ...lines, '', ''].join('\n') + '\0');
  };

  const connect = () => {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${protocol}://${location.host}/ws`);

    ws.onopen = () => {
      const token = loadAuth()?.accessToken;
      send('CONNECT', {
        'accept-version': '1.2',
        host: location.hostname,
        'heart-beat': '0,0',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      });
    };

    ws.onmessage = (e) => {
      if (typeof e.data !== 'string') return;
      for (const raw of e.data.split('\0')) {
        const frame = parseFrame(raw);
        if (!frame) continue;
        if (frame.command === 'CONNECTED') {
          retry = 0;
          send('SUBSCRIBE', { id: 'sub-0', destination });
        } else if (frame.command === 'MESSAGE') {
          onMessage(frame.body);
        } else if (frame.command === 'ERROR') {
          stopped = true;
          onError?.(frame.headers.message || '실시간 연결이 거부됐어요');
        }
      }
    };

    ws.onclose = () => {
      if (stopped) return;
      timer = window.setTimeout(connect, Math.min(MAX_RETRY_MS, 1000 * 2 ** retry++));
    };
  };

  connect();

  return () => {
    stopped = true;
    clearTimeout(timer);
    send('DISCONNECT', {});
    ws?.close();
  };
}
