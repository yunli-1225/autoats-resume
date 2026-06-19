const PREFIX = '[AI]';

export const logger = {
  info: (module: string, msg: string, extra?: Record<string, unknown>) => {
    if (extra) console.log(`${PREFIX}[${module}] ${msg}`, JSON.stringify(extra));
    else console.log(`${PREFIX}[${module}] ${msg}`);
  },
  warn: (module: string, msg: string, extra?: Record<string, unknown>) => {
    if (extra) console.warn(`${PREFIX}[${module}] ${msg}`, JSON.stringify(extra));
    else console.warn(`${PREFIX}[${module}] ${msg}`);
  },
  error: (module: string, msg: string, extra?: Record<string, unknown>) => {
    if (extra) console.error(`${PREFIX}[${module}] ${msg}`, JSON.stringify(extra));
    else console.error(`${PREFIX}[${module}] ${msg}`);
  },
};
