"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Download,
  ImageIcon,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

export default function RemoveBackgroundPage() {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [file, setFile] =
    useState<File | null>(null);

  const [previewUrl, setPreviewUrl] =
    useState("");

  const [resultUrl, setResultUrl] =
    useState("");

  const [editedUrl, setEditedUrl] =
    useState("");

  const [brushMode, setBrushMode] =
    useState<"erase" | "restore">("erase");

  const [brushSize, setBrushSize] =
    useState(36);

  const editorCanvasRef =
    useRef<HTMLCanvasElement>(null);

  const restoreImageRef =
    useRef<HTMLImageElement | null>(null);

  const paintingRef =
    useRef(false);

  const [processing, setProcessing] =
    useState(false);

  const [subjectMode, setSubjectMode] =
    useState<"main" | "general">("main");

  const [progress, setProgress] =
    useState(0);

  const [
    statusMessage,
    setStatusMessage,
  ] = useState("");

  const loadFile = (
    selectedFile: File
  ) => {
    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(
        selectedFile.type
      )
    ) {
      alert(
        "Please choose a JPG, PNG or WebP image."
      );
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    if (resultUrl) {
      URL.revokeObjectURL(
        resultUrl
      );
    }

    const url =
      URL.createObjectURL(
        selectedFile
      );

    setFile(
      selectedFile
    );

    setPreviewUrl(
      url
    );

    setResultUrl("");

    if (editedUrl) {
      URL.revokeObjectURL(
        editedUrl
      );

      setEditedUrl("");
    }

    setProgress(0);

    setStatusMessage("");
  };


  const clearImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    if (resultUrl) {
      URL.revokeObjectURL(
        resultUrl
      );
    }

    setFile(null);
    setPreviewUrl("");
    setResultUrl("");
    setProgress(0);
    setStatusMessage("");

    if (
      inputRef.current
    ) {
      inputRef.current.value =
        "";
    }
  };


  const refineTransparentEdges = async (
    sourceBlob: Blob
  ) => {
    const bitmap =
      await createImageBitmap(
        sourceBlob
      );

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      bitmap.width;

    canvas.height =
      bitmap.height;

    const context =
      canvas.getContext(
        "2d",
        {
          willReadFrequently:
            true,
        }
      );

    if (!context) {
      bitmap.close();
      return sourceBlob;
    }

    context.drawImage(
      bitmap,
      0,
      0
    );

    bitmap.close();

    const imageData =
      context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

    const source =
      new Uint8ClampedArray(
        imageData.data
      );

    const target =
      imageData.data;

    const width =
      canvas.width;

    const height =
      canvas.height;

    const getIndex = (
      x: number,
      y: number
    ) =>
      (y * width + x) * 4;


    for (
      let y = 0;
      y < height;
      y++
    ) {
      for (
        let x = 0;
        x < width;
        x++
      ) {
        const index =
          getIndex(x, y);

        const alpha =
          source[
            index + 3
          ];

        if (alpha < 10) {
          target[
            index + 3
          ] = 0;

          continue;
        }


        let transparentNeighbors =
          0;

        let solidNeighbors =
          0;

        let redTotal = 0;
        let greenTotal = 0;
        let blueTotal = 0;


        for (
          let offsetY = -2;
          offsetY <= 2;
          offsetY++
        ) {
          for (
            let offsetX = -2;
            offsetX <= 2;
            offsetX++
          ) {
            const neighborX =
              x + offsetX;

            const neighborY =
              y + offsetY;

            if (
              neighborX < 0 ||
              neighborY < 0 ||
              neighborX >=
                width ||
              neighborY >=
                height
            ) {
              continue;
            }

            const neighborIndex =
              getIndex(
                neighborX,
                neighborY
              );

            const neighborAlpha =
              source[
                neighborIndex +
                  3
              ];

            if (
              neighborAlpha <
              24
            ) {
              transparentNeighbors++;
            }

            if (
              neighborAlpha >
              220
            ) {
              solidNeighbors++;

              redTotal +=
                source[
                  neighborIndex
                ];

              greenTotal +=
                source[
                  neighborIndex +
                    1
                ];

              blueTotal +=
                source[
                  neighborIndex +
                    2
                ];
            }
          }
        }


        if (
          alpha < 150 &&
          solidNeighbors === 0
        ) {
          target[
            index + 3
          ] = 0;

          continue;
        }


        const isEdge =
          transparentNeighbors >
          0;

        if (
          isEdge &&
          solidNeighbors > 0
        ) {
          const averageRed =
            redTotal /
            solidNeighbors;

          const averageGreen =
            greenTotal /
            solidNeighbors;

          const averageBlue =
            blueTotal /
            solidNeighbors;

          const blend =
            alpha < 230
              ? 0.78
              : 0.5;

          target[index] =
            Math.round(
              source[index] *
                (1 - blend) +
                averageRed *
                  blend
            );

          target[
            index + 1
          ] =
            Math.round(
              source[
                index + 1
              ] *
                (1 - blend) +
                averageGreen *
                  blend
            );

          target[
            index + 2
          ] =
            Math.round(
              source[
                index + 2
              ] *
                (1 - blend) +
                averageBlue *
                  blend
            );


          if (
            alpha < 245
          ) {
            const sharpenedAlpha =
              Math.max(
                0,
                Math.min(
                  255,
                  Math.round(
                    (alpha - 12) *
                      1.1
                  )
                )
              );

            target[
              index + 3
            ] =
              sharpenedAlpha;
          }
        }
      }
    }


    const firstPass =
      new Uint8ClampedArray(
        target
      );


    /*
      Remove extremely tiny isolated
      semi-transparent specks.
    */
    for (
      let y = 1;
      y <
      height - 1;
      y++
    ) {
      for (
        let x = 1;
        x <
        width - 1;
        x++
      ) {
        const index =
          getIndex(x, y);

        const alpha =
          firstPass[
            index + 3
          ];

        if (
          alpha === 0 ||
          alpha > 180
        ) {
          continue;
        }

        let visibleNeighbors =
          0;

        for (
          let offsetY = -1;
          offsetY <= 1;
          offsetY++
        ) {
          for (
            let offsetX = -1;
            offsetX <= 1;
            offsetX++
          ) {
            if (
              offsetX === 0 &&
              offsetY === 0
            ) {
              continue;
            }

            const neighborIndex =
              getIndex(
                x + offsetX,
                y + offsetY
              );

            if (
              firstPass[
                neighborIndex +
                  3
              ] > 30
            ) {
              visibleNeighbors++;
            }
          }
        }

        if (
          visibleNeighbors <=
          1
        ) {
          target[
            index + 3
          ] = 0;
        }
      }
    }


    context.putImageData(
      imageData,
      0,
      0
    );


    return await new Promise<Blob>(
      (resolve) => {
        canvas.toBlob(
          (blob) =>
            resolve(
              blob ||
                sourceBlob
            ),
          "image/png"
        );
      }
    );
  };


  const isolateMainSubject = async (
    sourceBlob: Blob
  ) => {
    const bitmap =
      await createImageBitmap(
        sourceBlob
      );

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      bitmap.width;

    canvas.height =
      bitmap.height;

    const context =
      canvas.getContext(
        "2d",
        {
          willReadFrequently:
            true,
        }
      );

    if (!context) {
      bitmap.close();
      return sourceBlob;
    }

    context.drawImage(
      bitmap,
      0,
      0
    );

    bitmap.close();

    const imageData =
      context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

    const data =
      imageData.data;

    const width =
      canvas.width;

    const height =
      canvas.height;

    const totalPixels =
      width * height;

    const alphaThreshold =
      24;

    const visited =
      new Uint8Array(
        totalPixels
      );

    const queue =
      new Int32Array(
        totalPixels
      );

    let largestSize = 0;
    let largestSeed = -1;


    const isVisible = (
      pixelIndex: number
    ) =>
      data[
        pixelIndex * 4 + 3
      ] >
      alphaThreshold;


    for (
      let start = 0;
      start < totalPixels;
      start++
    ) {
      if (
        visited[start] ||
        !isVisible(start)
      ) {
        continue;
      }

      let head = 0;
      let tail = 0;
      let componentSize = 0;

      queue[tail++] =
        start;

      visited[start] = 1;


      while (
        head < tail
      ) {
        const current =
          queue[head++];

        componentSize++;

        const x =
          current % width;

        const y =
          Math.floor(
            current / width
          );


        for (
          let offsetY = -1;
          offsetY <= 1;
          offsetY++
        ) {
          for (
            let offsetX = -1;
            offsetX <= 1;
            offsetX++
          ) {
            if (
              offsetX === 0 &&
              offsetY === 0
            ) {
              continue;
            }

            const nextX =
              x + offsetX;

            const nextY =
              y + offsetY;

            if (
              nextX < 0 ||
              nextY < 0 ||
              nextX >= width ||
              nextY >= height
            ) {
              continue;
            }

            const next =
              nextY *
                width +
              nextX;

            if (
              visited[next] ||
              !isVisible(next)
            ) {
              continue;
            }

            visited[next] = 1;

            queue[tail++] =
              next;
          }
        }
      }


      if (
        componentSize >
        largestSize
      ) {
        largestSize =
          componentSize;

        largestSeed =
          start;
      }
    }


    if (
      largestSeed < 0
    ) {
      return sourceBlob;
    }


    const keepMask =
      new Uint8Array(
        totalPixels
      );

    let head = 0;
    let tail = 0;

    queue[tail++] =
      largestSeed;

    keepMask[
      largestSeed
    ] = 1;


    while (
      head < tail
    ) {
      const current =
        queue[head++];

      const x =
        current % width;

      const y =
        Math.floor(
          current / width
        );


      for (
        let offsetY = -1;
        offsetY <= 1;
        offsetY++
      ) {
        for (
          let offsetX = -1;
          offsetX <= 1;
          offsetX++
        ) {
          if (
            offsetX === 0 &&
            offsetY === 0
          ) {
            continue;
          }

          const nextX =
            x + offsetX;

          const nextY =
            y + offsetY;

          if (
            nextX < 0 ||
            nextY < 0 ||
            nextX >= width ||
            nextY >= height
          ) {
            continue;
          }

          const next =
            nextY *
              width +
            nextX;

          if (
            keepMask[next] ||
            !isVisible(next)
          ) {
            continue;
          }

          keepMask[next] = 1;

          queue[tail++] =
            next;
        }
      }
    }


    /*
      Expand the selected subject slightly
      so soft anti-aliased edges and hair
      are not accidentally clipped.
    */
    let expandedMask =
      keepMask;

    for (
      let pass = 0;
      pass < 2;
      pass++
    ) {
      const nextMask =
        new Uint8Array(
          expandedMask
        );

      for (
        let y = 1;
        y < height - 1;
        y++
      ) {
        for (
          let x = 1;
          x < width - 1;
          x++
        ) {
          const index =
            y * width + x;

          if (
            expandedMask[index]
          ) {
            continue;
          }

          let nearbySubject =
            false;

          for (
            let offsetY = -1;
            offsetY <= 1 &&
            !nearbySubject;
            offsetY++
          ) {
            for (
              let offsetX = -1;
              offsetX <= 1;
              offsetX++
            ) {
              const neighbor =
                (y + offsetY) *
                  width +
                (x + offsetX);

              if (
                expandedMask[
                  neighbor
                ]
              ) {
                nearbySubject =
                  true;

                break;
              }
            }
          }

          if (
            nearbySubject
          ) {
            nextMask[index] = 1;
          }
        }
      }

      expandedMask =
        nextMask;
    }


    for (
      let pixel = 0;
      pixel < totalPixels;
      pixel++
    ) {
      if (
        !expandedMask[
          pixel
        ]
      ) {
        data[
          pixel * 4 + 3
        ] = 0;
      }
    }


    context.putImageData(
      imageData,
      0,
      0
    );


    return await new Promise<Blob>(
      (resolve) => {
        canvas.toBlob(
          (blob) =>
            resolve(
              blob ||
                sourceBlob
            ),
          "image/png"
        );
      }
    );
  };


  useEffect(() => {
    if (
      !resultUrl ||
      !previewUrl
    ) {
      return;
    }

    let cancelled =
      false;

    const setupEditor =
      async () => {
        const resultImage =
          new Image();

        const originalImage =
          new Image();

        resultImage.src =
          resultUrl;

        originalImage.src =
          previewUrl;

        await Promise.all([
          new Promise<void>(
            (resolve, reject) => {
              resultImage.onload =
                () => resolve();

              resultImage.onerror =
                () =>
                  reject(
                    new Error(
                      "Unable to load removed-background result."
                    )
                  );
            }
          ),

          new Promise<void>(
            (resolve, reject) => {
              originalImage.onload =
                () => resolve();

              originalImage.onerror =
                () =>
                  reject(
                    new Error(
                      "Unable to load original image."
                    )
                  );
            }
          ),
        ]);

        if (cancelled) {
          return;
        }

        const canvas =
          editorCanvasRef.current;

        if (!canvas) {
          return;
        }

        canvas.width =
          resultImage.naturalWidth;

        canvas.height =
          resultImage.naturalHeight;

        const context =
          canvas.getContext(
            "2d"
          );

        if (!context) {
          return;
        }

        context.clearRect(
          0,
          0,
          canvas.width,
          canvas.height
        );

        context.drawImage(
          resultImage,
          0,
          0,
          canvas.width,
          canvas.height
        );

        restoreImageRef.current =
          originalImage;

        setEditedUrl((current) => {
          if (
            current &&
            current !== resultUrl
          ) {
            URL.revokeObjectURL(
              current
            );
          }

          return resultUrl;
        });
      };

    setupEditor().catch(
      (error) => {
        console.error(
          "Editor setup error:",
          error
        );
      }
    );

    return () => {
      cancelled = true;
    };
  }, [resultUrl, previewUrl]);


  const getBrushPosition = (
    event:
      | React.PointerEvent<HTMLCanvasElement>
  ) => {
    const canvas =
      editorCanvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect =
      canvas.getBoundingClientRect();

    const scaleX =
      canvas.width /
      rect.width;

    const scaleY =
      canvas.height /
      rect.height;

    return {
      x:
        (event.clientX -
          rect.left) *
        scaleX,

      y:
        (event.clientY -
          rect.top) *
        scaleY,

      radius:
        (brushSize / 2) *
        ((scaleX +
          scaleY) /
          2),
    };
  };


  const paintBrush = (
    event:
      | React.PointerEvent<HTMLCanvasElement>
  ) => {
    if (
      !paintingRef.current
    ) {
      return;
    }

    const canvas =
      editorCanvasRef.current;

    const position =
      getBrushPosition(
        event
      );

    if (
      !canvas ||
      !position
    ) {
      return;
    }

    const context =
      canvas.getContext(
        "2d"
      );

    if (!context) {
      return;
    }

    context.save();

    context.beginPath();

    context.arc(
      position.x,
      position.y,
      position.radius,
      0,
      Math.PI * 2
    );

    context.closePath();


    if (
      brushMode ===
      "erase"
    ) {
      context.globalCompositeOperation =
        "destination-out";

      context.fillStyle =
        "#000000";

      context.fill();
    } else {
      const originalImage =
        restoreImageRef.current;

      if (
        originalImage
      ) {
        context.clip();

        context.globalCompositeOperation =
          "source-over";

        context.drawImage(
          originalImage,
          0,
          0,
          canvas.width,
          canvas.height
        );
      }
    }

    context.restore();
  };


  const startPainting = (
    event:
      React.PointerEvent<HTMLCanvasElement>
  ) => {
    event.preventDefault();

    paintingRef.current =
      true;

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    paintBrush(
      event
    );
  };


  const movePainting = (
    event:
      React.PointerEvent<HTMLCanvasElement>
  ) => {
    if (
      !paintingRef.current
    ) {
      return;
    }

    event.preventDefault();

    paintBrush(
      event
    );
  };


  const commitEditorResult =
    async () => {
      paintingRef.current =
        false;

      const canvas =
        editorCanvasRef.current;

      if (!canvas) {
        return;
      }

      const blob =
        await new Promise<Blob | null>(
          (resolve) => {
            canvas.toBlob(
              resolve,
              "image/png"
            );
          }
        );

      if (!blob) {
        return;
      }

      const nextUrl =
        URL.createObjectURL(
          blob
        );

      setEditedUrl((current) => {
        if (
          current &&
          current !== resultUrl
        ) {
          URL.revokeObjectURL(
            current
          );
        }

        return nextUrl;
      });
    };


  const stopPainting = () => {
    if (
      !paintingRef.current
    ) {
      return;
    }

    commitEditorResult();
  };

  const removeBackground =
    async () => {
      if (
        !file ||
        processing
      ) {
        return;
      }

      try {
        setProcessing(true);

        setProgress(1);

        setStatusMessage(
          "Preparing AI model..."
        );

        if (resultUrl) {
          URL.revokeObjectURL(
            resultUrl
          );

          setResultUrl("");
        }


        const {
          remove,
          newSession,
          rembgConfig,
        } = await import(
          "@bunnio/rembg-web"
        );


        rembgConfig.setCustomModelPath(
          "isnet-general-use",
          "https://huggingface.co/x-Liola-x/isnet-general-use-onnx/resolve/main/isnet-general-use.onnx"
        );


        setStatusMessage(
          "Loading background removal model..."
        );


        const session =
          await newSession(
            "isnet-general-use"
          );


        const result =
          await remove(
            file,
            {
              session,

              postProcessMask:
                true,

              onProgress:
                (info) => {
                  const nextProgress =
                    Math.max(
                      1,
                      Math.min(
                        100,
                        Math.round(
                          info.progress
                        )
                      )
                    );

                  setProgress(
                    nextProgress
                  );

                  if (
                    info.message
                  ) {
                    setStatusMessage(
                      info.message
                    );
                  }
                },
            }
          );


        setStatusMessage(
          "Refining subject edges..."
        );

        let finalResult =
          await refineTransparentEdges(
            result
          );

        if (
          subjectMode ===
          "main"
        ) {
          setStatusMessage(
            "Isolating main subject..."
          );

          finalResult =
            await isolateMainSubject(
              finalResult
            );
        }

        const url =
          URL.createObjectURL(
            finalResult
          );

        setResultUrl(
          url
        );

        setProgress(
          100
        );

        setStatusMessage(
          "Background removed successfully."
        );


        setTimeout(() => {
          document
            .getElementById(
              "background-result"
            )
            ?.scrollIntoView({
              behavior:
                "smooth",
              block:
                "center",
            });
        }, 150);

      } catch (error) {
        console.error(
          "Background removal error:",
          error
        );

        setProgress(
          0
        );

        setStatusMessage("");

        alert(
          "Unable to remove the background. Please try another image."
        );
      } finally {
        setProcessing(
          false
        );
      }
    };


  const baseName =
    file?.name.replace(
      /\.[^.]+$/,
      ""
    ) || "image";


  return (
    <main className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_top,#f5f3ff_0%,#f8fafc_38%,#f8fafc_100%)]">

      <section className="mx-auto max-w-[1450px] px-5 py-10">


        {/* Hero */}
        <div className="mx-auto max-w-4xl text-center">

          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-sm font-bold text-violet-700 shadow-sm">

            <Sparkles size={16} />

            AI Background Remover

          </div>


          <h1 className="mt-5 text-4xl font-black tracking-[-0.035em] text-slate-950 md:text-6xl">

            Remove image backgrounds.

            <span className="block bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
              Clean, transparent results.
            </span>

          </h1>


          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
            Automatically separate your subject from the background using AI directly in your browser.
          </p>

        </div>


        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const selected =
              event.target.files?.[0];

            if (
              selected
            ) {
              loadFile(
                selected
              );
            }

            event.target.value =
              "";
          }}
        />


        {!file ? (

          /* Upload */
          <div className="mx-auto mt-10 max-w-5xl rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">

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

                const dropped =
                  event.dataTransfer.files?.[0];

                if (
                  dropped
                ) {
                  loadFile(
                    dropped
                  );
                }
              }}
              className="group flex min-h-[340px] w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-violet-200 bg-[linear-gradient(135deg,#faf5ff_0%,#ffffff_48%,#eff6ff_100%)] px-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500 hover:shadow-[0_20px_60px_rgba(124,58,237,0.12)]"
            >

              <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-[0_12px_28px_rgba(124,58,237,0.30)]">

                <Upload size={27} />

              </div>


              <span className="mt-6 text-xl font-black text-slate-950">
                Choose an image
              </span>


              <span className="mt-2 text-sm text-slate-500">
                or drag and drop it here
              </span>


              <span className="mt-5 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm">
                JPG, PNG and WebP
              </span>

            </button>

          </div>

        ) : (

          <div className="mx-auto mt-10 max-w-6xl">


            {/* Main Card */}
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] md:p-6">


              {/* File Header */}
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex min-w-0 items-center gap-3">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">

                    <ImageIcon size={21} />

                  </div>


                  <div className="min-w-0">

                    <p className="truncate font-black text-slate-950">
                      {file.name}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Ready for AI background removal
                    </p>

                  </div>

                </div>


                <div className="flex gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      inputRef.current?.click()
                    }
                    disabled={
                      processing
                    }
                    className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
                  >
                    Change image
                  </button>


                  <button
                    type="button"
                    onClick={
                      clearImage
                    }
                    disabled={
                      processing
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    <X size={18} />
                  </button>

                </div>

              </div>


              {/* Subject Mode */}
              <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">

                <div className="text-center">

                  <p className="text-sm font-black text-slate-900">
                    Subject detection
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Choose how aggressively background objects should be removed.
                  </p>

                </div>


                <div className="mx-auto mt-4 grid max-w-2xl gap-3 sm:grid-cols-2">

                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => {
                      setSubjectMode("main");

                      if (resultUrl) {
                        URL.revokeObjectURL(
                          resultUrl
                        );

                        setResultUrl("");
                      }

                      setProgress(0);
                      setStatusMessage("");
                    }}
                    className={`rounded-2xl border px-5 py-4 text-center transition ${
                      subjectMode === "main"
                        ? "border-violet-600 bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-md"
                        : "border-slate-200 bg-white text-slate-700 hover:border-violet-300"
                    }`}
                  >
                    <p className="font-black">
                      Main Subject
                    </p>

                    <p
                      className={`mt-1 text-xs leading-5 ${
                        subjectMode === "main"
                          ? "text-violet-100"
                          : "text-slate-500"
                      }`}
                    >
                      Best for people, portraits and thumbnails with text or graphics.
                    </p>
                  </button>


                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => {
                      setSubjectMode(
                        "general"
                      );

                      if (resultUrl) {
                        URL.revokeObjectURL(
                          resultUrl
                        );

                        setResultUrl("");
                      }

                      setProgress(0);
                      setStatusMessage("");
                    }}
                    className={`rounded-2xl border px-5 py-4 text-center transition ${
                      subjectMode === "general"
                        ? "border-violet-600 bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-md"
                        : "border-slate-200 bg-white text-slate-700 hover:border-violet-300"
                    }`}
                  >
                    <p className="font-black">
                      General Object
                    </p>

                    <p
                      className={`mt-1 text-xs leading-5 ${
                        subjectMode === "general"
                          ? "text-violet-100"
                          : "text-slate-500"
                      }`}
                    >
                      Best for trucks, products and detailed objects where small parts should remain.
                    </p>
                  </button>

                </div>

              </div>


              {/* Preview */}
              <div className="mt-6 grid gap-5 lg:grid-cols-2">


                {/* Before */}
                <div>

                  <div className="mb-3 flex items-center justify-between">

                    <p className="text-sm font-black text-slate-900">
                      Original
                    </p>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
                      Before
                    </span>

                  </div>


                  <div className="flex min-h-[420px] items-center justify-center overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100 p-4">

                    <img
                      src={
                        previewUrl
                      }
                      alt="Original image"
                      className="max-h-[520px] max-w-full rounded-xl object-contain"
                    />

                  </div>

                </div>


                {/* After */}
                <div
                  id="background-result"
                >

                  <div className="mb-3 flex items-center justify-between">

                    <p className="text-sm font-black text-slate-900">
                      Background removed
                    </p>

                    <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-bold text-violet-700">
                      After
                    </span>

                  </div>
<div
                    className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-[24px] border border-slate-200 p-4"
                    style={{
                      backgroundColor:
                        "#ffffff",

                      backgroundImage:
                        "linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%)",

                      backgroundSize:
                        "28px 28px",

                      backgroundPosition:
                        "0 0,0 14px,14px -14px,-14px 0px",
                    }}
                  >

                    {resultUrl ? (

                      <img
                        src={
                          resultUrl
                        }
                        alt="Background removed"
                        className="relative z-10 max-h-[520px] max-w-full object-contain"
                      />

                    ) : (

                      <div className="max-w-xs text-center">

                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-white/90 text-violet-600 shadow-sm">

                          <Sparkles size={26} />

                        </div>

                        <p className="mt-5 font-black text-slate-800">
                          Transparent result will appear here
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Click Remove background and the AI will separate your subject automatically.
                        </p>

                      </div>

                    )}

                  </div>

                </div>

              </div>


              {/* Progress */}
              {processing && (

                <div className="mt-6 rounded-[22px] border border-violet-100 bg-violet-50/60 p-5">

                  <div className="flex items-center justify-between gap-4">

                    <div>

                      <p className="text-sm font-black text-slate-900">
                        AI is processing your image
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {statusMessage ||
                          "Please wait..."}
                      </p>

                    </div>

                    <span className="text-sm font-black text-violet-700">
                      {progress}%
                    </span>

                  </div>


                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-violet-100">

                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-600 transition-all duration-300"
                      style={{
                        width: `${progress}%`,
                      }}
                    />

                  </div>

                </div>

              )}


              {/* Success */}
              {resultUrl &&
                !processing && (

                  <div className="mt-6 rounded-[22px] border border-emerald-200 bg-emerald-50/60 px-5 py-4">

                    <p className="text-center text-sm font-bold text-emerald-700">
                      Background removed successfully. Your transparent PNG is ready.
                    </p>

                  </div>

                )}


              {/* Actions */}
              <div className="sticky bottom-4 z-30 mt-6 rounded-[24px] border border-violet-100 bg-white/95 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl">

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">


                  <div className="flex-1 text-center sm:text-left">

                    <p className="font-black text-slate-950">
                      {resultUrl
                        ? "Your image is ready"
                        : "Ready to remove background"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      AI processing runs directly in your browser.
                    </p>

                  </div>


                  <div className="flex flex-col gap-2 sm:flex-row">


                    {resultUrl && (

                      <a
                        href={
                          resultUrl
                        }
                        download={`background-removed-${baseName}.png`}
                        className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white transition hover:bg-slate-800"
                      >

                        <Download size={17} />

                        Download PNG

                      </a>

                    )}


                    <button
                      type="button"
                      onClick={
                        removeBackground
                      }
                      disabled={
                        processing
                      }
                      className="inline-flex min-w-[210px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3.5 text-sm font-black text-white shadow-[0_14px_35px_rgba(124,58,237,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                    >

                      <Sparkles size={18} />

                      {processing
                        ? "Removing..."
                        : resultUrl
                        ? "Remove again"
                        : "Remove background"}

                    </button>

                  </div>

                </div>

              </div>

            </div>

          </div>

        )}

      </section>

    </main>
  );
}
