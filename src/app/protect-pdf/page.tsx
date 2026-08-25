"use client";

import { useEffect, useRef, useState } from "react";
import {
  Upload,
  FileText,
  LockKeyhole,
  Eye,
  EyeOff,
  Download,
  Trash2,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  AlertCircle,
} from "lucide-react";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt";

export default function ProtectPdfPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [protecting, setProtecting] = useState(false);
  const [error, setError] = useState("");

  const [protectedUrl, setProtectedUrl] = useState("");
  const [protectedName, setProtectedName] = useState("");

  useEffect(() => {
    return () => {
      if (protectedUrl) {
        URL.revokeObjectURL(protectedUrl);
      }
    };
  }, [protectedUrl]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }

    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const handleFile = (selectedFile?: File) => {
    if (!selectedFile) return;

    const isPdf =
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setError("Please select a valid PDF file.");
      return;
    }

    if (protectedUrl) {
      URL.revokeObjectURL(protectedUrl);
    }

    setFile(selectedFile);
    setPassword("");
    setConfirmPassword("");
    setProtectedUrl("");
    setProtectedName("");
    setError("");
  };

  const resetTool = () => {
    if (protectedUrl) {
      URL.revokeObjectURL(protectedUrl);
    }

    setFile(null);
    setPassword("");
    setConfirmPassword("");
    setProtectedUrl("");
    setProtectedName("");
    setError("");
    setProtecting(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const getPasswordStrength = () => {
    if (!password) {
      return {
        label: "",
        level: 0,
      };
    }

    let score = 0;

    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) {
      return {
        label: "Weak",
        level: 1,
      };
    }

    if (score <= 4) {
      return {
        label: "Good",
        level: 2,
      };
    }

    return {
      label: "Strong",
      level: 3,
    };
  };

  const passwordStrength = getPasswordStrength();

  const protectPdf = async () => {
    if (!file) return;

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Password should contain at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setProtecting(true);
      setError("");

      if (protectedUrl) {
        URL.revokeObjectURL(protectedUrl);
        setProtectedUrl("");
      }

      const sourceBytes = new Uint8Array(
        await file.arrayBuffer()
      );

      const encryptedBytes = await encryptPDF(
        sourceBytes,
        password,
        {
          algorithm: "AES-256",
        }
      );

      const pdfArray =
        new Uint8Array(encryptedBytes);

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

      const baseName =
        file.name.replace(/\.pdf$/i, "");

      setProtectedUrl(url);
      setProtectedName(
        `${baseName}-protected.pdf`
      );
    } catch (err) {
      console.error(err);

      setError(
        "Unable to protect this PDF. Please try another PDF."
      );
    } finally {
      setProtecting(false);
    }
  };

  const downloadProtectedPdf = () => {
    if (!protectedUrl) return;

    const link =
      document.createElement("a");

    link.href = protectedUrl;
    link.download =
      protectedName || "protected.pdf";

    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <LockKeyhole size={30} />
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Protect PDF
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Add a secure password to your PDF
            and prevent unauthorized access.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs font-semibold text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              AES-256 encryption
            </span>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Password protected
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
            handleFile(event.target.files?.[0])
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
                Upload your PDF
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                Choose the PDF you want to secure
                with password protection.
              </p>

              <span className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-100">
                Select PDF file
              </span>

              <p className="mt-4 text-xs text-slate-400">
                Your PDF stays in your browser
              </p>
            </button>

            {error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-7 lg:grid-cols-[1fr_380px]">
            <div>
              <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                      <FileText size={25} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-slate-900">
                        {file.name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {formatSize(file.size)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={resetTool}
                    disabled={protecting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-6">
                  <div className="flex items-center gap-2">
                    <KeyRound
                      size={20}
                      className="text-blue-600"
                    />

                    <h2 className="text-lg font-bold text-slate-950">
                      Set PDF password
                    </h2>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Anyone opening this PDF will
                    need to enter this password.
                  </p>

                  <div className="mt-6">
                    <label className="text-sm font-bold text-slate-800">
                      Password
                    </label>

                    <div className="relative mt-2">
                      <input
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        value={password}
                        onChange={(event) => {
                          setPassword(
                            event.target.value
                          );
                          setProtectedUrl("");
                          setError("");
                        }}
                        placeholder="Enter password"
                        autoComplete="new-password"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 pr-12 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (current) =>
                              !current
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>

                    {password && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-500">
                            Password strength
                          </p>

                          <p
                            className={`text-xs font-bold ${
                              passwordStrength.level === 1
                                ? "text-red-600"
                                : passwordStrength.level === 2
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                            }`}
                          >
                            {passwordStrength.label}
                          </p>
                        </div>

                        <div className="mt-2 grid grid-cols-3 gap-1.5">
                          {[1, 2, 3].map(
                            (level) => (
                              <div
                                key={level}
                                className={`h-1.5 rounded-full ${
                                  passwordStrength.level >=
                                  level
                                    ? passwordStrength.level === 1
                                      ? "bg-red-500"
                                      : passwordStrength.level === 2
                                        ? "bg-amber-500"
                                        : "bg-emerald-500"
                                    : "bg-slate-200"
                                }`}
                              />
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-5">
                    <label className="text-sm font-bold text-slate-800">
                      Confirm password
                    </label>

                    <div className="relative mt-2">
                      <input
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        value={confirmPassword}
                        onChange={(event) => {
                          setConfirmPassword(
                            event.target.value
                          );
                          setProtectedUrl("");
                          setError("");
                        }}
                        placeholder="Enter password again"
                        autoComplete="new-password"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 pr-12 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(
                            (current) =>
                              !current
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>

                    {confirmPassword &&
                      password ===
                        confirmPassword && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                          <CheckCircle2 size={14} />
                          Passwords match
                        </div>
                      )}
                  </div>

                  {error && (
                    <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      <AlertCircle
                        size={17}
                        className="mt-0.5 shrink-0"
                      />

                      {error}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={protectPdf}
                    disabled={protecting}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {protecting ? (
                      <>
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                        Protecting PDF...
                      </>
                    ) : (
                      <>
                        <LockKeyhole size={18} />
                        Protect PDF
                      </>
                    )}
                  </button>
                </div>
              </div>

              {protectedUrl && (
                <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                      <CheckCircle2 size={22} />
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-emerald-950">
                        PDF protected successfully
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-emerald-700">
                        Your PDF now requires the
                        password you selected.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={
                      downloadProtectedPdf
                    }
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    <Download size={18} />
                    Download Protected PDF
                  </button>
                </div>
              )}
            </div>

            <aside>
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <ShieldCheck
                    size={21}
                    className="text-blue-600"
                  />

                  <h3 className="text-lg font-bold text-slate-950">
                    PDF security
                  </h3>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-900">
                      AES-256 encryption
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Strong modern encryption is
                      used to protect the PDF.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-900">
                      Password required
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      The protected file will ask
                      for its password when opened
                      in compatible PDF readers.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-900">
                      Browser processing
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Protection happens locally
                      on your device.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[24px] border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                  <KeyRound
                    size={20}
                    className="mt-0.5 shrink-0 text-amber-700"
                  />

                  <div>
                    <p className="text-sm font-bold text-amber-900">
                      Keep your password safe
                    </p>

                    <p className="mt-1 text-xs leading-5 text-amber-800">
                      You will need the password
                      later to open the protected
                      document.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <ShieldCheck
            size={20}
            className="mx-auto text-emerald-600"
          />

          <p className="mt-2 text-sm font-bold text-slate-900">
            Private & secure
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Your PDF and password are processed
            locally in your browser and are not
            uploaded to a conversion server.
          </p>
        </div>
      </section>
    </main>
  );
}
