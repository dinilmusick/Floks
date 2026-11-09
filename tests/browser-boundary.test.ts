import {describe, expect, it} from "vitest";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relativePath: string) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

describe("Floks browser/server dependency boundary", () => {
  it("does not declare backend implementation packages in browser package dependencies", () => {
    const rootPkg = readJson("package.json");
    const uiPkg = readJson("packages/ui/package.json");
    const canvasPkg = readJson("packages/canvas-ui/package.json");

    for (const pkg of [rootPkg, uiPkg, canvasPkg]) {
      expect(pkg.dependencies ?? {}).not.toHaveProperty("@ultrst-armada/kloks");
      expect(pkg.dependencies ?? {}).not.toHaveProperty("@ultrst-armada/krnl");
      expect(pkg.peerDependencies ?? {}).not.toHaveProperty("@ultrst-armada/kloks");
      expect(pkg.peerDependencies ?? {}).not.toHaveProperty("@ultrst-armada/krnl");
    }
    expect(rootPkg.dependencies["@dinilmusick/gutts"]).toBe("^2.0.0");
    expect(uiPkg.dependencies["@dinilmusick/gutts"]).toBe("^2.0.0");
    expect(rootPkg.dependencies["@ultrst-armada/frnlts"]).toBe("^0.5.6");
  });

  it("routes Luth authentication through GutTS instead of Kloks", () => {
    const source = fs.readFileSync(path.join(root, "packages/ui/src/components/auth/LuthAuthClient.ts"), "utf8");
    expect(source).toContain("@dinilmusick/gutts/auth");
    expect(source).not.toContain("@ultrst-armada/kloks");
    expect(source).not.toContain("@ultrst-armada/krnl");
  });

  it("keeps service UI components and editor UI adapter-driven", () => {
    const serviceFiles = [
      "packages/ui/src/components/services/ClockServicePanel.tsx",
      "packages/ui/src/components/services/MidiServicePanel.tsx",
      "packages/ui/src/components/services/OscServicePanel.tsx",
    ];
    for (const file of serviceFiles) {
      const source = fs.readFileSync(path.join(root, file), "utf8");
      expect(source).not.toContain("@ultrst-armada/kloks");
      expect(source).not.toContain("@ultrst-armada/krnl");
    }
    const editor = fs.readFileSync(path.join(root, "packages/canvas-ui/src/editor/MonacoEditor.tsx"), "utf8");
    expect(editor).not.toContain("@ultrst-armada/kloks");
    expect(editor).not.toContain("@ultrst-armada/krnl");
  });

  it("keeps the built auth surface free of backend implementation imports", () => {
    const authDir = path.join(root, "packages/ui/dist/components/auth");
    const files = fs.readdirSync(path.join(root, "packages/ui/dist"), {recursive: true})
      .filter((file) => String(file).endsWith(".js"))
      .map((file) => path.join(root, "packages/ui/dist", String(file)));
    const built = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
    expect(fs.existsSync(path.join(authDir, "index.js"))).toBe(true);
    expect(built).toContain("LuthAuthClient");
    expect(built).not.toContain("@ultrst-armada/kloks");
    expect(built).not.toContain("@ultrst-armada/krnl");
    expect(built).not.toMatch(/node:/);
    expect(built).not.toMatch(/@aws-sdk\//);
    expect(built).not.toContain("googleapis");
  });
});
