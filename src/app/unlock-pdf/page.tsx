"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  FileText,
  UnlockKeyhole,
  Eye,
  EyeOff,
  Download,
  Trash2,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  AlertCircle,
  LockKeyhole,
  Search,
  WandSparkles,
} from "lucide-react";
import {
  decryptPDF,
  isEncrypted,
} from "@pdfsmaller/pdf-decrypt";

type EncryptionInfo = {
  encrypted: boolean;
  algorithm?: "AES-256" | "RC4";
  keyLength?: number;
};

type Mode = "known" | "recovery";

const MAX_RECOVERY_ATTEMPTS = 5000;

function capitalize(value: string) {
  if (!value) return value;

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1).toLowerCase()
  );
}

function uniqueValues(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

export default function UnlockPdfPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);

  const [sourceBytes, setSourceBytes] =
    useState<Uint8Array<ArrayBuffer> | null>(
      null
    );

  const [mode, setMode] =
    useState<Mode>("known");

  const [password, setPassword] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [checking, setChecking] =
    useState(false);

  const [unlocking, setUnlocking] =
    useState(false);

  const [
    encryptionInfo,
    setEncryptionInfo,
  ] = useState<EncryptionInfo | null>(
    null
  );

  const [error, setError] =
    useState("");

  const [
    unlockedUrl,
    setUnlockedUrl,
  ] = useState("");

  const [
    unlockedName,
    setUnlockedName,
  ] = useState("");

  const [possibleWords, setPossibleWords] =
    useState("");

  const [
    possibleNumbers,
    setPossibleNumbers,
  ] = useState("");

  const [
    includeCaseVariants,
    setIncludeCaseVariants,
  ] = useState(true);

  const [
    includeSeparators,
    setIncludeSeparators,
  ] = useState(true);

  const [
    recovering,
    setRecovering,
  ] = useState(false);

  const [
    recoveryProgress,
    setRecoveryProgress,
  ] = useState(0);

  const [
    recoveryTotal,
    setRecoveryTotal,
  ] = useState(0);

  const [
    recoveredPassword,
    setRecoveredPassword,
  ] = useState("");

  useEffect(() => {
    return () => {
      if (unlockedUrl) {
        URL.revokeObjectURL(
          unlockedUrl
        );
      }
    };
  }, [unlockedUrl]);

  const formatSize = (
    bytes: number
  ) => {
    if (bytes < 1024 * 1024) {
      return `${(
        bytes / 1024
      ).toFixed(0)} KB`;
    }

    return `${(
      bytes /
      1024 /
      1024
    ).toFixed(2)} MB`;
  };

  const clearUnlockedFile = () => {
    if (unlockedUrl) {
      URL.revokeObjectURL(
        unlockedUrl
      );
    }

    setUnlockedUrl("");
    setUnlockedName("");
  };

  const resetTool = () => {
    clearUnlockedFile();

    setFile(null);
    setSourceBytes(null);

    setMode("known");

    setPassword("");
    setShowPassword(false);

    setChecking(false);
    setUnlocking(false);

    setEncryptionInfo(null);
    setError("");

    setPossibleWords("");
    setPossibleNumbers("");

    setIncludeCaseVariants(true);
    setIncludeSeparators(true);

    setRecovering(false);
    setRecoveryProgress(0);
    setRecoveryTotal(0);
    setRecoveredPassword("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleFile = async (
    selectedFile?: File
  ) => {
    if (!selectedFile) return;

    const validPdf =
      selectedFile.type ===
        "application/pdf" ||
      selectedFile.name
        .toLowerCase()
        .endsWith(".pdf");

    if (!validPdf) {
      setError(
        "Please select a valid PDF file."
      );
      return;
    }

    try {
      setChecking(true);
      setError("");

      clearUnlockedFile();

      setFile(selectedFile);
      setPassword("");
      setRecoveredPassword("");
      setRecoveryProgress(0);
      setRecoveryTotal(0);

      const bytes =
        new Uint8Array(
          await selectedFile.arrayBuffer()
        );

      setSourceBytes(bytes);

      const info =
        await isEncrypted(bytes);

      setEncryptionInfo(info);

      if (!info.encrypted) {
        setError(
          "This PDF is not password protected."
        );
      }
    } catch (err) {
      console.error(err);

      setFile(null);
      setSourceBytes(null);
      setEncryptionInfo(null);

      setError(
        "Unable to inspect this PDF. Please try another file."
      );
    } finally {
      setChecking(false);
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const createUnlockedFile = (
    decryptedBytes:
      | Uint8Array
      | ArrayBuffer,
    name: string
  ) => {
    clearUnlockedFile();

    const pdfArray =
      decryptedBytes instanceof
      Uint8Array
        ? new Uint8Array(
            decryptedBytes
          )
        : new Uint8Array(
            decryptedBytes
          );

    const blob = new Blob(
      [
        pdfArray.buffer.slice(
          pdfArray.byteOffset,
          pdfArray.byteOffset +
            pdfArray.byteLength
        ),
      ],
      {
        type: "application/pdf",
      }
    );

    const url =
      URL.createObjectURL(blob);

    setUnlockedUrl(url);
    setUnlockedName(name);
  };

  const unlockPdf = async () => {
    if (!file || !sourceBytes) {
      return;
    }

    if (
      !encryptionInfo?.encrypted
    ) {
      setError(
        "This PDF does not appear to be password protected."
      );
      return;
    }

    if (!password) {
      setError(
        "Please enter the PDF password."
      );
      return;
    }

    try {
      setUnlocking(true);
      setError("");

      clearUnlockedFile();

      const decryptedBytes =
        await decryptPDF(
          sourceBytes.slice(),
          password
        );

      const baseName =
        file.name.replace(
          /\.pdf$/i,
          ""
        );

      createUnlockedFile(
        decryptedBytes,
        `${baseName}-unlocked.pdf`
      );
    } catch (err) {
      console.error(err);

      setError(
        "Incorrect password or unsupported PDF encryption."
      );
    } finally {
      setUnlocking(false);
    }
  };

  const recoveryCandidates =
    useMemo(() => {
      const words = uniqueValues(
        possibleWords.split(/[\n,]/)
      ).slice(0, 8);

      const numbers = uniqueValues(
        possibleNumbers.split(/[\n,]/)
      ).slice(0, 12);

      const separators =
        includeSeparators
          ? ["", "@", "#", "_", "-", "."]
          : [""];

      const candidates =
        new Set<string>();

      const add = (value: string) => {
        const clean =
          value.trim();

        if (
          clean &&
          candidates.size <
            MAX_RECOVERY_ATTEMPTS
        ) {
          candidates.add(clean);
        }
      };

      for (const originalWord of words) {
        const wordVariants =
          includeCaseVariants
            ? uniqueValues([
                originalWord,
                originalWord.toLowerCase(),
                originalWord.toUpperCase(),
                capitalize(originalWord),
              ])
            : [originalWord];

        for (const word of wordVariants) {
          add(word);

          for (const number of numbers) {
            add(number);

            for (const separator of separators) {
              add(
                `${word}${separator}${number}`
              );

              add(
                `${number}${separator}${word}`
              );
            }
          }
        }
      }

      if (words.length >= 2) {
        for (
          let first = 0;
          first < words.length;
          first += 1
        ) {
          for (
            let second = 0;
            second < words.length;
            second += 1
          ) {
            if (first === second) {
              continue;
            }

            for (const separator of separators) {
              add(
                `${words[first]}${separator}${words[second]}`
              );
            }
          }
        }
      }

      return Array.from(
        candidates
      ).slice(
        0,
        MAX_RECOVERY_ATTEMPTS
      );
    }, [
      possibleWords,
      possibleNumbers,
      includeCaseVariants,
      includeSeparators,
    ]);

  const startRecovery = async () => {
    if (!file || !sourceBytes) {
      return;
    }

    if (
      !encryptionInfo?.encrypted
    ) {
      setError(
        "This PDF is not password protected."
      );
      return;
    }

    if (
      recoveryCandidates.length === 0
    ) {
      setError(
        "Enter at least one possible word or password clue."
      );
      return;
    }

    try {
      setRecovering(true);
      setError("");
      setRecoveredPassword("");
      setRecoveryProgress(0);

      clearUnlockedFile();

      setRecoveryTotal(
        recoveryCandidates.length
      );

      for (
        let index = 0;
        index <
        recoveryCandidates.length;
        index += 1
      ) {
        const candidate =
          recoveryCandidates[index];

        setRecoveryProgress(
          index + 1
        );

        try {
          const decryptedBytes =
            await decryptPDF(
              sourceBytes.slice(),
              candidate
            );

          const baseName =
            file.name.replace(
              /\.pdf$/i,
              ""
            );

          setRecoveredPassword(
            candidate
          );

          setPassword(candidate);

          createUnlockedFile(
            decryptedBytes,
            `${baseName}-recovered-unlocked.pdf`
          );

          return;
        } catch {
          // Candidate did not match.
        }

        if (
          (index + 1) % 20 ===
          0
        ) {
          await new Promise<void>(
            (resolve) => {
              setTimeout(
                resolve,
                0
              );
            }
          );
        }
      }

      setError(
        `No match found in ${recoveryCandidates.length.toLocaleString()} generated variations. Add better clues and try again.`
      );
    } finally {
      setRecovering(false);
    }
  };

  const downloadUnlockedPdf =
    () => {
      if (!unlockedUrl) return;

      const link =
        document.createElement("a");

      link.href = unlockedUrl;

      link.download =
        unlockedName ||
        "unlocked.pdf";

      document.body.appendChild(
        link
      );

      link.click();
      link.remove();
    };

  const progressPercent =
    recoveryTotal > 0
      ? Math.round(
          (recoveryProgress /
            recoveryTotal) *
            100
        )
      : 0;

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <UnlockKeyhole
              size={30}
            />
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Unlock PDF
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Unlock a protected PDF using
            your password, or recover it
            from password clues you remember.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs font-semibold text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Normal unlock
            </span>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Forgot password mode
            </span>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Browser processing
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(event) =>
            handleFile(
              event.target.files?.[0]
            )
          }
        />

        {!file ? (
          <div>
            <button
              type="button"
              onClick={() =>
                inputRef.current?.click()
              }
              className="group flex min-h-[390px] w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-blue-200 bg-white px-6 text-center shadow-sm transition hover:border-blue-400 hover:bg-blue-50/30"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 transition group-hover:-translate-y-1">
                <Upload size={28} />
              </div>

              <h2 className="mt-6 text-2xl font-bold text-slate-900">
                Upload protected PDF
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                Select a password-protected
                PDF that you own or have
                permission to modify.
              </p>

              <span className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-100">
                Select PDF file
              </span>
            </button>
          </div>
        ) : (
          <div className="grid gap-7 lg:grid-cols-[1fr_350px]">
            <div>
              <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                      <FileText
                        size={25}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900">
                        {file.name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {formatSize(
                          file.size
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={resetTool}
                    disabled={
                      unlocking ||
                      recovering
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600"
                  >
                    <Trash2
                      size={16}
                    />
                    Remove
                  </button>
                </div>

                {checking ? (
                  <div className="mt-6 flex items-center gap-3 rounded-2xl bg-blue-50 p-4">
                    <Loader2
                      size={20}
                      className="animate-spin text-blue-600"
                    />

                    <p className="text-sm font-semibold text-blue-900">
                      Checking PDF security...
                    </p>
                  </div>
                ) : (
                  <>
                    {encryptionInfo?.encrypted && (
                      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <LockKeyhole
                          size={20}
                          className="mt-0.5 text-emerald-700"
                        />

                        <div>
                          <p className="text-sm font-bold text-emerald-900">
                            Password protection detected
                          </p>

                          <p className="mt-1 text-xs text-emerald-700">
                            {encryptionInfo.algorithm ||
                              "Encrypted PDF"}
                            {encryptionInfo.keyLength
                              ? ` · ${encryptionInfo.keyLength}-bit`
                              : ""}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setMode("known");
                          setError("");
                        }}
                        className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                          mode ===
                          "known"
                            ? "bg-white text-blue-700 shadow-sm"
                            : "text-slate-500"
                        }`}
                      >
                        I know password
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMode(
                            "recovery"
                          );
                          setError("");
                        }}
                        className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                          mode ===
                          "recovery"
                            ? "bg-white text-blue-700 shadow-sm"
                            : "text-slate-500"
                        }`}
                      >
                        Forgot password?
                      </button>
                    </div>

                    {mode === "known" ? (
                      <div className="mt-6">
                        <div className="flex items-center gap-2">
                          <KeyRound
                            size={19}
                            className="text-blue-600"
                          />

                          <h2 className="font-bold text-slate-900">
                            Enter PDF password
                          </h2>
                        </div>

                        <div className="relative mt-4">
                          <input
                            type={
                              showPassword
                                ? "text"
                                : "password"
                            }
                            value={
                              password
                            }
                            onChange={(
                              event
                            ) => {
                              setPassword(
                                event
                                  .target
                                  .value
                              );
                              setError("");
                            }}
                            placeholder="Enter password"
                            className="w-full rounded-xl border border-slate-300 px-4 py-3.5 pr-12 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword(
                                (
                                  current
                                ) =>
                                  !current
                              )
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                          >
                            {showPassword ? (
                              <EyeOff
                                size={
                                  18
                                }
                              />
                            ) : (
                              <Eye
                                size={
                                  18
                                }
                              />
                            )}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={
                            unlockPdf
                          }
                          disabled={
                            unlocking
                          }
                          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          {unlocking ? (
                            <>
                              <Loader2
                                size={
                                  18
                                }
                                className="animate-spin"
                              />
                              Unlocking...
                            </>
                          ) : (
                            <>
                              <UnlockKeyhole
                                size={
                                  18
                                }
                              />
                              Unlock PDF
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="mt-6">
                        <div className="flex items-center gap-2">
                          <WandSparkles
                            size={20}
                            className="text-blue-600"
                          />

                          <h2 className="font-bold text-slate-900">
                            Password Recovery
                          </h2>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Enter words and
                          numbers you think
                          may have been used
                          in your password.
                        </p>

                        <div className="mt-5">
                          <label className="text-sm font-bold text-slate-800">
                            Possible words
                          </label>

                          <textarea
                            value={
                              possibleWords
                            }
                            onChange={(
                              event
                            ) => {
                              setPossibleWords(
                                event
                                  .target
                                  .value
                              );
                              setError("");
                            }}
                            rows={3}
                            placeholder="Example: Aliha, Invoice, Yamacom"
                            className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          />

                          <p className="mt-1 text-xs text-slate-400">
                            Separate multiple
                            clues with commas.
                          </p>
                        </div>

                        <div className="mt-4">
                          <label className="text-sm font-bold text-slate-800">
                            Possible numbers
                          </label>

                          <input
                            value={
                              possibleNumbers
                            }
                            onChange={(
                              event
                            ) => {
                              setPossibleNumbers(
                                event
                                  .target
                                  .value
                              );
                              setError("");
                            }}
                            placeholder="Example: 786, 2026, 123"
                            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          />
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3">
                            <input
                              type="checkbox"
                              checked={
                                includeCaseVariants
                              }
                              onChange={(
                                event
                              ) =>
                                setIncludeCaseVariants(
                                  event
                                    .target
                                    .checked
                                )
                              }
                              className="h-4 w-4 accent-blue-600"
                            />

                            <span className="text-sm font-semibold text-slate-700">
                              Capitalization variants
                            </span>
                          </label>

                          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3">
                            <input
                              type="checkbox"
                              checked={
                                includeSeparators
                              }
                              onChange={(
                                event
                              ) =>
                                setIncludeSeparators(
                                  event
                                    .target
                                    .checked
                                )
                              }
                              className="h-4 w-4 accent-blue-600"
                            />

                            <span className="text-sm font-semibold text-slate-700">
                              @ # _ - separators
                            </span>
                          </label>
                        </div>

                        <div className="mt-5 rounded-xl bg-slate-50 p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">
                              Variations to test
                            </span>

                            <span className="font-bold text-slate-900">
                              {recoveryCandidates.length.toLocaleString()}
                            </span>
                          </div>

                          <p className="mt-2 text-xs leading-5 text-slate-400">
                            Maximum{" "}
                            {MAX_RECOVERY_ATTEMPTS.toLocaleString()}{" "}
                            clue-based
                            combinations per
                            attempt.
                          </p>
                        </div>

                        {recovering && (
                          <div className="mt-5">
                            <div className="flex justify-between text-xs font-semibold text-slate-600">
                              <span>
                                Testing{" "}
                                {recoveryProgress.toLocaleString()}{" "}
                                /{" "}
                                {recoveryTotal.toLocaleString()}
                              </span>

                              <span>
                                {
                                  progressPercent
                                }
                                %
                              </span>
                            </div>

                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-blue-600 transition-all"
                                style={{
                                  width: `${progressPercent}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={
                            startRecovery
                          }
                          disabled={
                            recovering ||
                            recoveryCandidates.length ===
                              0
                          }
                          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {recovering ? (
                            <>
                              <Loader2
                                size={
                                  18
                                }
                                className="animate-spin"
                              />
                              Testing variations...
                            </>
                          ) : (
                            <>
                              <Search
                                size={
                                  18
                                }
                              />
                              Try My Password Clues
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {error && (
                      <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <AlertCircle
                          size={17}
                          className="mt-0.5 shrink-0"
                        />
                        {error}
                      </div>
                    )}
                  </>
                )}
              </div>

              {unlockedUrl && (
                <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
                  <div className="flex gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                      <CheckCircle2
                        size={22}
                      />
                    </div>

                    <div>
                      <h3 className="font-bold text-emerald-950">
                        PDF unlocked successfully
                      </h3>

                      {recoveredPassword && (
                        <p className="mt-2 text-sm text-emerald-800">
                          Matching password:
                          <span className="ml-2 rounded bg-white px-2 py-1 font-mono font-bold">
                            {
                              recoveredPassword
                            }
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={
                      downloadUnlockedPdf
                    }
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-emerald-700"
                  >
                    <Download
                      size={18}
                    />
                    Download Unlocked PDF
                  </button>
                </div>
              )}
            </div>

            <aside>
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <ShieldCheck
                  size={22}
                  className="text-blue-600"
                />

                <h3 className="mt-3 text-lg font-bold text-slate-950">
                  Recovery privacy
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  PDF data, passwords and
                  recovery clues are tested
                  locally in your browser.
                </p>

                <div className="mt-5 rounded-2xl bg-blue-50 p-4">
                  <p className="text-sm font-bold text-blue-900">
                    Forgot-password mode
                  </p>

                  <p className="mt-1 text-xs leading-5 text-blue-700">
                    Best when you remember
                    parts of your original
                    password such as names,
                    years or numbers.
                  </p>
                </div>

                <div className="mt-4 rounded-2xl bg-amber-50 p-4">
                  <p className="text-sm font-bold text-amber-900">
                    No magic bypass
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    Strong unknown passwords
                    cannot simply be removed.
                    Recovery checks only the
                    clues you provide.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
