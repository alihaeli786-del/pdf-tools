"use client";

import { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import {
  FileSpreadsheet,
  FileText,
  Upload,
  X,
  Download,
  LayoutTemplate,
  Table2,
  Check,
} from "lucide-react";

type ConversionMode =
  | "layout"
  | "tables";

type PdfTextItem = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type PdfRow = {
  y: number;
  items: PdfTextItem[];
};

export default function PdfToExcelPage() {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const resultSectionRef =
    useRef<HTMLDivElement>(null);

  const [file, setFile] =
    useState<File | null>(null);

  const [pageCount, setPageCount] =
    useState(0);

  const [loading, setLoading] =
    useState(false);

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  const [converting, setConverting] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [downloadUrl, setDownloadUrl] =
    useState<string | null>(null);

  const [conversionMode, setConversionMode] =
    useState<ConversionMode>("tables");

  const clearResult = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(
        downloadUrl
      );
    }

    setDownloadUrl(null);
    setProgress(0);
  };

  const createPdfPreview = async (
    selectedFile: File
  ) => {
    const pdfjsLib =
      await import("pdfjs-dist");

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "/pdf.worker.min.mjs";

    const arrayBuffer =
      await selectedFile.arrayBuffer();

    const loadingTask =
      pdfjsLib.getDocument({
        data: new Uint8Array(
          arrayBuffer
        ),
      });

    const pdf =
      await loadingTask.promise;

    const page =
      await pdf.getPage(1);

    const viewport =
      page.getViewport({
        scale: 1.3,
      });

    const canvas =
      document.createElement(
        "canvas"
      );

    const context =
      canvas.getContext("2d");

    if (!context) return null;

    canvas.width =
      Math.ceil(viewport.width);

    canvas.height =
      Math.ceil(viewport.height);

    await page.render({
      canvas,
      canvasContext: context,
      viewport,
    }).promise;

    return canvas.toDataURL(
      "image/jpeg",
      0.92
    );
  };

  const loadPdf = async (
    selectedFile: File
  ) => {
    try {
      setLoading(true);
      clearResult();

      const bytes =
        await selectedFile.arrayBuffer();

      const pdf =
        await PDFDocument.load(bytes);

      const preview =
        await createPdfPreview(
          selectedFile
        );

      setFile(selectedFile);

      setPageCount(
        pdf.getPageCount()
      );

      setPreviewUrl(preview);
      setConversionMode("tables");
    } catch (error) {
      console.error(
        "PDF to Excel load error:",
        error
      );

      alert(
        "Unable to open this PDF."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (
    selectedFile?: File
  ) => {
    if (!selectedFile) return;

    if (
      selectedFile.type !==
      "application/pdf"
    ) {
      alert(
        "Please choose a PDF file."
      );

      return;
    }

    loadPdf(selectedFile);
  };

  const resetTool = () => {
    clearResult();

    setFile(null);
    setPageCount(0);
    setPreviewUrl(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const groupItemsIntoRows = (
    items: PdfTextItem[]
  ) => {
    const rows: PdfRow[] = [];

    const sorted =
      [...items].sort(
        (a, b) => {
          const yDifference =
            b.y - a.y;

          if (
            Math.abs(
              yDifference
            ) > 3
          ) {
            return yDifference;
          }

          return a.x - b.x;
        }
      );

    for (const item of sorted) {
      let targetRow =
        rows.find(
          (row) =>
            Math.abs(
              row.y - item.y
            ) <= 3
        );

      if (!targetRow) {
        targetRow = {
          y: item.y,
          items: [],
        };

        rows.push(targetRow);
      }

      targetRow.items.push(item);
    }

    rows.sort(
      (a, b) => b.y - a.y
    );

    for (const row of rows) {
      row.items.sort(
        (a, b) => a.x - b.x
      );
    }

    return rows;
  };

  const collapseLongTextBlocks = (
    rows: PdfRow[]
  ) => {
    const result: PdfRow[] = [];

    let index = 0;

    while (index < rows.length) {
      const current = rows[index];

      /*
        Only consider single-item rows.
        This keeps real table rows untouched.
      */

      if (
        current.items.length !== 1
      ) {
        result.push(current);
        index++;
        continue;
      }

      const blockRows: PdfRow[] = [
        current,
      ];

      let nextIndex =
        index + 1;

      while (
        nextIndex < rows.length
      ) {
        const next =
          rows[nextIndex];

        if (
          next.items.length !== 1
        ) {
          break;
        }

        const previous =
          blockRows[
            blockRows.length - 1
          ];

        const previousItem =
          previous.items[0];

        const nextItem =
          next.items[0];

        const sameLeftArea =
          Math.abs(
            previousItem.x -
              nextItem.x
          ) <= 45;

        const closeVertically =
          Math.abs(
            previous.y -
              next.y
          ) <= 18;

        if (
          !sameLeftArea ||
          !closeVertically
        ) {
          break;
        }

        blockRows.push(next);
        nextIndex++;
      }

      const combinedLength =
        blockRows.reduce(
          (total, row) =>
            total +
            row.items[0].text
              .trim().length,
          0
        );

      /*
        Short address lines stay separate.
        Only longer paragraph-like blocks
        are collapsed into one Excel row.
      */

      if (
        blockRows.length >= 2 &&
        combinedLength >= 55
      ) {
        const firstItem =
          blockRows[0].items[0];

        const combinedText =
          blockRows
            .map((row) =>
              row.items[0].text.trim()
            )
            .join(" ");

        result.push({
          y: blockRows[0].y,
          items: [
            {
              ...firstItem,
              text: combinedText,
              width:
                blockRows.reduce(
                  (
                    total,
                    row
                  ) =>
                    total +
                    Math.max(
                      row.items[0]
                        .width,
                      0
                    ),
                  0
                ),
            },
          ],
        });

        index = nextIndex;
        continue;
      }

      result.push(current);
      index++;
    }

    return result;
  };

  const detectColumns = (
    rows: PdfRow[]
  ) => {
    const tableRows =
      rows.filter(
        (row) =>
          row.items.length >= 2
      );

    const sourceRows =
      tableRows.length > 0
        ? tableRows
        : rows;

    const positions: number[] = [];

    for (const row of sourceRows) {
      for (const item of row.items) {
        positions.push(item.x);
      }
    }

    positions.sort(
      (a, b) => a - b
    );

    const clusters: number[] = [];

    const tolerance = 28;

    for (const x of positions) {
      let nearestIndex = -1;
      let nearestDistance =
        Number.POSITIVE_INFINITY;

      clusters.forEach(
        (clusterX, index) => {
          const distance =
            Math.abs(
              clusterX - x
            );

          if (
            distance <= tolerance &&
            distance <
              nearestDistance
          ) {
            nearestIndex =
              index;

            nearestDistance =
              distance;
          }
        }
      );

      if (
        nearestIndex === -1
      ) {
        clusters.push(x);
      } else {
        clusters[
          nearestIndex
        ] =
          (
            clusters[
              nearestIndex
            ] + x
          ) / 2;
      }
    }

    return clusters.sort(
      (a, b) => a - b
    );
  };

  const findNearestColumn = (
    x: number,
    columns: number[]
  ) => {
    let closestIndex = 0;

    let closestDistance =
      Number.POSITIVE_INFINITY;

    columns.forEach(
      (columnX, index) => {
        const distance =
          Math.abs(
            columnX - x
          );

        if (
          distance <
          closestDistance
        ) {
          closestDistance =
            distance;

          closestIndex =
            index;
        }
      }
    );

    return closestIndex;
  };

  const convertKeepLayoutExcel = async () => {
    if (!file) return;

    try {
      setConverting(true);
      clearResult();

      const pdfjsLib =
        await import("pdfjs-dist");

      const ExcelJS =
        await import("exceljs");

      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "/pdf.worker.min.mjs";

      const arrayBuffer =
        await file.arrayBuffer();

      const loadingTask =
        pdfjsLib.getDocument({
          data: new Uint8Array(
            arrayBuffer
          ),
        });

      const pdf =
        await loadingTask.promise;

      const workbook =
        new ExcelJS.Workbook();

      workbook.creator =
        "PDF Tools";

      workbook.created =
        new Date();

      for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber++
      ) {
        const page =
          await pdf.getPage(
            pageNumber
          );

        const viewport =
          page.getViewport({
            scale: 1,
          });

        const textContent =
          await page.getTextContent();

        const worksheet =
          workbook.addWorksheet(
            `Page ${pageNumber}`
          );

        /*
          A fine Excel grid lets us keep
          PDF text close to its original
          x / y position.
        */

        const totalColumns = 24;
        const totalRows = 48;

        for (
          let columnIndex = 1;
          columnIndex <= totalColumns;
          columnIndex++
        ) {
          worksheet.getColumn(
            columnIndex
          ).width = 5.2;
        }

        for (
          let rowIndex = 1;
          rowIndex <= totalRows;
          rowIndex++
        ) {
          worksheet.getRow(
            rowIndex
          ).height = 12;
        }

        for (
          const rawItem of
          textContent.items
        ) {
          if (!("str" in rawItem)) {
            continue;
          }

          const text =
            rawItem.str;

          if (!text.trim()) {
            continue;
          }

          const transform =
            rawItem.transform;

          const x =
            Math.max(
              0,
              transform[4]
            );

          const pdfY =
            transform[5];

          const yFromTop =
            Math.max(
              0,
              viewport.height -
                pdfY
            );

          const columnIndex =
            Math.max(
              1,
              Math.min(
                totalColumns,
                Math.round(
                  (x / viewport.width) *
                    (totalColumns - 1)
                ) + 1
              )
            );

          const rowIndex =
            Math.max(
              1,
              Math.min(
                totalRows,
                Math.round(
                  (yFromTop / viewport.height) *
                    (totalRows - 1)
                ) + 1
              )
            );

          let targetColumn =
            columnIndex;

          let targetCell =
            worksheet.getCell(
              rowIndex,
              targetColumn
            );

          /*
            If another PDF fragment already
            occupies this Excel cell, move
            the new fragment into the next
            available nearby cell instead
            of joining unrelated text.
          */

          while (
            targetCell.value &&
            String(
              targetCell.value
            ).trim() &&
            targetColumn <
              totalColumns
          ) {
            targetColumn += 1;

            targetCell =
              worksheet.getCell(
                rowIndex,
                targetColumn
              );
          }

          if (
            targetCell.value &&
            String(
              targetCell.value
            ).trim()
          ) {
            targetCell.value =
              `${targetCell.value} ${text}`;
          } else {
            targetCell.value =
              text;
          }

          const fontSize =
            Math.max(
              7,
              Math.min(
                30,
                Math.abs(
                  transform[3]
                ) ||
                  Math.abs(
                    transform[0]
                  ) ||
                  10
              )
            );

          const fontName =
            "fontName" in rawItem
              ? String(
                  rawItem.fontName
                ).toLowerCase()
              : "";

          targetCell.font = {
            name: "Arial",
            size: Math.round(
              fontSize
            ),
            bold:
              fontName.includes(
                "bold"
              ),
            italic:
              fontName.includes(
                "italic"
              ) ||
              fontName.includes(
                "oblique"
              ),
          };

          /*
            Keep every extracted PDF text fragment
            inside one real Excel cell.
            Do not merge surrounding cells.
          */

          targetCell.alignment = {
            vertical: "middle",
            horizontal: "left",
            wrapText: false,
          };
        }

        /*
          Detect simple vector table lines from the PDF
          and map them to Excel cell borders.
        */

        const applyCellBorder = (
          cell: any,
          side:
            | "top"
            | "bottom"
            | "left"
            | "right"
        ) => {
          const current =
            cell.border || {};

          cell.border = {
            ...current,

            [side]: {
              style: "thin",
              color: {
                argb: "FFCBD5E1",
              },
            },
          };
        };

        const mapXToColumn = (
          x: number
        ) =>
          Math.max(
            1,
            Math.min(
              totalColumns,
              Math.round(
                (x /
                  viewport.width) *
                  (totalColumns - 1)
              ) + 1
            )
          );

        const mapYToRow = (
          y: number
        ) =>
          Math.max(
            1,
            Math.min(
              totalRows,
              Math.round(
                (y /
                  viewport.height) *
                  (totalRows - 1)
              ) + 1
            )
          );

        type BorderSegment = {
          x1: number;
          y1: number;
          x2: number;
          y2: number;
        };

        let detectedBorderCount = 0;

        const drawExcelSegment = (
          segment: BorderSegment
        ) => {
          const dx =
            Math.abs(
              segment.x2 -
                segment.x1
            );

          const dy =
            Math.abs(
              segment.y2 -
                segment.y1
            );

          /*
            Ignore very small vector marks.
          */

          if (
            dx < 8 &&
            dy < 8
          ) {
            return;
          }

          /*
            Horizontal PDF line.
          */

          if (dy <= 2.5) {
            const startColumn =
              mapXToColumn(
                Math.min(
                  segment.x1,
                  segment.x2
                )
              );

            const endColumn =
              mapXToColumn(
                Math.max(
                  segment.x1,
                  segment.x2
                )
              );

            const rowIndex =
              mapYToRow(
                (
                  segment.y1 +
                  segment.y2
                ) / 2
              );

            for (
              let column =
                startColumn;
              column <=
              endColumn;
              column++
            ) {
              applyCellBorder(
                worksheet.getCell(
                  rowIndex,
                  column
                ),
                "bottom"
              );
            }

            detectedBorderCount++;
            return;
          }

          /*
            Vertical PDF line.
          */

          if (dx <= 2.5) {
            const startRow =
              mapYToRow(
                Math.min(
                  segment.y1,
                  segment.y2
                )
              );

            const endRow =
              mapYToRow(
                Math.max(
                  segment.y1,
                  segment.y2
                )
              );

            const columnIndex =
              mapXToColumn(
                (
                  segment.x1 +
                  segment.x2
                ) / 2
              );

            for (
              let row =
                startRow;
              row <= endRow;
              row++
            ) {
              applyCellBorder(
                worksheet.getCell(
                  row,
                  columnIndex
                ),
                "right"
              );
            }

            detectedBorderCount++;
          }
        };

        try {
          const operatorList =
            await page.getOperatorList();

          const OPS =
            pdfjsLib.OPS as any;

          const identity = [
            1, 0, 0, 1, 0, 0,
          ];

          let currentMatrix =
            [...identity];

          const matrixStack:
            number[][] = [];

          let pendingSegments:
            BorderSegment[] = [];

          const multiplyMatrix = (
            first: number[],
            second: number[]
          ) => {
            return [
              first[0] *
                second[0] +
                first[2] *
                  second[1],

              first[1] *
                second[0] +
                first[3] *
                  second[1],

              first[0] *
                second[2] +
                first[2] *
                  second[3],

              first[1] *
                second[2] +
                first[3] *
                  second[3],

              first[0] *
                second[4] +
                first[2] *
                  second[5] +
                first[4],

              first[1] *
                second[4] +
                first[3] *
                  second[5] +
                first[5],
            ];
          };

          const applyMatrix = (
            x: number,
            y: number,
            matrix: number[]
          ) => {
            return {
              x:
                matrix[0] * x +
                matrix[2] * y +
                matrix[4],

              y:
                matrix[1] * x +
                matrix[3] * y +
                matrix[5],
            };
          };

          const toViewportPoint = (
            x: number,
            y: number
          ) => {
            const transformed =
              applyMatrix(
                x,
                y,
                currentMatrix
              );

            return applyMatrix(
              transformed.x,
              transformed.y,
              viewport.transform
            );
          };

          const flushStroke =
            () => {
              for (
                const segment of
                pendingSegments
              ) {
                drawExcelSegment(
                  segment
                );
              }

              pendingSegments = [];
            };

          for (
            let operatorIndex = 0;
            operatorIndex <
            operatorList.fnArray.length;
            operatorIndex++
          ) {
            const fn =
              operatorList.fnArray[
                operatorIndex
              ];

            const rawArgs =
              operatorList.argsArray[
                operatorIndex
              ] as any;

            if (
              fn === OPS.save
            ) {
              matrixStack.push(
                [
                  ...currentMatrix,
                ]
              );

              continue;
            }

            if (
              fn === OPS.restore
            ) {
              currentMatrix =
                matrixStack.pop() ||
                [...identity];

              continue;
            }

            if (
              fn === OPS.transform &&
              rawArgs &&
              rawArgs.length >= 6
            ) {
              currentMatrix =
                multiplyMatrix(
                  currentMatrix,
                  [
                    Number(
                      rawArgs[0]
                    ),
                    Number(
                      rawArgs[1]
                    ),
                    Number(
                      rawArgs[2]
                    ),
                    Number(
                      rawArgs[3]
                    ),
                    Number(
                      rawArgs[4]
                    ),
                    Number(
                      rawArgs[5]
                    ),
                  ]
                );

              continue;
            }

            if (
              fn ===
              OPS.constructPath
            ) {
              if (
                !rawArgs ||
                rawArgs.length < 2
              ) {
                continue;
              }

              const rawOperations =
                rawArgs[0];

              const rawCoordinates =
                rawArgs[1];

              /*
                Handle the common PDF.js
                constructPath representation.
              */

              if (
                !rawOperations ||
                typeof rawOperations ===
                  "number" ||
                !rawCoordinates
              ) {
                continue;
              }

              const pathOperations =
                Array.from(
                  rawOperations
                ) as number[];

              const coordinates =
                Array.from(
                  rawCoordinates
                ) as number[];

              let coordinateIndex =
                0;

              let currentPoint:
                | {
                    x: number;
                    y: number;
                  }
                | null = null;

              let subpathStart:
                | {
                    x: number;
                    y: number;
                  }
                | null = null;

              for (
                const pathOperation of
                pathOperations
              ) {
                if (
                  pathOperation ===
                  OPS.moveTo
                ) {
                  const point =
                    toViewportPoint(
                      coordinates[
                        coordinateIndex
                      ],
                      coordinates[
                        coordinateIndex +
                          1
                      ]
                    );

                  coordinateIndex +=
                    2;

                  currentPoint =
                    point;

                  subpathStart =
                    point;

                  continue;
                }

                if (
                  pathOperation ===
                  OPS.lineTo
                ) {
                  const nextPoint =
                    toViewportPoint(
                      coordinates[
                        coordinateIndex
                      ],
                      coordinates[
                        coordinateIndex +
                          1
                      ]
                    );

                  coordinateIndex +=
                    2;

                  if (currentPoint) {
                    pendingSegments.push(
                      {
                        x1:
                          currentPoint.x,
                        y1:
                          currentPoint.y,
                        x2:
                          nextPoint.x,
                        y2:
                          nextPoint.y,
                      }
                    );
                  }

                  currentPoint =
                    nextPoint;

                  continue;
                }

                if (
                  pathOperation ===
                  OPS.rectangle
                ) {
                  const x =
                    coordinates[
                      coordinateIndex
                    ];

                  const y =
                    coordinates[
                      coordinateIndex +
                        1
                    ];

                  const width =
                    coordinates[
                      coordinateIndex +
                        2
                    ];

                  const height =
                    coordinates[
                      coordinateIndex +
                        3
                    ];

                  coordinateIndex +=
                    4;

                  const p1 =
                    toViewportPoint(
                      x,
                      y
                    );

                  const p2 =
                    toViewportPoint(
                      x + width,
                      y
                    );

                  const p3 =
                    toViewportPoint(
                      x + width,
                      y + height
                    );

                  const p4 =
                    toViewportPoint(
                      x,
                      y + height
                    );

                  pendingSegments.push(
                    {
                      x1: p1.x,
                      y1: p1.y,
                      x2: p2.x,
                      y2: p2.y,
                    },
                    {
                      x1: p2.x,
                      y1: p2.y,
                      x2: p3.x,
                      y2: p3.y,
                    },
                    {
                      x1: p3.x,
                      y1: p3.y,
                      x2: p4.x,
                      y2: p4.y,
                    },
                    {
                      x1: p4.x,
                      y1: p4.y,
                      x2: p1.x,
                      y2: p1.y,
                    }
                  );

                  currentPoint =
                    p1;

                  subpathStart =
                    p1;

                  continue;
                }

                if (
                  pathOperation ===
                  OPS.closePath
                ) {
                  if (
                    currentPoint &&
                    subpathStart
                  ) {
                    pendingSegments.push(
                      {
                        x1:
                          currentPoint.x,
                        y1:
                          currentPoint.y,
                        x2:
                          subpathStart.x,
                        y2:
                          subpathStart.y,
                      }
                    );

                    currentPoint =
                      subpathStart;
                  }

                  continue;
                }

                /*
                  Skip curve coordinates.
                */

                if (
                  pathOperation ===
                  OPS.curveTo
                ) {
                  coordinateIndex +=
                    6;
                  continue;
                }

                if (
                  pathOperation ===
                    OPS.curveTo2 ||
                  pathOperation ===
                    OPS.curveTo3
                ) {
                  coordinateIndex +=
                    4;
                }
              }

              continue;
            }

            if (
              fn === OPS.stroke ||
              fn ===
                OPS.closeStroke ||
              fn ===
                OPS.fillStroke ||
              fn ===
                OPS.eoFillStroke
            ) {
              flushStroke();
              continue;
            }

            if (
              fn === OPS.fill ||
              fn === OPS.eoFill
            ) {
              pendingSegments = [];
            }
          }

          /*
            Safe fallback:
            if vector borders were not available,
            add light borders to rows that look
            like structured table rows.
          */

          if (
            detectedBorderCount ===
            0
          ) {
            const fallbackItems:
              PdfTextItem[] = [];

            for (
              const rawItem of
              textContent.items
            ) {
              if (
                !("str" in rawItem)
              ) {
                continue;
              }

              const text =
                rawItem.str.trim();

              if (!text) {
                continue;
              }

              fallbackItems.push({
                text,
                x:
                  rawItem.transform[
                    4
                  ],
                y:
                  rawItem.transform[
                    5
                  ],
                width:
                  "width" in rawItem
                    ? rawItem.width
                    : 0,
                height:
                  "height" in rawItem
                    ? rawItem.height
                    : 0,
              });
            }

            const fallbackRows =
              groupItemsIntoRows(
                fallbackItems
              );

            for (
              const tableRow of
              fallbackRows
            ) {
              if (
                tableRow.items
                  .length < 3
              ) {
                continue;
              }

              const yFromTop =
                viewport.height -
                tableRow.y;

              const rowIndex =
                mapYToRow(
                  yFromTop
                );

              const startColumn =
                mapXToColumn(
                  Math.min(
                    ...tableRow.items.map(
                      (item) =>
                        item.x
                    )
                  )
                );

              const endColumn =
                mapXToColumn(
                  Math.max(
                    ...tableRow.items.map(
                      (item) =>
                        item.x +
                        Math.max(
                          item.width,
                          15
                        )
                    )
                  )
                );

              for (
                let column =
                  startColumn;
                column <=
                  endColumn;
                column++
              ) {
                applyCellBorder(
                  worksheet.getCell(
                    rowIndex,
                    column
                  ),
                  "bottom"
                );
              }
            }
          }
        } catch (borderError) {
          console.warn(
            "PDF border detection skipped:",
            borderError
          );
        }

        /*
          Add structured vertical borders for
          rows that clearly look like tables.
          This complements the PDF vector
          horizontal lines detected above.
        */

        try {
          const layoutItems:
            PdfTextItem[] = [];

          for (
            const rawItem of
            textContent.items
          ) {
            if (
              !("str" in rawItem)
            ) {
              continue;
            }

            const text =
              rawItem.str.trim();

            if (!text) {
              continue;
            }

            layoutItems.push({
              text,
              x:
                rawItem.transform[
                  4
                ],
              y:
                rawItem.transform[
                  5
                ],
              width:
                "width" in rawItem
                  ? rawItem.width
                  : 0,
              height:
                "height" in rawItem
                  ? rawItem.height
                  : 0,
            });
          }

          const structuredRows =
            groupItemsIntoRows(
              layoutItems
            );

          const tableRows =
            structuredRows.filter(
              (row) =>
                row.items.length >= 3
            );

          if (
            tableRows.length > 0
          ) {

            for (
              const tableRow of
              tableRows
            ) {
              const yFromTop =
                viewport.height -
                tableRow.y;

              const rowIndex =
                mapYToRow(
                  yFromTop
                );

              const usedColumns =
                tableRow.items
                  .map((item) =>
                    mapXToColumn(
                      item.x
                    )
                  )
                  .filter(
                    (
                      value,
                      index,
                      array
                    ) =>
                      array.indexOf(
                        value
                      ) === index
                  )
                  .sort(
                    (a, b) =>
                      a - b
                  );

              if (
                usedColumns.length <
                2
              ) {
                continue;
              }

              const firstColumn =
                usedColumns[0];

              const lastColumn =
                usedColumns[
                  usedColumns.length -
                    1
                ];

              /*
                Left border for every
                detected table column.
              */

              for (
                const column of
                usedColumns
              ) {
                applyCellBorder(
                  worksheet.getCell(
                    rowIndex,
                    column
                  ),
                  "left"
                );
              }

              /*
                Close the right side
                of the table.
              */

              applyCellBorder(
                worksheet.getCell(
                  rowIndex,
                  lastColumn
                ),
                "right"
              );

              /*
                Maintain a clean line
                across the whole row.
              */

              for (
                let column =
                  firstColumn;
                column <=
                  lastColumn;
                column++
              ) {
                applyCellBorder(
                  worksheet.getCell(
                    rowIndex,
                    column
                  ),
                  "bottom"
                );
              }
            }
          }
        } catch (
          structuredBorderError
        ) {
          console.warn(
            "Structured table borders skipped:",
            structuredBorderError
          );
        }

        worksheet.views = [
          {
            showGridLines:
              false,
          },
        ];

        worksheet.pageSetup = {
          orientation:
            viewport.width >
            viewport.height
              ? "landscape"
              : "portrait",

          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,

          margins: {
            left: 0.2,
            right: 0.2,
            top: 0.2,
            bottom: 0.2,
            header: 0,
            footer: 0,
          },
        };

        setProgress(
          Math.round(
            (pageNumber /
              pdf.numPages) *
              100
          )
        );
      }

      const excelBuffer =
        await workbook.xlsx.writeBuffer();

      const bytes =
        new Uint8Array(
          excelBuffer
        );

      const blob =
        new Blob(
          [bytes],
          {
            type:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      setDownloadUrl(url);
      setProgress(100);

      setTimeout(() => {
        resultSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 150);
    } catch (error) {
      console.error(
        "Keep Style Excel conversion error:",
        error
      );

      alert(
        "Unable to convert this PDF using Keep Style and Layout mode."
      );
    } finally {
      setConverting(false);
    }
  };

  const convertToExcel = async () => {
    if (!file) return;

    if (conversionMode === "layout") {
      await convertKeepLayoutExcel();
      return;
    }

    try {
      setConverting(true);
      clearResult();

      const pdfjsLib =
        await import("pdfjs-dist");

      const ExcelJS =
        await import("exceljs");

      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "/pdf.worker.min.mjs";

      const arrayBuffer =
        await file.arrayBuffer();

      const loadingTask =
        pdfjsLib.getDocument({
          data: new Uint8Array(
            arrayBuffer
          ),
        });

      const pdf =
        await loadingTask.promise;

      const workbook =
        new ExcelJS.Workbook();

      workbook.creator =
        "PDF Tools";

      workbook.created =
        new Date();

      for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber++
      ) {
        const page =
          await pdf.getPage(
            pageNumber
          );

        const textContent =
          await page.getTextContent();

        const items: PdfTextItem[] = [];

        for (
          const rawItem of
          textContent.items
        ) {
          if (
            !("str" in rawItem)
          ) {
            continue;
          }

          const text =
            rawItem.str.trim();

          if (!text) {
            continue;
          }

          const transform =
            rawItem.transform;

          items.push({
            text,
            x: transform[4],
            y: transform[5],
            width:
              "width" in rawItem
                ? rawItem.width
                : 0,
            height:
              "height" in rawItem
                ? rawItem.height
                : 0,
          });
        }

        const worksheet =
          workbook.addWorksheet(
            `Page ${pageNumber}`
          );

        if (
          items.length === 0
        ) {
          worksheet.getCell(
            "A1"
          ).value =
            "No selectable text found on this page.";

          worksheet.getCell(
            "A2"
          ).value =
            "This page may be scanned or image-based.";
        } else {
          const rawRows =
            groupItemsIntoRows(
              items
            );

          const rows =
            collapseLongTextBlocks(
              rawRows
            );

          const columns =
            detectColumns(rows);

          rows.forEach(
            (
              pdfRow,
              rowIndex
            ) => {
              const mappedCells =
                new Map<
                  number,
                  string
                >();

              for (
                const item of
                pdfRow.items
              ) {
                const columnIndex =
                  findNearestColumn(
                    item.x,
                    columns
                  );

                const existing =
                  mappedCells.get(
                    columnIndex
                  );

                mappedCells.set(
                  columnIndex,
                  existing
                    ? `${existing} ${item.text}`
                    : item.text
                );
              }

              const excelRow =
                worksheet.getRow(
                  rowIndex + 1
                );

              const isTableRow =
                pdfRow.items.length >= 2;

              mappedCells.forEach(
                (
                  value,
                  columnIndex
                ) => {
                  const cell =
                    excelRow.getCell(
                      columnIndex + 1
                    );

                  cell.value =
                    value;

                  cell.alignment = {
                    vertical:
                      "middle",
                    horizontal:
                      "left",

                    /*
                      Real table rows may wrap,
                      but paragraph/footer text
                      should stay on one line.
                    */
                    wrapText:
                      isTableRow,
                  };

                  if (isTableRow) {
                    cell.border = {
                      top: {
                        style:
                          "thin",
                        color: {
                          argb:
                            "FFD6DCE5",
                        },
                      },
                      left: {
                        style:
                          "thin",
                        color: {
                          argb:
                            "FFD6DCE5",
                        },
                      },
                      bottom: {
                        style:
                          "thin",
                        color: {
                          argb:
                            "FFD6DCE5",
                        },
                      },
                      right: {
                        style:
                          "thin",
                        color: {
                          argb:
                            "FFD6DCE5",
                        },
                      },
                    };
                  }
                }
              );
            }
          );

          worksheet.columns.forEach(
            (column) => {
              let maxLength = 10;

              column.eachCell?.(
                {
                  includeEmpty:
                    false,
                },
                (cell) => {
                  const value =
                    String(
                      cell.value ??
                        ""
                    );

                  maxLength =
                    Math.max(
                      maxLength,
                      value.length +
                        2
                    );
                }
              );

              column.width =
                Math.min(
                  Math.max(
                    maxLength,
                    10
                  ),
                  45
                );
            }
          );

          worksheet.views = [
            {
              showGridLines:
                true,
            },
          ];
        }

        setProgress(
          Math.round(
            (pageNumber /
              pdf.numPages) *
              100
          )
        );
      }

      const excelBuffer =
        await workbook.xlsx.writeBuffer();

      const bytes =
        new Uint8Array(
          excelBuffer
        );

      const blob =
        new Blob(
          [bytes],
          {
            type:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }
        );

      const url =
        URL.createObjectURL(blob);

      setDownloadUrl(url);
      setProgress(100);

      setTimeout(() => {
        resultSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 150);
    } catch (error) {
      console.error(
        "PDF to Excel conversion error:",
        error
      );

      alert(
        "Unable to convert this PDF to Excel."
      );
    } finally {
      setConverting(false);
    }
  };

  const excelFileName =
    file
      ? `${file.name.replace(
          /\.pdf$/i,
          ""
        )}.xlsx`
      : "converted.xlsx";

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-[1500px] px-5 py-10">

        <div className="mx-auto max-w-3xl text-center">

          <div className="mb-4 inline-flex rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600">
            PDF Tool
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            PDF to Excel
          </h1>

          <p className="mt-4 text-lg text-slate-600">
            Extract tables and structured data from PDF
            documents into editable Excel spreadsheets.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(event) =>
            handleFile(
              event.target.files?.[0]
            )
          }
        />

        {!file ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">

            <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white px-6 py-16 shadow-[0_20px_70px_rgba(15,23,42,0.08)] md:px-12 md:py-20">

              <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-orange-100/50 blur-3xl" />

              <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-amber-100/50 blur-3xl" />

              <div className="relative mx-auto max-w-3xl text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
                  <FileSpreadsheet size={28} />
                </div>

                <h2 className="mt-7 text-3xl font-bold tracking-tight text-slate-950">
                  Convert your PDF to Excel
                </h2>

                <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-500">
                  Upload a PDF containing tables,
                  invoices or structured data.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    inputRef.current?.click()
                  }
                  onDragOver={(event) =>
                    event.preventDefault()
                  }
                  onDrop={(event) => {
                    event.preventDefault();

                    handleFile(
                      event.dataTransfer
                        .files?.[0]
                    );
                  }}
                  className="group mx-auto mt-8 flex min-h-[190px] w-full max-w-2xl flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-orange-200 bg-orange-50/40 px-6 transition hover:border-orange-500 hover:bg-orange-50"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-md transition group-hover:-translate-y-1">
                    <Upload size={25} />
                  </div>

                  <span className="mt-5 text-lg font-bold text-slate-900">
                    {loading
                      ? "Opening PDF..."
                      : "Choose PDF file"}
                  </span>

                  <span className="mt-1 text-sm text-slate-500">
                    or drag and drop it here
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">

            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex min-w-0 items-center gap-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                  <FileText size={22} />
                </div>

                <div className="min-w-0">

                  <p className="truncate font-bold text-slate-950">
                    {file.name}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {pageCount}{" "}
                    {pageCount === 1
                      ? "page"
                      : "pages"}{" "}
                    |{" "}
                    {(
                      file.size /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={resetTool}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <X size={16} />
                Remove
              </button>
            </div>

            {/* CONVERSION MODE */}
            <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/70 p-5 md:p-6">

              <div className="text-center">
                <h2 className="text-lg font-bold text-slate-950">
                  Choose conversion mode
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Select how your PDF data should be converted into Excel.
                </p>
              </div>

              <div className="mx-auto mt-6 grid max-w-3xl gap-4 md:grid-cols-2">

                {/* KEEP STYLE AND LAYOUT */}
                <button
                  type="button"
                  onClick={() =>
                    setConversionMode("layout")
                  }
                  className={`group relative rounded-[22px] border-2 p-6 text-left transition duration-200 ${
                    conversionMode === "layout"
                      ? "border-orange-500 bg-orange-50 shadow-[0_12px_30px_rgba(249,115,22,0.12)]"
                      : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
                  }`}
                >
                  {conversionMode === "layout" && (
                    <div className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-white">
                      <Check size={16} strokeWidth={3} />
                    </div>
                  )}

                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      conversionMode === "layout"
                        ? "bg-orange-500 text-white"
                        : "bg-slate-100 text-slate-700 group-hover:bg-orange-50 group-hover:text-orange-500"
                    }`}
                  >
                    <LayoutTemplate size={23} />
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-slate-950">
                    Keep style and layout
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Best for documents containing both text
                    paragraphs and table data. Preserve the
                    original structure as closely as possible.
                  </p>

                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-orange-500">
                    Text + tables
                    <span>{"\u2192"}</span>
                  </div>
                </button>

                {/* OPTIMIZED FOR TABLES */}
                <button
                  type="button"
                  onClick={() =>
                    setConversionMode("tables")
                  }
                  className={`group relative rounded-[22px] border-2 p-6 text-left transition duration-200 ${
                    conversionMode === "tables"
                      ? "border-orange-500 bg-orange-50 shadow-[0_12px_30px_rgba(249,115,22,0.12)]"
                      : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
                  }`}
                >
                  {conversionMode === "tables" && (
                    <div className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-white">
                      <Check size={16} strokeWidth={3} />
                    </div>
                  )}

                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      conversionMode === "tables"
                        ? "bg-orange-500 text-white"
                        : "bg-slate-100 text-slate-700 group-hover:bg-orange-50 group-hover:text-orange-500"
                    }`}
                  >
                    <Table2 size={23} />
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-slate-950">
                    Optimized for tables
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Best for PDFs containing mostly tables.
                    Extract rows and columns into a cleaner,
                    structured Excel spreadsheet.
                  </p>

                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-orange-500">
                    Best for table data
                    <span>{"\u2192"}</span>
                  </div>
                </button>

              </div>
            </div>

            {/* PREVIEW */}
            <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100/80">

              <div className="border-b border-slate-200 bg-white px-5 py-4">

                <p className="font-bold text-slate-950">
                  PDF preview
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Page 1 of {pageCount}
                </p>
              </div>

              <div className="flex min-h-[620px] items-center justify-center p-6">

                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="PDF preview"
                    draggable={false}
                    className="block max-h-[580px] max-w-full bg-white object-contain shadow-[0_18px_45px_rgba(15,23,42,0.15)]"
                  />
                ) : (
                  <p className="text-sm text-slate-400">
                    Loading preview...
                  </p>
                )}
              </div>
            </div>

            {/* ACTION */}
            <div className="sticky bottom-4 z-40 mt-6 rounded-[24px] border border-slate-200 bg-white/95 px-5 py-4 shadow-[0_14px_45px_rgba(15,23,42,0.16)] backdrop-blur-md md:px-8">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="font-bold text-slate-950">
                    Ready to convert
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {conversionMode === "layout"
                      ? "Preserve text, tables and document structure as closely as possible."
                      : "Extract rows and columns into structured Excel sheets."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={convertToExcel}
                  disabled={converting}
                  className="group inline-flex min-w-[230px] items-center justify-center rounded-2xl bg-orange-500 px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_28px_rgba(249,115,22,0.25)] transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {converting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Converting {progress}%
                    </span>
                  ) : (
                    <span className="flex items-center gap-3">
                      Convert to Excel

                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15">
                        {"\u2192"}
                      </span>
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* RESULT */}
            {downloadUrl && (
              <div
                ref={resultSectionRef}
                className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div>
                    <p className="font-bold text-slate-950">
                      Your Excel file is ready
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      Extracted PDF data is now available in an editable XLSX workbook.
                    </p>
                  </div>

                  <a
                    href={downloadUrl}
                    download={excelFileName}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_22px_rgba(5,150,105,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-700"
                  >
                    <Download size={18} />
                    Download Excel
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
