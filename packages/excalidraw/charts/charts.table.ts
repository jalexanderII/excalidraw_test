import {
  COLOR_PALETTE,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  FONT_FAMILY,
  getFontString,
  getLineHeight,
  ROUGHNESS,
  VERTICAL_ALIGN,
  randomId,
} from "@excalidraw/common";
import { clamp } from "@excalidraw/math";

import {
  measureText,
  newElement,
  newTextElement,
  wrapText,
} from "@excalidraw/element";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import type { ChartElements } from "./charts.types";

const TABLE_CELL_HORIZONTAL_PADDING = 12;
const TABLE_CELL_VERTICAL_PADDING = 8;
const TABLE_MIN_COL_WIDTH = 60;
const TABLE_MAX_COL_WIDTH = 280;
const TABLE_MIN_ROW_HEIGHT = 36;

const tableProps = {
  fillStyle: "solid",
  fontFamily: DEFAULT_FONT_FAMILY,
  fontSize: DEFAULT_FONT_SIZE,
  opacity: 100,
  roughness: ROUGHNESS.architect,
  roundness: null,
  strokeColor: COLOR_PALETTE.black,
  strokeStyle: "solid",
  strokeWidth: 1,
  verticalAlign: VERTICAL_ALIGN.MIDDLE,
  locked: false,
} as const;

const parseDelimitedLines = (text: string, delimiter: "\t" | "," | ";") =>
  text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(delimiter).map((cell) => cell.trim()));

export const parseCSVTable = (text: string): string[][] | null => {
  const candidates = (["\t", ",", ";"] as const).map((delimiter) => {
    const parsed = parseDelimitedLines(text, delimiter);
    const numCols = parsed[0]?.length ?? 0;
    const isConsistent =
      parsed.length > 0 && parsed.every((line) => line.length === numCols);
    return { parsed, numCols, isConsistent };
  });

  const best =
    candidates.find(
      (candidate) => candidate.isConsistent && candidate.numCols > 1,
    ) ??
    candidates.find((candidate) => candidate.isConsistent) ??
    candidates[0];

  const lines = best?.parsed ?? [];

  if (lines.length < 2) {
    return null;
  }

  const numCols = lines[0]?.length ?? 0;
  if (numCols < 2) {
    return null;
  }

  if (!lines.every((line) => line.length === numCols)) {
    return null;
  }

  return lines;
};

const getCellTextStyle = (rowIndex: number) => {
  const fontFamily =
    rowIndex === 0 ? FONT_FAMILY["Lilita One"] : DEFAULT_FONT_FAMILY;
  const lineHeight = getLineHeight(fontFamily);
  const fontString = getFontString({ fontFamily, fontSize: DEFAULT_FONT_SIZE });
  const strokeColor =
    rowIndex === 0 ? COLOR_PALETTE.white : COLOR_PALETTE.black;

  return {
    fontFamily,
    lineHeight,
    fontString,
    strokeColor,
  };
};

const getDisplayCellText = (
  text: string,
  fontString: ReturnType<typeof getFontString>,
  lineHeight: ReturnType<typeof getLineHeight>,
  maxWidth: number,
) => {
  const value = text.length > 0 ? text : " ";
  if (measureText(value, fontString, lineHeight).width <= maxWidth) {
    return value;
  }
  return wrapText(value, fontString, maxWidth);
};

export const renderTable = (
  cells: string[][],
  x: number,
  y: number,
): ChartElements => {
  if (cells.length === 0 || cells[0]?.length === 0) {
    return [];
  }

  const columnCount = cells[0].length;

  const columnWidths = Array.from({ length: columnCount }, (_, columnIndex) => {
    const measuredWidth = Math.max(
      ...cells.map((row, rowIndex) => {
        const { fontString, lineHeight } = getCellTextStyle(rowIndex);
        const text = row[columnIndex] ?? "";
        const width = measureText(
          text.length > 0 ? text : " ",
          fontString,
          lineHeight,
        ).width;
        return width + TABLE_CELL_HORIZONTAL_PADDING * 2;
      }),
    );
    return clamp(measuredWidth, TABLE_MIN_COL_WIDTH, TABLE_MAX_COL_WIDTH);
  });

  const preparedCells = cells.map((row, rowIndex) =>
    row.map((cell, columnIndex) => {
      const { fontFamily, fontString, lineHeight, strokeColor } =
        getCellTextStyle(rowIndex);
      const maxTextWidth = Math.max(
        1,
        columnWidths[columnIndex] - TABLE_CELL_HORIZONTAL_PADDING * 2,
      );
      const displayText = getDisplayCellText(
        cell,
        fontString,
        lineHeight,
        maxTextWidth,
      );
      const metrics = measureText(displayText, fontString, lineHeight);
      return {
        displayText,
        originalText: cell,
        metrics,
        fontFamily,
        lineHeight,
        strokeColor,
      };
    }),
  );

  const rowHeights = preparedCells.map((row) =>
    Math.max(
      TABLE_MIN_ROW_HEIGHT,
      ...row.map(
        (cell) => cell.metrics.height + TABLE_CELL_VERTICAL_PADDING * 2,
      ),
    ),
  );

  const groupId = randomId();
  const elements: NonDeletedExcalidrawElement[] = [];

  let rowY = y;
  preparedCells.forEach((row, rowIndex) => {
    const rowHeight = rowHeights[rowIndex];
    let colX = x;

    row.forEach((cell, columnIndex) => {
      const width = columnWidths[columnIndex];
      const isHeader = rowIndex === 0;

      elements.push(
        newElement({
          ...tableProps,
          type: "rectangle",
          x: colX,
          y: rowY,
          width,
          height: rowHeight,
          backgroundColor: isHeader
            ? COLOR_PALETTE.blue[1]
            : COLOR_PALETTE.transparent,
          groupIds: [groupId],
        }),
      );

      elements.push(
        newTextElement({
          ...tableProps,
          groupIds: [groupId],
          backgroundColor: COLOR_PALETTE.transparent,
          text: cell.displayText,
          originalText: cell.originalText,
          x: colX + TABLE_CELL_HORIZONTAL_PADDING,
          y: rowY + rowHeight / 2,
          fontFamily: cell.fontFamily,
          fontSize: DEFAULT_FONT_SIZE,
          lineHeight: cell.lineHeight,
          textAlign: "left",
          verticalAlign: "middle",
          strokeColor: cell.strokeColor,
          autoResize: false,
        }),
      );

      colX += width;
    });

    rowY += rowHeight;
  });

  return elements;
};
