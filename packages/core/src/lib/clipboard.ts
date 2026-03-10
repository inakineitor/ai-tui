import { spawn } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import { platform, release, tmpdir } from "node:os";
import path from "node:path";

import clipboardy from "clipboardy";
import { execa } from "execa";
import which from "which";

/**
 * Lazy evaluation utility - caches the result of a function on first call.
 */
function lazy<T>(fn: () => T): () => T {
  let cached: T | undefined;
  let initialized = false;
  return () => {
    if (!initialized) {
      cached = fn();
      initialized = true;
    }
    return cached as T;
  };
}

/**
 * Writes text to clipboard via OSC 52 escape sequence.
 * This allows clipboard operations to work over SSH by having
 * the terminal emulator handle the clipboard locally.
 */
function writeOsc52(text: string): void {
  if (!process.stdout.isTTY) {
    return;
  }
  const base64 = Buffer.from(text).toString("base64");
  const osc52 = `\x1b]52;c;${base64}\x07`;
  // tmux and screen require DCS passthrough wrapping
  const passthrough = process.env.TMUX || process.env.STY;
  const sequence = passthrough ? `\x1bPtmux;\x1b${osc52}\x1b\\` : osc52;
  process.stdout.write(sequence);
}

export type ClipboardContent = {
  data: string;
  mime: string;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Multi-platform clipboard reading requires handling Darwin, Windows/WSL, and Linux with different tools
async function read(): Promise<ClipboardContent | undefined> {
  const os = platform();

  if (os === "darwin") {
    const tmpfile = path.join(tmpdir(), "ai-sdk-tui-clipboard.png");
    try {
      await execa("osascript", [
        "-e",
        'set imageData to the clipboard as "PNGf"',
        "-e",
        `set fileRef to open for access POSIX file "${tmpfile}" with write permission`,
        "-e",
        "set eof fileRef to 0",
        "-e",
        "write imageData to fileRef",
        "-e",
        "close access fileRef",
      ]).catch(() => {
        /* osascript failed */
      });
      const buffer = await readFile(tmpfile);
      if (buffer.length > 0) {
        return {
          data: buffer.toString("base64"),
          mime: "image/png",
        };
      }
    } catch {
      // No image in clipboard or osascript failed
    } finally {
      await rm(tmpfile, { force: true }).catch(() => {
        /* ignore cleanup errors */
      });
    }
  }

  if (os === "win32" || release().includes("WSL")) {
    const script =
      "Add-Type -AssemblyName System.Windows.Forms; $img = [System.Windows.Forms.Clipboard]::GetImage(); if ($img) { $ms = New-Object System.IO.MemoryStream; $img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); [System.Convert]::ToBase64String($ms.ToArray()) }";
    const result = await execa(
      "powershell.exe",
      ["-NonInteractive", "-NoProfile", "-command", script],
      { reject: false }
    );
    const base64 = result.stdout;
    if (base64) {
      const imageBuffer = Buffer.from(base64.trim(), "base64");
      if (imageBuffer.length > 0) {
        return { data: imageBuffer.toString("base64"), mime: "image/png" };
      }
    }
  }

  if (os === "linux") {
    const imageMimeTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "image/bmp",
    ] as const;

    // Try Wayland first
    const waylandTypes = await execa("wl-paste", ["--list-types"], {
      reject: false,
    });
    if (waylandTypes.stdout) {
      const available = waylandTypes.stdout.split("\n");
      for (const mime of imageMimeTypes) {
        if (available.includes(mime)) {
          const result = await execa("wl-paste", ["-t", mime], {
            reject: false,
            encoding: "buffer",
          });
          if (result.stdout && result.stdout.length > 0) {
            return {
              data: Buffer.from(result.stdout).toString("base64"),
              mime,
            };
          }
        }
      }
    }

    // Try X11
    const x11Targets = await execa(
      "xclip",
      ["-selection", "clipboard", "-t", "TARGETS", "-o"],
      { reject: false }
    );
    if (x11Targets.stdout) {
      const available = x11Targets.stdout.split("\n");
      for (const mime of imageMimeTypes) {
        if (available.includes(mime)) {
          const result = await execa(
            "xclip",
            ["-selection", "clipboard", "-t", mime, "-o"],
            { reject: false, encoding: "buffer" }
          );
          if (result.stdout && result.stdout.length > 0) {
            return {
              data: Buffer.from(result.stdout).toString("base64"),
              mime,
            };
          }
        }
      }
    }
  }

  const text = await clipboardy.read().catch(() => {
    /* ignored */
  });
  if (text) {
    return { data: text, mime: "text/plain" };
  }
}

/**
 * Helper to spawn a process with stdin pipe and write data to it.
 */
function spawnWithStdin(
  command: string,
  args: string[],
  data: string
): Promise<void> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      stdio: ["pipe", "ignore", "ignore"],
    });
    proc.stdin.write(data);
    proc.stdin.end();
    proc.on("close", () => resolve());
    proc.on("error", () => resolve());
  });
}

const getCopyMethod = lazy(() => {
  const os = platform();

  if (os === "darwin" && which.sync("osascript", { nothrow: true })) {
    return async (text: string) => {
      const escaped = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      await execa("osascript", ["-e", `set the clipboard to "${escaped}"`], {
        reject: false,
      }).catch(() => {
        /* ignored */
      });
    };
  }

  if (os === "linux") {
    if (
      process.env.WAYLAND_DISPLAY &&
      which.sync("wl-copy", { nothrow: true })
    ) {
      return async (text: string) => {
        await spawnWithStdin("wl-copy", [], text);
      };
    }
    if (which.sync("xclip", { nothrow: true })) {
      return async (text: string) => {
        await spawnWithStdin("xclip", ["-selection", "clipboard"], text);
      };
    }
    if (which.sync("xsel", { nothrow: true })) {
      return async (text: string) => {
        await spawnWithStdin("xsel", ["--clipboard", "--input"], text);
      };
    }
  }

  if (os === "win32") {
    return async (text: string) => {
      // Pipe via stdin to avoid PowerShell string interpolation ($env:FOO, $(), etc.)
      await spawnWithStdin(
        "powershell.exe",
        [
          "-NonInteractive",
          "-NoProfile",
          "-Command",
          "[Console]::InputEncoding = [System.Text.Encoding]::UTF8; Set-Clipboard -Value ([Console]::In.ReadToEnd())",
        ],
        text
      );
    };
  }

  return async (text: string) => {
    await clipboardy.write(text).catch(() => {
      /* ignored */
    });
  };
});

async function copy(text: string): Promise<void> {
  writeOsc52(text);
  await getCopyMethod()(text);
}

export const Clipboard = {
  read,
  copy,
};
