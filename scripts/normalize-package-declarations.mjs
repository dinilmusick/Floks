import { readdir, readFile, writeFile, stat, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

async function walk(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(fullPath));
    else if (entry.isFile()) result.push(fullPath);
  }
  return result;
}

const packagesDirectory = path.resolve("packages");
for (const packageName of await readdir(packagesDirectory)) {
  const packageDirectory = path.join(packagesDirectory, packageName);
  if (!(await stat(packageDirectory)).isDirectory()) continue;
  const distDirectory = path.join(packageDirectory, "dist");
  const sourceDirectory = path.join(packageDirectory, "src");
  try {
    await stat(sourceDirectory);
    for (const sourceFile of await walk(sourceDirectory)) {
      if (path.extname(sourceFile) !== ".json") continue;
      const targetFile = path.join(distDirectory, path.relative(sourceDirectory, sourceFile));
      await mkdir(path.dirname(targetFile), { recursive: true });
      await copyFile(sourceFile, targetFile);
    }
  } catch {
    // Workspace package has no source directory or JSON assets.
  }
  try {
    await stat(distDirectory);
  } catch {
    continue;
  }

  for (const filePath of await walk(distDirectory)) {
    if (!filePath.endsWith(".js") && !filePath.endsWith(".d.ts")) continue;
    const original = await readFile(filePath, "utf8");
    let normalized = original
      .replaceAll("@kloks/", "@ultrst-armada/kloks/")
      .replaceAll("@floks/", "@ultrst-armada/floks/")
      .replaceAll("@ultrst/kloks/", "@ultrst-armada/kloks/")
      .replaceAll("@ultrst/floks/", "@ultrst-armada/floks/")
      .replaceAll('"kloks/', '"@ultrst-armada/kloks/')
      .replaceAll("'kloks/", "'@ultrst-armada/kloks/")
      .replaceAll('"floks/', '"@ultrst-armada/floks/')
      .replaceAll("'floks/", "'@ultrst-armada/floks/");

    if (filePath.endsWith(".d.ts")) {
      normalized = normalized
        .replace(/from '([.][.][/][^']+[.]json)'(?![ ]+with)/g, 'from "$1" with { type: "json" }')
        .replace(/from "([.][.][/][^"]+[.]json)"(?![ ]+with)/g, 'from "$1" with { type: "json" }');
      normalized = normalized.replace(
        /(\\bfrom\\s+)(["'])(\\.{1,2}\\/[^"']+\\.json)\\2(?!\\s+with)/g,
        '$1$2$3$2 with { type: "json" }'
      );
    }

    if (normalized !== original) await writeFile(filePath, normalized);
  }
}

console.log("Normalized published package aliases and NodeNext declaration specifiers.");
