import fs from "node:fs";

const FREESECT = 0xffffffff;
const ENDOFCHAIN = 0xfffffffe;

function sectorOffset(sector, sectorSize) {
  return (sector + 1) * sectorSize;
}

function readChain(buffer, start, fat, sectorSize) {
  const chunks = [];
  const visited = new Set();
  let sector = start;
  while (sector !== ENDOFCHAIN && sector !== FREESECT && !visited.has(sector)) {
    visited.add(sector);
    chunks.push(buffer.subarray(sectorOffset(sector, sectorSize), sectorOffset(sector, sectorSize) + sectorSize));
    sector = fat[sector];
  }
  return Buffer.concat(chunks);
}

function decodeDirectoryName(entry) {
  const length = entry.readUInt16LE(64);
  return length > 2 ? entry.subarray(0, length - 2).toString("utf16le") : "";
}

function workbookStream(buffer) {
  if (buffer.readUInt32LE(0) !== 0xe011cfd0 || buffer.readUInt32LE(4) !== 0xe11ab1a1) {
    throw new Error("Not a compound XLS file");
  }
  const sectorSize = 1 << buffer.readUInt16LE(30);
  const firstDirectorySector = buffer.readUInt32LE(48);
  const miniStreamCutoff = buffer.readUInt32LE(56);
  const firstMiniFatSector = buffer.readUInt32LE(60);
  const miniFatSectorCount = buffer.readUInt32LE(64);
  const firstDifatSector = buffer.readUInt32LE(68);
  const difatSectorCount = buffer.readUInt32LE(72);

  const fatSectors = [];
  for (let index = 0; index < 109; index += 1) {
    const sector = buffer.readUInt32LE(76 + index * 4);
    if (sector !== FREESECT) fatSectors.push(sector);
  }
  let difatSector = firstDifatSector;
  for (let index = 0; index < difatSectorCount && difatSector !== ENDOFCHAIN; index += 1) {
    const offset = sectorOffset(difatSector, sectorSize);
    for (let item = 0; item < sectorSize / 4 - 1; item += 1) {
      const sector = buffer.readUInt32LE(offset + item * 4);
      if (sector !== FREESECT) fatSectors.push(sector);
    }
    difatSector = buffer.readUInt32LE(offset + sectorSize - 4);
  }
  const fat = [];
  for (const sector of fatSectors) {
    const offset = sectorOffset(sector, sectorSize);
    for (let item = 0; item < sectorSize / 4; item += 1) fat.push(buffer.readUInt32LE(offset + item * 4));
  }

  const directory = readChain(buffer, firstDirectorySector, fat, sectorSize);
  const entries = [];
  for (let offset = 0; offset + 128 <= directory.length; offset += 128) {
    const entry = directory.subarray(offset, offset + 128);
    entries.push({
      name: decodeDirectoryName(entry),
      type: entry[66],
      start: entry.readUInt32LE(116),
      size: Number(entry.readBigUInt64LE(120)),
    });
  }
  const workbook = entries.find((entry) => entry.type === 2 && /^(Workbook|Book)$/i.test(entry.name));
  const root = entries.find((entry) => entry.type === 5);
  if (!workbook || !root) throw new Error("Workbook stream was not found");
  if (workbook.size >= miniStreamCutoff) return readChain(buffer, workbook.start, fat, sectorSize).subarray(0, workbook.size);

  const miniFatBytes = readChain(buffer, firstMiniFatSector, fat, sectorSize);
  const miniFat = [];
  for (let offset = 0; offset + 4 <= miniFatBytes.length; offset += 4) miniFat.push(miniFatBytes.readUInt32LE(offset));
  const miniStream = readChain(buffer, root.start, fat, sectorSize).subarray(0, root.size);
  const chunks = [];
  const visited = new Set();
  let sector = workbook.start;
  const miniSectorSize = 1 << buffer.readUInt16LE(32);
  while (sector !== ENDOFCHAIN && sector !== FREESECT && !visited.has(sector)) {
    visited.add(sector);
    chunks.push(miniStream.subarray(sector * miniSectorSize, (sector + 1) * miniSectorSize));
    sector = miniFat[sector];
  }
  return Buffer.concat(chunks).subarray(0, workbook.size);
}

function readBiffString(buffer, offset) {
  const length = buffer.readUInt16LE(offset);
  const flags = buffer[offset + 2];
  let cursor = offset + 3;
  const richRuns = flags & 0x08 ? buffer.readUInt16LE(cursor) : 0;
  if (flags & 0x08) cursor += 2;
  const extensionSize = flags & 0x04 ? buffer.readUInt32LE(cursor) : 0;
  if (flags & 0x04) cursor += 4;
  const unicode = (flags & 0x01) !== 0;
  const byteLength = length * (unicode ? 2 : 1);
  const value = unicode
    ? buffer.subarray(cursor, cursor + byteLength).toString("utf16le")
    : buffer.subarray(cursor, cursor + byteLength).toString("latin1");
  return { value, next: cursor + byteLength + richRuns * 4 + extensionSize };
}

function rkValue(value) {
  const isInteger = (value & 0x02) !== 0;
  const dividedBy100 = (value & 0x01) !== 0;
  let result;
  if (isInteger) {
    result = value >> 2;
  } else {
    const raw = Buffer.alloc(8);
    raw.writeUInt32LE(0, 0);
    raw.writeUInt32LE(value & 0xfffffffc, 4);
    result = raw.readDoubleLE(0);
  }
  return dividedBy100 ? result / 100 : result;
}

function parseSst(records) {
  const start = records.findIndex((record) => record.id === 0x00fc);
  if (start === -1) return [];
  const chunks = [records[start].data];
  for (let index = start + 1; index < records.length && records[index].id === 0x003c; index += 1) chunks.push(records[index].data);
  const data = Buffer.concat(chunks);
  const uniqueCount = data.readUInt32LE(4);
  let cursor = 8;
  const strings = [];
  for (let index = 0; index < uniqueCount && cursor < data.length; index += 1) {
    const item = readBiffString(data, cursor);
    strings.push(item.value);
    cursor = item.next;
  }
  return strings;
}

function recordsFrom(stream, start = 0, end = stream.length) {
  const records = [];
  for (let offset = start; offset + 4 <= end;) {
    const id = stream.readUInt16LE(offset);
    const length = stream.readUInt16LE(offset + 2);
    const next = offset + 4 + length;
    if (next > end) break;
    records.push({ id, data: stream.subarray(offset + 4, next), offset });
    offset = next;
  }
  return records;
}

export function readXls(filePath) {
  const stream = workbookStream(fs.readFileSync(filePath));
  const globals = recordsFrom(stream);
  const strings = parseSst(globals);
  const sheets = [];
  for (const record of globals.filter((item) => item.id === 0x0085)) {
    const start = record.data.readUInt32LE(0);
    const nameLength = record.data[6];
    const unicode = record.data[7] === 1;
    const name = unicode
      ? record.data.subarray(8, 8 + nameLength * 2).toString("utf16le")
      : record.data.subarray(8, 8 + nameLength).toString("latin1");
    const nextSheet = globals
      .filter((item) => item.id === 0x0085)
      .map((item) => item.data.readUInt32LE(0))
      .filter((offset) => offset > start)
      .sort((left, right) => left - right)[0] ?? stream.length;
    const cells = new Map();
    for (const item of recordsFrom(stream, start, nextSheet)) {
      const { data } = item;
      if (item.id === 0x00fd) {
        cells.set(`${data.readUInt16LE(0)}:${data.readUInt16LE(2)}`, strings[data.readUInt32LE(6)] ?? "");
      } else if (item.id === 0x0203) {
        cells.set(`${data.readUInt16LE(0)}:${data.readUInt16LE(2)}`, data.readDoubleLE(6));
      } else if (item.id === 0x027e) {
        cells.set(`${data.readUInt16LE(0)}:${data.readUInt16LE(2)}`, rkValue(data.readUInt32LE(6)));
      } else if (item.id === 0x00bd) {
        const row = data.readUInt16LE(0);
        const firstColumn = data.readUInt16LE(2);
        const lastColumn = data.readUInt16LE(data.length - 2);
        for (let column = firstColumn; column <= lastColumn; column += 1) {
          const rkOffset = 4 + (column - firstColumn) * 6 + 2;
          cells.set(`${row}:${column}`, rkValue(data.readUInt32LE(rkOffset)));
        }
      } else if (item.id === 0x0204) {
        const length = data.readUInt16LE(6);
        cells.set(`${data.readUInt16LE(0)}:${data.readUInt16LE(2)}`, data.subarray(8, 8 + length).toString("latin1"));
      }
    }
    const maxRow = Math.max(...[...cells.keys()].map((key) => Number(key.split(":")[0])), -1);
    const maxColumn = Math.max(...[...cells.keys()].map((key) => Number(key.split(":")[1])), -1);
    const rows = Array.from({ length: maxRow + 1 }, (_, row) => (
      Array.from({ length: maxColumn + 1 }, (_, column) => cells.get(`${row}:${column}`) ?? null)
    ));
    sheets.push({ name, rows });
  }
  return sheets;
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url) {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: node scripts/read_wvs_xls.mjs <file.xls>");
  console.log(JSON.stringify(readXls(file), null, 2));
}
