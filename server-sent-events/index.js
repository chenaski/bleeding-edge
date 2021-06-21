import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const file = fs.readFileSync(path.join(__dirname, "cat.jpg"));
const base64File = file.toString("base64");
const chunksCount = 10;
const chunkLength = Math.round(base64File.length / chunksCount);

function startFileTransfer(offset) {
  let currentOffset = offset || 0;

  return function getNextChunk() {
    if (currentOffset >= chunksCount) return;

    const data = base64File.slice(
      chunkLength * currentOffset,
      chunkLength * currentOffset + chunkLength
    );

    currentOffset++;

    return data;
  };
}

http
  .createServer((req, res) => {
    const url = new URL(`http://${req.headers.host}${req.url}`);

    console.log(`[${req.method}] ${url.href}`);

    if (url.pathname === "/stream") {
      handleStream(req, res);
      return;
    }

    fs.createReadStream(path.join(__dirname, "index.html")).pipe(res);
  })
  .listen(3334);

function handleStream(req, res) {
  let id = req.headers["last-event-id"] ? +req.headers["last-event-id"] + 1 : 0;

  if (id >= chunksCount) id = 0;

  res.setHeader("Content-Type", "text/event-stream");

  const startOffset = id > 1 ? id - 1 : null;
  const getNextChunk = startFileTransfer(startOffset);
  const startTime = new Date().toISOString();

  const interval = setInterval(() => {
    if (id === 0) {
      sendStartedChunk(res, { id, chunksCount, chunkLength });
      id++;
      return;
    }

    const chunk = getNextChunk();

    if (!chunk) {
      clearInterval(interval);
      const endTime = new Date().toISOString();
      sendFinishedChunk(res, { id, startTime, endTime });
      id++;
      return;
    }

    sendDataChunk(res, { id, data: chunk });
    id++;
  }, 1000);
}

function sendStartedChunk(res, { id, chunksCount, chunkLength }) {
  res.write(`event: started\n`);
  res.write(`data: ${JSON.stringify({ chunksCount, chunkLength })}\n`);
  res.write(`id: ${id}\n`);
  res.write(`\n`);
}

function sendFinishedChunk(res, { id, startTime, endTime }) {
  res.write(`event: finished\n`);
  res.write(`data: ${JSON.stringify({ startTime, endTime })}\n`);
  res.write(`id: ${id}\n`);
  res.write(`\n`);
}

function sendDataChunk(res, { id, data }) {
  res.write(`data: ${data}\n`);
  res.write(`id: ${id}\n`);
  res.write(`\n`);
}
