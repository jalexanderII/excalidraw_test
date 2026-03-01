import {
  COLOR_PALETTE,
  DEFAULT_FONT_FAMILY,
  FONT_FAMILY,
  getFontString,
  getLineHeight,
  randomId,
} from "@excalidraw/common";

import { measureText, newElement, newTextElement } from "@excalidraw/element";

import type { ChartElements } from "./charts.types";

const TABLE_CELL_PAD_X = 12;
const TABLE_CELL_PAD_Y = 8;
const TABLE_MIN_COL_WIDTH = 60;
const TABLE_MAX_COL_WIDTH = 280;
const TABLE_FONT_SIZE = 16;

const HEADER_BG = COLOR_PALETTE.blue[1]; // #a5d8ff
const HEADER_FONT = FONT_FAMILY["Lilita One"];
const BODY_BG = COLOR_PALETTE.transparent;
const BODY_FONT = DEFAULT_FONT_FAMILY;

/**
 * Parses delimiter-separated text into a 2D string grid.
 * Unlike tryParseSpreadsheet, does NOT require numeric values.
 * Returns null if fewer than 2 rows or fewer than 2 columns.
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

  if (lines.length < 2 || (lines[0]?.length ?? 0) < 2) {
    return null;
  }

  const numCols = lines[0].length;
  if (!lines.every((line) => line.length === numCols)) {
    return null;
  }

  return lines;
};

/**
 * Creates Excalidraw elements forming a visual table from a 2D string grid.
 * Row 0 is treated as the header row with distinct styling.
 * All elements share a groupId so the table moves as one unit.
 */
export const renderTable = (
  cells: string[][],
  x: number,
  y: number,
): ChartElements => {
  const numRows = cells.length;
  const numCols = cells[0].length;
  const groupId = randomId();

  const headerLineHeight = getLineHeight(HEADER_FONT);
  const headerFontStr = getFontString({
    fontFamily: HEADER_FONT,
    fontSize: TABLE_FONT_SIZE,
  });
  const bodyLineHeight = getLineHeight(BODY_FONT);
  const bodyFontStr = getFontString({
    fontFamily: BODY_FONT,
    fontSize: TABLE_FONT_SIZE,
  });

  const colWidths: number[] = new Array(numCols).fill(TABLE_MIN_COL_WIDTH);
  const rowHeights: number[] = new Array(numRows).fill(0);

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const isHeader = r === 0;
      const fontStr = isHeader ? headerFontStr : bodyFontStr;
      const lh = isHeader ? headerLineHeight : bodyLineHeight;
      const m = measureText(cells[r][c], fontStr, lh);
      const cellW = m.width + TABLE_CELL_PAD_X * 2;
      const cellH = m.height + TABLE_CELL_PAD_Y * 2;
      colWidths[c] = Math.min(
        TABLE_MAX_COL_WIDTH,
        Math.max(colWidths[c], cellW),
      );
      rowHeights[r] = Math.max(rowHeights[r], cellH);
    }
  }

  const tableProps = {
    roughness: 0,
    strokeStyle: "solid" as const,
    strokeWidth: 1,
    strokeColor: COLOR_PALETTE.black,
    opacity: 100,
    locked: false,
    roundness: null,
  };

  const elements: ChartElements[number][] = [];

  let curY = y;
  for (let r = 0; r < numRows; r++) {
    let curX = x;
    const isHeader = r === 0;

    for (let c = 0; c < numCols; c++) {
      const w = colWidths[c];
      const h = rowHeights[r];

      const rect = newElement({
        type: "rectangle",
        ...tableProps,
        x: curX,
        y: curY,
        width: w,
        height: h,
        backgroundColor: isHeader ? HEADER_BG : BODY_BG,
        fillStyle: isHeader ? "solid" : "solid",
        groupIds: [groupId],
      });

      const txt = newTextElement({
        text: cells[r][c],
        ...tableProps,
        x: curX + w / 2,
        y: curY + h / 2,
        fontSize: TABLE_FONT_SIZE,
        fontFamily: isHeader ? HEADER_FONT : BODY_FONT,
        textAlign: "center",
        verticalAlign: "middle",
        strokeColor: isHeader ? COLOR_PALETTE.white : COLOR_PALETTE.black,
        backgroundColor: "transparent",
        groupIds: [groupId],
      });

      elements.push(rect, txt);
      curX += w;
    }
    curY += rowHeights[r];
  }

  return elements;
};
