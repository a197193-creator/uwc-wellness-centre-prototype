(function (root) {
  'use strict';

  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN = 42;
  const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
  const BOTTOM_LIMIT = 765;
  const colours = {
    pine: [0.071, 0.310, 0.275],
    teal: [0.157, 0.486, 0.408],
    lime: [0.851, 0.929, 0.671],
    ink: [0.125, 0.239, 0.216],
    muted: [0.384, 0.451, 0.424],
    ivory: [0.980, 0.976, 0.961],
    mint: [0.929, 0.961, 0.929],
    amber: [0.973, 0.886, 0.686],
    amberInk: [0.416, 0.278, 0.063],
    white: [1, 1, 1],
    line: [0.843, 0.886, 0.863]
  };

  function number(value) {
    return Number(value.toFixed(2)).toString();
  }

  function cleanText(value) {
    return String(value == null ? '' : value)
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\u2026/g, '...')
      .replace(/\u2022/g, '-')
      .replace(/\u00E0 la carte/gi, 'a la carte')
      .normalize('NFKD')
      .replace(/[^\x20-\x7E]/g, '');
  }

  function pdfText(value) {
    return cleanText(value).replace(/([\\()])/g, '\\$1');
  }

  function colour(value, stroke) {
    return value.map(number).join(' ') + (stroke ? ' RG' : ' rg');
  }

  function estimatedWidth(value, size, bold) {
    let units = 0;
    for (const character of cleanText(value)) {
      if (' ilI.,:;!|\''.includes(character)) units += 0.25;
      else if ('MW@%&Q'.includes(character)) units += 0.88;
      else if (character === ' ') units += 0.28;
      else if (/[A-Z0-9]/.test(character)) units += 0.60;
      else units += 0.50;
    }
    return units * size * (bold ? 1.04 : 1);
  }

  function wrap(value, width, size, bold) {
    const words = cleanText(value).trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [''];
    const lines = [];
    let line = '';
    words.forEach(function (word) {
      const candidate = line ? line + ' ' + word : word;
      if (line && estimatedWidth(candidate, size, bold) > width) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function money(value) {
    return 'RM' + Number(value || 0).toLocaleString('en-MY', { maximumFractionDigits: 0 });
  }

  function rectangle(commands, x, top, width, height, fill, stroke, lineWidth) {
    commands.push('q');
    if (fill) commands.push(colour(fill, false));
    if (stroke) commands.push(colour(stroke, true), number(lineWidth || 1) + ' w');
    commands.push([number(x), number(PAGE_HEIGHT - top - height), number(width), number(height), 're', fill && stroke ? 'B' : fill ? 'f' : 'S'].join(' '));
    commands.push('Q');
  }

  function line(commands, x1, top1, x2, top2, stroke, lineWidth) {
    commands.push('q', colour(stroke, true), number(lineWidth || 1) + ' w', number(x1) + ' ' + number(PAGE_HEIGHT - top1) + ' m ' + number(x2) + ' ' + number(PAGE_HEIGHT - top2) + ' l S', 'Q');
  }

  function circle(commands, centreX, centreTop, radius, fill) {
    const k = 0.5522847498 * radius;
    const y = PAGE_HEIGHT - centreTop;
    commands.push('q', colour(fill, false),
      number(centreX + radius) + ' ' + number(y) + ' m',
      number(centreX + radius) + ' ' + number(y + k) + ' ' + number(centreX + k) + ' ' + number(y + radius) + ' ' + number(centreX) + ' ' + number(y + radius) + ' c',
      number(centreX - k) + ' ' + number(y + radius) + ' ' + number(centreX - radius) + ' ' + number(y + k) + ' ' + number(centreX - radius) + ' ' + number(y) + ' c',
      number(centreX - radius) + ' ' + number(y - k) + ' ' + number(centreX - k) + ' ' + number(y - radius) + ' ' + number(centreX) + ' ' + number(y - radius) + ' c',
      number(centreX + k) + ' ' + number(y - radius) + ' ' + number(centreX + radius) + ' ' + number(y - k) + ' ' + number(centreX + radius) + ' ' + number(y) + ' c f', 'Q');
  }

  function text(commands, value, x, top, options) {
    const settings = Object.assign({ size: 10, bold: false, fill: colours.ink, align: 'left' }, options || {});
    let drawX = x;
    const width = estimatedWidth(value, settings.size, settings.bold);
    if (settings.align === 'right') drawX -= width;
    if (settings.align === 'centre') drawX -= width / 2;
    commands.push('BT', '/' + (settings.bold ? 'F2' : 'F1') + ' ' + number(settings.size) + ' Tf', colour(settings.fill, false), '1 0 0 1 ' + number(drawX) + ' ' + number(PAGE_HEIGHT - top - settings.size) + ' Tm', '(' + pdfText(value) + ') Tj', 'ET');
  }

  function wrappedText(commands, value, x, top, width, options) {
    const settings = Object.assign({ size: 9, lineHeight: 12, bold: false, fill: colours.ink }, options || {});
    const lines = wrap(value, width, settings.size, settings.bold);
    lines.forEach(function (entry, index) {
      text(commands, entry, x, top + (index * settings.lineHeight), settings);
    });
    return { lines: lines, height: lines.length * settings.lineHeight };
  }

  function createPdf(pages) {
    const objects = [];
    const addObject = function (body) {
      objects.push(body);
      return objects.length;
    };
    const catalogueId = addObject('');
    const pagesId = addObject('');
    const regularFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const boldFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const pageIds = [];

    pages.forEach(function (commands) {
      const stream = commands.join('\n') + '\n';
      const streamId = addObject('<< /Length ' + stream.length + ' >>\nstream\n' + stream + 'endstream');
      const pageId = addObject('<< /Type /Page /Parent ' + pagesId + ' 0 R /MediaBox [0 0 ' + number(PAGE_WIDTH) + ' ' + number(PAGE_HEIGHT) + '] /Resources << /Font << /F1 ' + regularFontId + ' 0 R /F2 ' + boldFontId + ' 0 R >> >> /Contents ' + streamId + ' 0 R >>');
      pageIds.push(pageId);
    });
    objects[catalogueId - 1] = '<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>';
    objects[pagesId - 1] = '<< /Type /Pages /Kids [' + pageIds.map(function (id) { return id + ' 0 R'; }).join(' ') + '] /Count ' + pageIds.length + ' >>';

    let output = '%PDF-1.4\n% UWC screening plan\n';
    const offsets = [0];
    objects.forEach(function (body, index) {
      offsets.push(output.length);
      output += (index + 1) + ' 0 obj\n' + body + '\nendobj\n';
    });
    const xrefOffset = output.length;
    output += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
    offsets.slice(1).forEach(function (offset) {
      output += String(offset).padStart(10, '0') + ' 00000 n \n';
    });
    output += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root ' + catalogueId + ' 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF';
    return new Blob([new TextEncoder().encode(output)], { type: 'application/pdf' });
  }

  function createPlanPdf(summary, dateLabel) {
    if (!summary || !Array.isArray(summary.items)) throw new Error('A valid screening-plan summary is required.');
    const pages = [];
    let commands;
    let cursor;

    function drawBrandHeader(firstPage) {
      commands = [];
      pages.push(commands);
      if (firstPage) {
        rectangle(commands, 0, 0, PAGE_WIDTH, 116, colours.pine);
        rectangle(commands, 0, 0, 9, 116, colours.lime);
        circle(commands, 59, 45, 20, colours.lime);
        circle(commands, 59, 45, 8, colours.teal);
        text(commands, 'UWC.', 91, 24, { size: 23, bold: true, fill: colours.white });
        text(commands, 'UMBI WELLNESS CENTRE', 92, 53, { size: 8, bold: true, fill: colours.lime });
        text(commands, 'REVIEW SUMMARY', PAGE_WIDTH - MARGIN, 26, { size: 8, bold: true, fill: colours.lime, align: 'right' });
        text(commands, 'Screening plan', PAGE_WIDTH - MARGIN, 42, { size: 20, bold: true, fill: colours.white, align: 'right' });
        rectangle(commands, PAGE_WIDTH - 156, 78, 114, 22, colours.white);
        text(commands, 'PROTOTYPE REVIEW', PAGE_WIDTH - 99, 84, { size: 7.5, bold: true, fill: colours.pine, align: 'centre' });
        cursor = 135;
      } else {
        rectangle(commands, 0, 0, PAGE_WIDTH, 66, colours.pine);
        rectangle(commands, 0, 0, 9, 66, colours.lime);
        text(commands, 'UWC.', MARGIN, 19, { size: 18, bold: true, fill: colours.white });
        text(commands, 'SCREENING PLAN - CONTINUED', PAGE_WIDTH - MARGIN, 22, { size: 8, bold: true, fill: colours.lime, align: 'right' });
        cursor = 88;
      }
    }

    function ensureSpace(height) {
      if (cursor + height > BOTTOM_LIMIT) drawBrandHeader(false);
    }

    function drawMetric(x, width, label, value, emphasis) {
      rectangle(commands, x, cursor, width, 59, emphasis ? colours.mint : colours.ivory, colours.line, 0.8);
      text(commands, label, x + 13, cursor + 11, { size: 7, bold: true, fill: colours.teal });
      text(commands, value, x + 13, cursor + 29, { size: emphasis ? 17 : 15, bold: true, fill: colours.ink });
    }

    drawBrandHeader(true);
    text(commands, 'Prepared ' + cleanText(dateLabel || new Date().toLocaleDateString('en-MY')), MARGIN, cursor, { size: 8.5, fill: colours.muted });
    text(commands, 'A clear record of the screening options selected for discussion.', PAGE_WIDTH - MARGIN, cursor, { size: 8.5, fill: colours.muted, align: 'right' });
    cursor += 24;
    const metricGap = 9;
    const metricWidth = (CONTENT_WIDTH - (metricGap * 2)) / 3;
    drawMetric(MARGIN, metricWidth, 'SELECTED ITEMS', String(summary.count || summary.items.length), false);
    drawMetric(MARGIN + metricWidth + metricGap, metricWidth, 'INDICATIVE TOTAL', money(summary.subtotal), true);
    drawMetric(MARGIN + ((metricWidth + metricGap) * 2), metricWidth, 'STATUS', 'Review only', false);
    cursor += 83;
    text(commands, 'YOUR SELECTED SCREENING PLAN', MARGIN, cursor, { size: 8, bold: true, fill: colours.teal });
    cursor += 21;

    summary.items.forEach(function (item, index) {
      const nameLines = wrap(item.name, 315, 12, true);
      const noteLines = item.note ? wrap(item.note, CONTENT_WIDTH - 70, 8.5, false) : [];
      const cardHeight = Math.max(68, 26 + (nameLines.length * 15) + (noteLines.length * 11));
      ensureSpace(cardHeight + 10);
      rectangle(commands, MARGIN, cursor, CONTENT_WIDTH, cardHeight, colours.ivory, colours.line, 0.75);
      rectangle(commands, MARGIN, cursor, 5, cardHeight, item.kind === 'package' ? colours.teal : colours.lime);
      circle(commands, MARGIN + 25, cursor + 24, 12, item.kind === 'package' ? colours.teal : colours.lime);
      text(commands, String(index + 1).padStart(2, '0'), MARGIN + 25, cursor + 18.5, { size: 8, bold: true, fill: item.kind === 'package' ? colours.white : colours.pine, align: 'centre' });
      text(commands, item.kind === 'package' ? 'PRECISION SCREENING PACKAGE' : 'INDIVIDUAL SCREENING COMPONENT', MARGIN + 47, cursor + 10, { size: 6.5, bold: true, fill: colours.teal });
      nameLines.forEach(function (entry, lineIndex) {
        text(commands, entry, MARGIN + 47, cursor + 24 + (lineIndex * 15), { size: 12, bold: true, fill: colours.ink });
      });
      text(commands, money(item.price), PAGE_WIDTH - MARGIN - 14, cursor + 18, { size: 13, bold: true, fill: colours.pine, align: 'right' });
      if (item.provisional) text(commands, 'WORKING PRICE', PAGE_WIDTH - MARGIN - 14, cursor + 38, { size: 6.5, bold: true, fill: colours.amberInk, align: 'right' });
      noteLines.forEach(function (entry, lineIndex) {
        text(commands, entry, MARGIN + 47, cursor + 29 + (nameLines.length * 15) + (lineIndex * 11), { size: 8.5, fill: colours.muted });
      });
      cursor += cardHeight + 10;
    });

    if (summary.warnings && summary.warnings.length) {
      ensureSpace(48);
      text(commands, 'IMPORTANT REVIEW NOTES', MARGIN, cursor + 1, { size: 8, bold: true, fill: colours.amberInk });
      cursor += 19;
      summary.warnings.forEach(function (warning) {
        const lines = wrap(warning, CONTENT_WIDTH - 40, 8.5, false);
        const noteHeight = Math.max(38, 17 + (lines.length * 11));
        ensureSpace(noteHeight + 7);
        rectangle(commands, MARGIN, cursor, CONTENT_WIDTH, noteHeight, colours.amber);
        circle(commands, MARGIN + 18, cursor + 19, 8, colours.white);
        text(commands, '!', MARGIN + 18, cursor + 13.5, { size: 8, bold: true, fill: colours.amberInk, align: 'centre' });
        lines.forEach(function (entry, lineIndex) {
          text(commands, entry, MARGIN + 35, cursor + 11 + (lineIndex * 11), { size: 8.5, fill: colours.amberInk });
        });
        cursor += noteHeight + 7;
      });
      cursor += 7;
    }

    ensureSpace(151);
    rectangle(commands, MARGIN, cursor, CONTENT_WIDTH, 72, colours.pine);
    text(commands, 'INDICATIVE TOTAL', MARGIN + 18, cursor + 17, { size: 8, bold: true, fill: colours.lime });
    text(commands, money(summary.subtotal), MARGIN + 18, cursor + 33, { size: 22, bold: true, fill: colours.white });
    text(commands, 'Proposed figures - subject to UWC confirmation', PAGE_WIDTH - MARGIN - 18, cursor + 30, { size: 8, fill: colours.white, align: 'right' });
    cursor += 84;
    rectangle(commands, MARGIN, cursor, CONTENT_WIDTH, 58, colours.mint);
    text(commands, 'WHAT HAPPENS NEXT?', MARGIN + 15, cursor + 11, { size: 7, bold: true, fill: colours.teal });
    wrappedText(commands, 'This PDF is a review summary only. No appointment, order or payment has been created, and nothing has been sent to UWC. Screening suitability should be discussed with a qualified healthcare professional.', MARGIN + 15, cursor + 25, CONTENT_WIDTH - 30, { size: 8.3, lineHeight: 10.5, fill: colours.ink });

    pages.forEach(function (page, pageIndex) {
      line(page, MARGIN, 790, PAGE_WIDTH - MARGIN, 790, colours.line, 0.7);
      text(page, 'UMBI WELLNESS CENTRE  /  SCREENING PLAN PROTOTYPE', MARGIN, 801, { size: 6.8, bold: true, fill: colours.muted });
      text(page, 'Page ' + (pageIndex + 1) + ' of ' + pages.length, PAGE_WIDTH - MARGIN, 801, { size: 7, bold: true, fill: colours.muted, align: 'right' });
    });

    return createPdf(pages);
  }

  const api = Object.freeze({ createPlanPdf: createPlanPdf });
  if (root) root.UWCPdf = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof window !== 'undefined' ? window : null));
