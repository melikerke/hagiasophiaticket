#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { syncConsolidations } from "./consolidations.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
console.log("Consolidations:", syncConsolidations(root));
