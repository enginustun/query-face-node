const { createLogger, transports, format } = require('winston');
const path = require('path');
const mkdirp = require('mkdirp');
const cwd = process.cwd();
const { combine, timestamp, printf } = format;
require('winston-daily-rotate-file');

function customFormat() {
  const formatMessage = info =>
    `${info.timestamp} ${info.level} ${info.message}`;
  const formatError = info =>
    `${info.timestamp} ${info.level} ${info.message}\n${info.stack}\n\n`;
  const format = info =>
    info instanceof Error ? formatError(info) : formatMessage(info);
  return combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), printf(format));
}
const transport = new transports.DailyRotateFile({
  filename: 'qf-%DATE%.log',
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: true,
  maxSize: '1m',
  maxFiles: '14d',
  dirname: './qf-logs',
});

mkdirp.sync(path.join(cwd, '/qf-logs'));
const logger = createLogger({
  format: customFormat(),
  transports: [transport, new transports.Console()],
  exceptionHandlers: [
    new transports.File({
      filename: path.join(cwd, '/qf-logs', 'exceptions.log'),
    }),
  ],
});

module.exports = {
  getLogger: () => logger,
};
