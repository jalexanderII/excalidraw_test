import {
  COLOR_PALETTE,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  FONT_FAMILY,
  FONT_SIZES,
  VERTICAL_ALIGN,
  getFontString,
  getLineHeight,
  randomId,
} from "@excalidraw/common";

import { measureText, newElement, newTextElement } from "@excalidraw/element";

import type { ChartElements } from "./charts.types";

const TABLE_MIN_COL_WIDTH = 60;
const TABLE_MAX_COL_WIDTH = 280;
const TABLE_CELL_PADDING = 12;
const TABLE_STROKE_WIDTH = 1;

const tableProps = {
  fillStyle: "solid" as const,
  opacity: 100,
  roughness: 0,
  roundness: null,
  strokeStyle: "solid" as const,
  strokeWidth: TABLE_STROKE_WIDTH,
  strokeColor: COLOR_PALETTE.black,
  locked: false,
};

export const parseCSVTable = (text: string): string[][] | null => {
  const parseDelimitedLines = (delimiter: "\t" | "," | ";") =>
    text
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => line.split(delimiter).map((cell) => cell.trim()));

  const candidates = (["\t", ",", ";"] as const).map((delimiter) => {
    const parsed = parseDelimitedLines(delimiter);
    const numCols = parsed[0]?.length ?? 0;
    const isConsistent =
      parsed.length > 0 && parsed.every((line) => line.length === numCols);
    return { delimiter, parsed, numCols, isConsistent };
  });

  const best =
    candidates.find((c) => c.isConsistent && c.numCols > 1) ??
    candidates.find((c) => c.isConsistent) ??
    candidates[0];

  const lines = best.parsed;

  if (lines.length < 2) {
    return null;
  }

  const numCols = lines[0].length;
  if (numCols < 2) {
    return null;
  }

  const isConsistent = lines.every((line) => line.length === numCols);
  if (!isConsistent) {
    return null;
  }

  return lines;
};

export const renderTable = (
  cells: string[][],
  x: number,
  y: number,
): ChartElements => {
  const numRows = cells.length;
  const numCols = cells[0].length;
  const groupId = randomId();

  const headerFontFamily = FONT_FAMILY["Lilita One"];
  const headerFontSize = FONT_SIZES.sm;
  const headerLineHeight = getLineHeight(headerFontFamily);
  const headerFontString = getFontString({
    fontFamily: headerFontFamily,
    fontSize: headerFontSize,
  });

  const bodyFontFamily = DEFAULT_FONT_FAMILY;
  const bodyFontSize = DEFAULT_FONT_SIZE;
  const bodyLineHeight = getLineHeight(bodyFontFamily);
  const bodyFontString = getFontString({
    fontFamily: bodyFontFamily,
    fontSize: bodyFontSize,
  });

  const colWidths: number[] = [];
  for (let col = 0; col < numCols; col++) {
    let maxW = 0;
    for (let row = 0; row < numRows; row++) {
      const text = cells[row][col] || "";
      const isHeader = row === 0;
      const fontString = isHeader ? headerFontString : bodyFontString;
      const lineHeight = isHeader ? headerLineHeight : bodyLineHeight;
      const metrics = measureText(text, fontString, lineHeight);
      maxW = Math.max(maxW, metrics.width);
    }
    colWidths[col] = Math.min(
      TABLE_MAX_COL_WIDTH,
      Math.max(TABLE_MIN_COL_WIDTH, maxW + TABLE_CELL_PADDING * 2),
    );
  }

  const rowHeights: number[] = [];
  for (let row = 0; row < numRows; row++) {
    let maxH = 0;
    for (let col = 0; col < numCols; col++) {
      const text = cells[row][col] || "";
      const isHeader = row === 0;
      const fontString = isHeader ? headerFontString : bodyFontString;
      const lineHeight = isHeader ? headerLineHeight : bodyLineHeight;
      const metrics = measureText(text, fontString, lineHeight);
      maxH = Math.max(maxH, metrics.height);
    }
    rowHeights[row] = maxH + TABLE_CELL_PADDING * 2;
  }

  const elements: ChartElements[number][] = [];

  let currentY = y;
  for (let row = 0; row < numRows; row++) {
    let currentX = x;
    const isHeader = row === 0;
    for (let col = 0; col < numCols; col++) {
      const cellText = cells[row][col] || "";

      const rect = newElement({
        type: "rectangle",
        ...tableProps,
        x: currentX,
        y: currentY,
        width: colWidths[col],
        height: rowHeights[row],
        backgroundColor: isHeader
          ? COLOR_PALETTE.blue[3]
          : COLOR_PALETTE.transparent,
        groupIds: [groupId],
      });

      const textEl = newTextElement({
        ...tableProps,
        text: cellText,
        originalText: cellText,
        x: currentX + TABLE_CELL_PADDING,
        y: currentY + TABLE_CELL_PADDING,
        fontFamily: isHeader ? headerFontFamily : bodyFontFamily,
        fontSize: isHeader ? headerFontSize : bodyFontSize,
        lineHeight: isHeader ? headerLineHeight : bodyLineHeight,
        textAlign: "left",
        verticalAlign: VERTICAL_ALIGN.MIDDLE,
        strokeColor: isHeader ? COLOR_PALETTE.white : COLOR_PALETTE.black,
        backgroundColor: "transparent",
        groupIds: [groupId],
      });

      elements.push(rect, textEl);
      currentX += colWidths[col];
    }
    currentY += rowHeights[row];
  }

  return elements;
};
