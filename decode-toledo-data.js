function decodeToledoData(hexString) {
  const buffer = Buffer.from(hexString, "hex");

  // Extract data based on known positions
  const stx = buffer.slice(0, 1).toString("ascii");
  const statusA = buffer.slice(1, 2).toString("ascii");
  const statusB = buffer.slice(2, 3).toString("ascii");
  const statusC = buffer.slice(3, 4).toString("ascii");
  const displayedWeight = buffer.slice(4, 10).toString("ascii");
  const tareWeight = buffer.slice(10, 16).toString("ascii");
  const cr = buffer.slice(16, 17).toString("ascii");
  const checksum =
    buffer.length > 17 ? buffer.slice(17, 18).toString("ascii") : null;

  let dmy = "";
  let decimalPlace = 1;
  for (const char of displayedWeight) {
    if (char === " ") continue;
    if (char < "0" || char > "9") {
      dmy = "0";
      break;
    }
    dmy += char;
  }
  if (dmy === "") dmy = "0";

  const weightSt16 = parseInt(dmy, 10);

  // Decode status bits for Status Byte A
  const decimalPointLocation = statusA.charCodeAt(0) & 0x07; // Bits 2, 1, and 0
  let weightFormat = "";
  let digits = 0;
  switch (decimalPointLocation) {
    case 0:
      weightFormat = "XXXXX00";
      decimalPlace = 100;
      digits = 0;
      break;
    case 1:
      weightFormat = "XXXXX0";
      decimalPlace = 10;
      digits = 0;
      break;
    case 2:
      weightFormat = "XXXXXX";
      decimalPlace = 1;
      digits = 0;
      break;
    case 3:
      weightFormat = "XXXXX.X";
      decimalPlace = 0.1;
      digits = 1;
      break;
    case 4:
      weightFormat = "XXXX.XX";
      decimalPlace = 0.01;
      digits = 2;
      break;
    case 5:
      weightFormat = "XXX.XXX";
      decimalPlace = 0.001;
      digits = 3;
      break;
    case 6:
      weightFormat = "XX.XXXX";
      decimalPlace = 0.0001;
      digits = 4;
      break;
    case 7:
      weightFormat = "X.XXXXX";
      decimalPlace = 0.00001;
      digits = 5;
      break;
    default:
      weightFormat = "XXXXXX";
      decimalPlace = 1;
      digits = 6;
      break;
  }

  // Decode status bits for Status Byte B
  const statusBitsB = {
    grossOrNet: statusB.charCodeAt(0) & 0x01 ? "Net" : "Gross",
    sign: statusB.charCodeAt(0) & 0x02 ? -1 : 1,
    outOfRange: statusB.charCodeAt(0) & 0x04 ? true : false,
    motion: statusB.charCodeAt(0) & 0x08 ? true : false,
    unit: statusB.charCodeAt(0) & 0x10 ? "kg" : "lbs",
    zeroNotCaptured: statusB.charCodeAt(0) & 0x20 ? true : false,
  };

  // Decode status bits for Status Byte C
  const weightDescription = statusC.charCodeAt(0) & 0x07; // Bits 2, 1, and 0
  let weightUnit;
  switch (weightDescription) {
    case 0:
      weightUnit = statusBitsB.unit;
      break;
    case 1:
      weightUnit = "g";
      break;
    case 2:
      weightUnit = "not used";
      break;
    case 3:
      weightUnit = "oz";
      break;
    default:
      weightUnit = "not used";
  }
  // Calculate checksum
  let calculatedChecksum = 0;
  for (let i = 0; i < buffer.length - 1; i++) {
    calculatedChecksum += buffer[i];
  }
  calculatedChecksum = (~calculatedChecksum + 1) & 0xff; // 2's complement

  // Validate checksum
  const isValidChecksum = checksum
    ? calculatedChecksum === buffer[buffer.length - 1]
    : null;

  const weight = +(weightSt16 * decimalPlace * statusBitsB.sign).toFixed(
    digits
  );

  return {
    raw: buffer.toString("ascii"),
    stx,
    statusA: { raw: statusA, weightFormat },
    statusB: { raw: statusB, ...statusBitsB },
    statusC: { raw: statusC, weightUnit },
    displayedWeight,
    weight,
    tareWeight,
    cr,
    checksum: {
      raw: checksum,
      isValid: isValidChecksum,
    },
  };
}

module.exports = decodeToledoData;