import {
  COLOR_PALETTE,
  getFontString,
  getLineHeight,
} from "@excalidraw/common";

import { measureText, newElement, newTextElement, wrapText } from "@excalidraw/element";

import { commonProps } from "./charts.constants";

import type { ChartElements, SpreadsheetTable } from "./charts.types";
import type { ExcalidrawTextElement, NonDeletedExcalidrawElement } from "@excalidraw/element/types";

const CELL_PADDING_X = 12;
const CELL_PADDING_Y = 8;
const MIN_COLUMN_WIDTH = 80;
const MAX_COLUMN_WIDTH = 320;
const MIN_ROW_HEIGHT = 36;
const HEADER_BACKGROUND = COLOR_PALETTE.gray[0];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getDisplayText = (
  text: string,
  fontString: ReturnType<typeof getFontString>,
  lineHeight: ExcalidrawTextElement["lineHeight"],
  maxTextWidth: number,
) => {
  const normalizedText = text.trim();
  if (!normalizedText) {
    return "";
  }

  const metrics = measureText(normalizedText, fontString, lineHeight);
  if (metrics.width <= maxTextWidth) {
    return normalizedText;
  }

  return wrapText(normalizedText, fontString, maxTextWidth);
};

export const renderTable = (
  table: SpreadsheetTable,
  x: number,
  y: number,
): ChartElements => {
  if (!table.rows.length || !table.rows[0]?.length) {
    return [];
  }

  const fontFamily = commonProps.fontFamily;
  const fontSize = commonProps.fontSize;
  const lineHeight = getLineHeight(fontFamily);
  const fontString = getFontString({ fontFamily, fontSize });
  const fallbackTextMetrics = measureText(" ", fontString, lineHeight);
  const columnCount = table.rows[0].length;

  const columnWidths = Array.from({ length: columnCount }, (_, columnIndex) => {
    const maxContentWidth = table.rows.reduce((maxWidth, row) => {
      const cellValue = row[columnIndex] ?? "";
      const width = measureText(cellValue.trim(), fontString, lineHeight).width;
      return Math.max(maxWidth, width);
    }, 0);

    return clamp(
      maxContentWidth + CELL_PADDING_X * 2,
      MIN_COLUMN_WIDTH,
      MAX_COLUMN_WIDTH,
    );
  });

  const rowHeights = table.rows.map((row) => {
    const rowHeight = row.reduce((maxHeight, value, columnIndex) => {
      const maxTextWidth = Math.max(1, columnWidths[columnIndex] - CELL_PADDING_X * 2);
      const displayText = getDisplayText(
        value,
        fontString,
        lineHeight,
        maxTextWidth,
      );
      const textMetrics = displayText
        ? measureText(displayText, fontString, lineHeight)
        : fallbackTextMetrics;
      return Math.max(maxHeight, textMetrics.height + CELL_PADDING_Y * 2);
    }, 0);

    return Math.max(MIN_ROW_HEIGHT, rowHeight);
  });

  const tableElements: NonDeletedExcalidrawElement[] = [];
  let currentY = y;
  table.rows.forEach((row, rowIndex) => {
    let currentX = x;
    row.forEach((value, columnIndex) => {
      const width = columnWidths[columnIndex];
      const height = rowHeights[rowIndex];
      const maxTextWidth = Math.max(1, width - CELL_PADDING_X * 2);
      const displayText = getDisplayText(
        value,
        fontString,
        lineHeight,
        maxTextWidth,
      );

      tableElements.push(
        newElement({
          ...commonProps,
          type: "rectangle",
          x: currentX,
          y: currentY,
          width,
          height,
          fillStyle: "solid",
          backgroundColor:
            rowIndex === 0 ? HEADER_BACKGROUND : COLOR_PALETTE.transparent,
        }),
      );

      tableElements.push(
        newTextElement({
          ...commonProps,
          text: displayText,
          originalText: value.trim(),
          autoResize: false,
          x: currentX + CELL_PADDING_X,
          y: currentY + height / 2,
          fontFamily,
          fontSize,
          lineHeight,
          textAlign: "left",
          verticalAlign: "middle",
          backgroundColor: COLOR_PALETTE.transparent,
        }),
      );

      currentX += width;
    });
    currentY += rowHeights[rowIndex];
  });

  return tableElements;
};
