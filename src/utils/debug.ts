/**
 * Debug logging utility that only logs in development mode.
 * Drop-in replacement for console.log/warn/error.
 *
 * Usage:
 *   import { debug } from '@/utils/debug';
 *   debug.log('Team balancing', 'Starting draft...', { players: 10 });
 *   debug.warn('Missing data', playerId);
 *   debug.error('Failed to load', error);
 *   debug.table(data);
 *   debug.group('Section');
 *   debug.groupEnd();
 */

const isDev = import.meta.env.DEV;

function noop() {}

export const debug = {
  log: isDev ? console.log.bind(console) : noop,
  warn: isDev ? console.warn.bind(console) : noop,
  error: isDev ? console.error.bind(console) : noop,
  info: isDev ? console.info.bind(console) : noop,
  table: isDev ? console.table.bind(console) : noop,
  group: isDev ? console.group.bind(console) : noop,
  groupEnd: isDev ? console.groupEnd.bind(console) : noop,
  time: isDev ? console.time.bind(console) : noop,
  timeEnd: isDev ? console.timeEnd.bind(console) : noop,
};

export default debug;
