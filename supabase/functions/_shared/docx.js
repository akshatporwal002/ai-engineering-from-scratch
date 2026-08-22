const MAX_ENTRY_BYTES = 8 * 1024 * 1024;

function u16(view, offset) {
  return view.getUint16(offset, true);
}
function u32(view, offset) {
  return view.getUint32(offset, true);
}

function findEndOfCentralDirectory(view) {
  var lower = Math.max(0, view.byteLength - 65557);
  for (var offset = view.byteLength - 22; offset >= lower; offset -= 1) {
    if (u32(view, offset) === 0x06054b50) return offset;
  }
  throw new Error('docx_invalid_zip');
}

async function inflate(bytes) {
  var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function xmlText(xml) {
  return xml
    .replace(/<w:tab\s*\/>/g, '\t')
    .replace(/<w:(?:br|cr)\s*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractDocxText(input) {
  var bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.byteLength < 22 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('docx_invalid_zip');
  var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  var end = findEndOfCentralDirectory(view);
  var entries = u16(view, end + 10);
  var centralOffset = u32(view, end + 16);
  var decoder = new TextDecoder();
  var offset = centralOffset;

  for (var index = 0; index < entries; index += 1) {
    if (offset + 46 > view.byteLength || u32(view, offset) !== 0x02014b50) throw new Error('docx_invalid_directory');
    var flags = u16(view, offset + 8);
    var method = u16(view, offset + 10);
    var compressedSize = u32(view, offset + 20);
    var uncompressedSize = u32(view, offset + 24);
    var nameLength = u16(view, offset + 28);
    var extraLength = u16(view, offset + 30);
    var commentLength = u16(view, offset + 32);
    var localOffset = u32(view, offset + 42);
    var name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;
    if (name !== 'word/document.xml') continue;
    if ((flags & 1) !== 0) throw new Error('docx_encrypted');
    if (compressedSize > MAX_ENTRY_BYTES || uncompressedSize > MAX_ENTRY_BYTES) throw new Error('docx_too_large');
    if (localOffset + 30 > view.byteLength || u32(view, localOffset) !== 0x04034b50) throw new Error('docx_invalid_entry');
    var localNameLength = u16(view, localOffset + 26);
    var localExtraLength = u16(view, localOffset + 28);
    var dataStart = localOffset + 30 + localNameLength + localExtraLength;
    var dataEnd = dataStart + compressedSize;
    if (dataEnd > view.byteLength) throw new Error('docx_invalid_entry');
    var compressed = bytes.subarray(dataStart, dataEnd);
    var documentBytes;
    if (method === 0) documentBytes = compressed;
    else if (method === 8) documentBytes = await inflate(compressed);
    else throw new Error('docx_unsupported_compression');
    if (documentBytes.byteLength > MAX_ENTRY_BYTES) throw new Error('docx_too_large');
    var text = xmlText(decoder.decode(documentBytes));
    if (text.length < 120) throw new Error('docx_not_enough_text');
    return text.slice(0, 100000);
  }
  throw new Error('docx_document_missing');
}
