/** Export an account-owned structured CV without sending it to another service. */
(function () {
  'use strict';

  var table = null;

  function crcTable() {
    if (table) return table;
    table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var value = n;
      for (var bit = 0; bit < 8; bit++) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
      table[n] = value >>> 0;
    }
    return table;
  }

  function crc32(bytes) {
    var crc = 0xffffffff;
    var values = crcTable();
    for (var i = 0; i < bytes.length; i++) crc = values[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function u16(value) {
    return new Uint8Array([value & 255, (value >>> 8) & 255]);
  }

  function u32(value) {
    return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]);
  }

  function join(parts) {
    var size = parts.reduce(function (sum, part) { return sum + part.length; }, 0);
    var output = new Uint8Array(size);
    var offset = 0;
    parts.forEach(function (part) { output.set(part, offset); offset += part.length; });
    return output;
  }

  function zip(files) {
    var encoder = new TextEncoder();
    var localParts = [];
    var centralParts = [];
    var offset = 0;
    files.forEach(function (file) {
      var name = encoder.encode(file.name);
      var data = encoder.encode(file.content);
      var crc = crc32(data);
      var local = join([u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data]);
      localParts.push(local);
      centralParts.push(join([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
      offset += local.length;
    });
    var central = join(centralParts);
    return join(localParts.concat([central, join([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(central.length), u32(offset), u16(0)])]));
  }

  function xml(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function paragraph(text, style) {
    var properties = style ? '<w:pPr><w:pStyle w:val="' + style + '"/></w:pPr>' : '';
    return '<w:p>' + properties + '<w:r><w:t xml:space="preserve">' + xml(text) + '</w:t></w:r></w:p>';
  }

  function documentXml(cv) {
    var body = [];
    body.push(paragraph(cv.name || 'Curriculum Vitae', 'Title'));
    if (cv.contact) body.push(paragraph(cv.contact));
    if (cv.headline) body.push(paragraph(cv.headline, 'Subtitle'));
    if (cv.summary) { body.push(paragraph('PROFILE', 'Heading1')); body.push(paragraph(cv.summary)); }
    if (cv.skills && cv.skills.length) { body.push(paragraph('SKILLS', 'Heading1')); body.push(paragraph(cv.skills.join(' · '))); }
    if (cv.experience && cv.experience.length) {
      body.push(paragraph('EXPERIENCE', 'Heading1'));
      cv.experience.forEach(function (item) {
        body.push(paragraph([item.title, item.company, item.dates].filter(Boolean).join(' · '), 'Heading2'));
        (item.bullets || []).forEach(function (bullet) { body.push(paragraph('• ' + bullet)); });
      });
    }
    if (cv.education && cv.education.length) {
      body.push(paragraph('EDUCATION', 'Heading1'));
      cv.education.forEach(function (item) { body.push(paragraph([item.qualification, item.institution, item.dates].filter(Boolean).join(' · '))); });
    }
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body.join('') + '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr></w:body></w:document>';
  }

  function exportDocx(cv, filename) {
    var files = [
      { name: '[Content_Types].xml', content: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>' },
      { name: '_rels/.rels', content: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
      { name: 'word/document.xml', content: documentXml(cv || {}) },
    ];
    var blob = new Blob([zip(files)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = (filename || 'codeology-cv').replace(/[^A-Za-z0-9._-]+/g, '-') + '.docx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }

  window.CodeologyCVExport = Object.freeze({ exportDocx: exportDocx, _zip: zip });
}());
