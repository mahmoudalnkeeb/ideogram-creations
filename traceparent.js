const crypto = require('crypto');
const TraceParent = require('traceparent');

function getTraceparent() {
  const version = Buffer.alloc(1).toString('hex');
  const traceId = crypto.randomBytes(16).toString('hex');
  const id = crypto.randomBytes(8).toString('hex');
  const flags = '01';
  const header = `${version}-${traceId}-${id}-${flags}`;
  let traceparent = TraceParent.fromString(header);
  console.log('traceparent', traceparent.toString());
  return traceparent;
}

module.exports = { getTraceparent };
