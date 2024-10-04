const { SerialPort } = require("serialport");
const decodeToledoData = require("./decode-toledo-data");
const { DUR_MAIN_LOOP } = require("./constant");
const { ByteLengthParser } = require("@serialport/parser-byte-length");

async function main() {
  let _timeNow = Date.now();
  do {
    if (Date.now() < _timeNow + DUR_MAIN_LOOP) continue;
    const promise = new Promise(async (resolve, reject) => {
      const ports = await SerialPort.list();
      if (!ports.length) resolve("Waiting for serial port...");

      const port = new SerialPort(
        { path: ports[0].path, autoOpen: true, baudRate: 9600 },
        function (err) {
          if (err) {
            resolve(err.message);
          }
        }
      );

      const parser = port.pipe(new ByteLengthParser({ length: 18 }));

      parser.on("data", function (data) {
        const weightData = decodeToledoData(data);
        console.log(weightData.weight);
      });
      parser.on("close", function () {
        resolve("Waiting for serial port...");
      });
    });
    const info = await promise;
    console.log(info);
  } while (true);
}
main();
