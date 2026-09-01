import "server-only";

import type { NextRequest } from "next/server";

import { HNS_ACCEPTED_EXTENSIONS, HNS_MAX_FILE_BYTES } from "@/config/import";
import { ApiError } from "@/lib/api/errors";
import { readExcelGrid } from "@/lib/import/excel-reader";
import { parseHnsOutstanding, parseHnsRows, type HnsParseResult } from "@/lib/import/hns-parser";

/**
 * Turns an uploaded H&S export into parsed rows.
 *
 * Shared by the preview and import routes so both read a file exactly the same
 * way — the import re-parses from scratch rather than trusting anything the
 * browser sends back.
 */

export interface UploadedExport {
  readonly fileName: string;
  readonly result: HnsParseResult;
  readonly format: "xls" | "xlsx" | "csv";
  readonly sheetName: string | null;
}

function hasAcceptedExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return HNS_ACCEPTED_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

/**
 * Reads the uploaded workbook and parses it.
 *
 * Accepts `multipart/form-data` (what the admin UI sends) and a raw binary
 * body. The format is decided from the file's own leading bytes, not its
 * extension, so a renamed file is rejected rather than half-parsed.
 */
export async function readUploadedExport(
  request: NextRequest,
): Promise<UploadedExport> {
  const contentType = request.headers.get("content-type") ?? "";
  let bytes: Uint8Array;
  let fileName = "upload";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new ApiError(
        { code: "VALIDATION_ERROR", message: "No file was uploaded." },
        400,
      );
    }
    if (file.size === 0) {
      throw new ApiError(
        { code: "VALIDATION_ERROR", message: "That file is empty." },
        400,
      );
    }
    if (file.size > HNS_MAX_FILE_BYTES) {
      throw new ApiError(
        {
          code: "VALIDATION_ERROR",
          message: `That file is larger than the ${Math.round(HNS_MAX_FILE_BYTES / 1024 / 1024)} MB limit.`,
        },
        413,
      );
    }
    if (!hasAcceptedExtension(file.name)) {
      throw new ApiError(
        {
          code: "VALIDATION_ERROR",
          message: `Unsupported file type. Upload the ${HNS_ACCEPTED_EXTENSIONS.join(" or ")} exported from H&S.`,
        },
        415,
      );
    }

    fileName = file.name;
    bytes = new Uint8Array(await file.arrayBuffer());
  } else {
    const buffer = await request.arrayBuffer();
    if (buffer.byteLength === 0) {
      throw new ApiError(
        { code: "VALIDATION_ERROR", message: "The upload was empty." },
        400,
      );
    }
    if (buffer.byteLength > HNS_MAX_FILE_BYTES) {
      throw new ApiError(
        { code: "VALIDATION_ERROR", message: "That file is too large to import." },
        413,
      );
    }
    bytes = new Uint8Array(buffer);
  }

  // A CSV body is still accepted for anything already saved that way; the
  // admin UI only ever sends a workbook.
  const looksLikeText = bytes[0] !== 0xd0 && bytes[0] !== 0x50;
  if (looksLikeText) {
    const text = new TextDecoder("utf-8").decode(bytes);
    return {
      fileName,
      result: parseHnsOutstanding(text),
      format: "csv",
      sheetName: null,
    };
  }

  const { rows, sheetName, format } = readExcelGrid(bytes);
  return { fileName, result: parseHnsRows(rows), format, sheetName };
}
