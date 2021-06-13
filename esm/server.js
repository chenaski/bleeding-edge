const http = require("http");
const fs = require("fs");

http
  .createServer((request, response) => {
    console.log(`Request url: ${request.url}`);

    const filePath = request.url.substr(1);

    fs.access(filePath, fs.constants.R_OK, (err) => {
      if (err) {
        response.statusCode = 404;
        response.end("Resourse not found!");
      } else {
        if (request.url.includes(".js")) {
          response.setHeader("Content-Type", "text/javascript");
        }

        fs.createReadStream(filePath).pipe(response);
      }
    });
  })
  .listen("3333");
