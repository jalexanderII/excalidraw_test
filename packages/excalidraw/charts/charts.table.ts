import {
  COLOR_PALETTE,
  DEFAULT_FONT_FAMILY,
  FONT_FAMILY,
  FONT_SIZES,
  ROUGHNESS,
  VERTICAL_ALIGN,
  getFontString,
  getLineHeight,
  randomId,
} from "@excalidraw/common";

import { measureText, newElement, newTextElement } from "@excalidraw/element";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import type { ChartElements } from "./charts.types";

const TABLE_CELL_PADDING_X = 16;
const TABLE_CELL_PADDING_Y = 10;
const TABLE_MIN_COL_WIDTH = 60;
const TABLE_MAX_COL_WIDTH = 280;

const TABLE_HEADER_BG = COLOR_PALETTE.blue[1];
const TABLE_CELL_BG = "transparent";

const tableProps = {
  opacity: 100,
  roughness: ROUGHNESS.architect,
  strokeColor: COLOR_PALETTE.black,
  strokeStyle: "solid",
  strokeWidth: 1,
  locked: false,
} as const;

/**
 * Parse delimiter-separated text into a 2D string grid.
 * Uses the same delimiter-scoring heuristic as tryParseSpreadsheet
 * (tab > comma > semicolon, prefer consistent column counts)
 * but does NOT require numeric values.
 *
 * Returns null when the text doesn't look like tabular data
 * (fewer than 2 rows, fewer than 2 columns, or inconsistent column counts).
 */
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

  if (lines.length < 2 || best.numCols < 2) {
    return null;
  }

  const numCols = lines[0].length;
  if (!lines.every((line) => line.length === numCols)) {
    return null;
  }

  return lines;
};

/**
 * Render a 2D string grid as a visual table composed of
 * rectangle + text element pairs. The first row is treated as a header
 * with a distinct background. All elements share a groupId.
 */
export const renderTable = (
  cells: string[][],
  x: number,
  y: number,
): ChartElements => {
  const numRows = cells.length;
  const numCols = cells[0].length;

  const bodyFontFamily = DEFAULT_FONT_FAMILY;
  const bodyFontSize = FONT_SIZES.md;
  const headerFontFamily = FONT_FAMILY["Lilita One"];
  const headerFontSize = FONT_SIZES.md;

  const bodyLineHeight = getLineHeight(bodyFontFamily);
  const headerLineHeight = getLineHeight(headerFontFamily);
  const bodyFontString = getFontString({
    fontFamily: bodyFontFamily,
    fontSize: bodyFontSize,
  });
  const headerFontString = getFontString({
    fontFamily: headerFontFamily,
    fontSize: headerFontSize,
  });

  // Measure each column's max text width
  const colWidths: number[] = new Array(numCols).fill(TABLE_MIN_COL_WIDTH);

  for (let col = 0; col < numCols; col++) {
    for (let row = 0; row < numRows; row++) {
      const isHeader = row === 0;
      const font = isHeader ? headerFontString : bodyFontString;
      const lh = isHeader ? headerLineHeight : bodyLineHeight;
      const metrics = measureText(cells[row][col], font, lh);
      const needed = metrics.width + TABLE_CELL_PADDING_X * 2;
      colWidths[col] = Math.min(
        TABLE_MAX_COL_WIDTH,
        Math.max(colWidths[col], needed),
      );
    }
  }

  // Compute row heights
  const rowHeights: number[] = [];
  for (let row = 0; row < numRows; row++) {
    const isHeader = row === 0;
    const font = isHeader ? headerFontString : bodyFontString;
    const lh = isHeader ? headerLineHeight : bodyLineHeight;
    let maxHeight = 0;
    for (let col = 0; col < numCols; col++) {
      const metrics = measureText(cells[row][col], font, lh);
      maxHeight = Math.max(maxHeight, metrics.height);
    }
    rowHeights.push(maxHeight + TABLE_CELL_PADDING_Y * 2);
  }

  const groupId = randomId();
  const elements: NonDeletedExcalidrawElement[] = [];

  let cellY = y;
  for (let row = 0; row < numRows; row++) {
    const isHeader = row === 0;
    let cellX = x;

    for (let col = 0; col < numCols; col++) {
      const w = colWidths[col];
      const h = rowHeights[row];

      const rect = newElement({
        type: "rectangle",
        x: cellX,
        y: cellY,
        width: w,
        height: h,
        backgroundColor: isHeader ? TABLE_HEADER_BG : TABLE_CELL_BG,
        fillStyle: isHeader ? "solid" : "hachure",
        roundness: null,
        groupIds: [groupId],
        ...tableProps,
      });

      const textEl = newTextElement({
        x: cellX + TABLE_CELL_PADDING_X,
        y: cellY + TABLE_CELL_PADDING_Y,
        text: cells[row][col],
        fontFamily: isHeader ? headerFontFamily : bodyFontFamily,
        fontSize: isHeader ? headerFontSize : bodyFontSize,
        lineHeight: isHeader ? headerLineHeight : bodyLineHeight,
        textAlign: "left",
        verticalAlign: VERTICAL_ALIGN.TOP,
        groupIds: [groupId],
        ...tableProps,
        strokeColor: isHeader ? COLOR_PALETTE.white : COLOR_PALETTE.black,
        roundness: null,
      });

      elements.push(rect, textEl);
      cellX += w;
    }

    cellY += rowHeights[row];
  }

  return elements;
};
