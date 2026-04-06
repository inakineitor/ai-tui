/**
 * Diagnostic: verify coordinate system alignment between
 * node-screenshots capture dimensions, sharp resize, and nut-js mouse.
 */

import fs from "node:fs";

import { Point, mouse } from "@nut-tree-fork/nut-js";
import { Monitor } from "node-screenshots";
import sharp from "sharp";

mouse.config.autoDelayMs = 0;

const m = Monitor.all().find((m) => m.isPrimary())!;
console.log("Monitor logical:", m.width(), "x", m.height());
console.log("Scale factor:", m.scaleFactor());

const img = m.captureImageSync();
console.log("Captured image (physical):", img.width, "x", img.height);

const png = img.toPngSync();
const resized = await sharp(png)
  .resize(m.width(), m.height(), { fit: "fill" })
  .png()
  .toBuffer();
const meta = await sharp(resized).metadata();
console.log("Resized image:", meta.width, "x", meta.height);

// Save for inspection
fs.writeFileSync("/tmp/diag-original.png", png);
fs.writeFileSync("/tmp/diag-resized.png", resized);
console.log("Saved /tmp/diag-original.png and /tmp/diag-resized.png");

// Test mouse movement
console.log("\nTesting mouse movement...");
const targets = [
  { name: "top-left", x: 100, y: 100 },
  {
    name: "center",
    x: Math.round(m.width() / 2),
    y: Math.round(m.height() / 2),
  },
  { name: "bottom-right", x: m.width() - 100, y: m.height() - 100 },
];

for (const t of targets) {
  await mouse.setPosition(new Point(t.x, t.y));
  await new Promise((r) => setTimeout(r, 300));
  const pos = await mouse.getPosition();
  const dx = pos.x - t.x;
  const dy = pos.y - t.y;
  console.log(
    `  ${t.name}: target=(${t.x},${t.y}) actual=(${pos.x},${pos.y}) delta=(${dx},${dy})`
  );
}
