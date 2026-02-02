import { platform, release, tmpdir } from "node:os";
import path from "node:path";
import { $ } from "bun";

import clipboardy from "clipboardy";

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

async function read(): Promise<ClipboardContent | undefined> {
  const os = platform();

  if (os === "darwin") {
    const tmpfile = path.join(tmpdir(), "ai-sdk-tui-clipboard.png");
    try {
      await $`osascript -e 'set imageData to the clipboard as "PNGf"' -e 'set fileRef to open for access POSIX file "${tmpfile}" with write permission' -e 'set eof fileRef to 0' -e 'write imageData to fileRef' -e 'close access fileRef'`
        .nothrow()
        .quiet();
      const file = Bun.file(tmpfile);
      const buffer = await file.arrayBuffer();
      return {
        data: Buffer.from(buffer).toString("base64"),
        mime: "image/png",
      };
    } catch {
      // No image in clipboard or osascript failed
    } finally {
      await $`rm -f "${tmpfile}"`.nothrow().quiet();
    }
  }

  if (os === "win32" || release().includes("WSL")) {
    const script =
      "Add-Type -AssemblyName System.Windows.Forms; $img = [System.Windows.Forms.Clipboard]::GetImage(); if ($img) { $ms = New-Object System.IO.MemoryStream; $img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); [System.Convert]::ToBase64String($ms.ToArray()) }";
    const base64 =
      await $`powershell.exe -NonInteractive -NoProfile -command "${script}"`
        .nothrow()
        .text();
    if (base64) {
      const imageBuffer = Buffer.from(base64.trim(), "base64");
      if (imageBuffer.length > 0) {
        return { data: imageBuffer.toString("base64"), mime: "image/png" };
      }
    }
  }

  if (os === "linux") {
    const wayland = await $`wl-paste -t image/png`.nothrow().arrayBuffer();
    if (wayland && wayland.byteLength > 0) {
      return {
        data: Buffer.from(wayland).toString("base64"),
        mime: "image/png",
      };
    }
    const x11 = await $`xclip -selection clipboard -t image/png -o`
      .nothrow()
      .arrayBuffer();
    if (x11 && x11.byteLength > 0) {
      return { data: Buffer.from(x11).toString("base64"), mime: "image/png" };
    }
  }

  const text = await clipboardy.read().catch(() => {
    /* ignored */
  });
  if (text) {
    return { data: text, mime: "text/plain" };
  }
}

const getCopyMethod = lazy(() => {
  const os = platform();

  if (os === "darwin" && Bun.which("osascript")) {
    return async (text: string) => {
      const escaped = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      await $`osascript -e 'set the clipboard to "${escaped}"'`
        .nothrow()
        .quiet();
    };
  }

  if (os === "linux") {
    if (process.env.WAYLAND_DISPLAY && Bun.which("wl-copy")) {
      return async (text: string) => {
        const proc = Bun.spawn(["wl-copy"], {
          stdin: "pipe",
          stdout: "ignore",
          stderr: "ignore",
        });
        proc.stdin.write(text);
        proc.stdin.end();
        await proc.exited.catch(() => {
          /* ignored */
        });
      };
    }
    if (Bun.which("xclip")) {
      return async (text: string) => {
        const proc = Bun.spawn(["xclip", "-selection", "clipboard"], {
          stdin: "pipe",
          stdout: "ignore",
          stderr: "ignore",
        });
        proc.stdin.write(text);
        proc.stdin.end();
        await proc.exited.catch(() => {
          /* ignored */
        });
      };
    }
    if (Bun.which("xsel")) {
      return async (text: string) => {
        const proc = Bun.spawn(["xsel", "--clipboard", "--input"], {
          stdin: "pipe",
          stdout: "ignore",
          stderr: "ignore",
        });
        proc.stdin.write(text);
        proc.stdin.end();
        await proc.exited.catch(() => {
          /* ignored */
        });
      };
    }
  }

  if (os === "win32") {
    return async (text: string) => {
      // Pipe via stdin to avoid PowerShell string interpolation ($env:FOO, $(), etc.)
      const proc = Bun.spawn(
        [
          "powershell.exe",
          "-NonInteractive",
          "-NoProfile",
          "-Command",
          "[Console]::InputEncoding = [System.Text.Encoding]::UTF8; Set-Clipboard -Value ([Console]::In.ReadToEnd())",
        ],
        {
          stdin: "pipe",
          stdout: "ignore",
          stderr: "ignore",
        }
      );

      proc.stdin.write(text);
      proc.stdin.end();
      await proc.exited.catch(() => {
        /* ignored */
      });
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
