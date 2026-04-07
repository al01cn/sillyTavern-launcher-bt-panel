"use strict";
var GSTInfo = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    getCharacterInfo: () => getCharacterInfo,
    getPresetsInfo: () => getPresetsInfo,
    getValueByPath: () => getValueByPath,
    getWorldInfo: () => getWorldInfo,
    isCharacterInfo: () => isCharacterInfo,
    isPresetsInfo: () => isPresetsInfo,
    isWorldInfo: () => isWorldInfo
  });
  var PNG_SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  var textDecoder = new TextDecoder("utf-8");
  function isNodeRuntime() {
    return typeof process !== "undefined" && Boolean(process.versions?.node);
  }
  async function readFileFromPath(path) {
    if (!isNodeRuntime()) {
      throw new Error("\u6D4F\u89C8\u5668\u73AF\u5883\u4E0D\u652F\u6301\u901A\u8FC7\u8DEF\u5F84\u8BFB\u53D6\u6587\u4EF6\uFF0C\u8BF7\u4F20\u5165 File\u3001Blob\u3001Uint8Array\uFF08Node Buffer\uFF09\u6216 ArrayBuffer");
    }
    const { readFile } = await import("node:fs/promises");
    const buffer = await readFile(path);
    return new Uint8Array(buffer);
  }
  async function inflateDeflate(input) {
    if (typeof DecompressionStream !== "undefined") {
      const stableInput = new Uint8Array(input);
      const stream = new Blob([stableInput]).stream().pipeThrough(new DecompressionStream("deflate"));
      const output = await new Response(stream).arrayBuffer();
      return new Uint8Array(output);
    }
    if (isNodeRuntime()) {
      const { inflateSync } = await import("node:zlib");
      return inflateSync(input);
    }
    throw new Error("\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301 zlib \u89E3\u538B");
  }
  function decodeBase64ToText(value) {
    if (typeof atob === "function") {
      const binary = atob(value);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return textDecoder.decode(bytes);
    }
    const bufferLike = globalThis.Buffer;
    if (bufferLike) {
      return textDecoder.decode(bufferLike.from(value, "base64"));
    }
    throw new Error("\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301 Base64 \u89E3\u7801");
  }
  function asUint8Array(input) {
    if (input instanceof Uint8Array) {
      return input;
    }
    return new Uint8Array(input);
  }
  function isArrayBufferReadable(value) {
    if (!value || typeof value !== "object") {
      return false;
    }
    return typeof value.arrayBuffer === "function";
  }
  async function readInputBytes(input) {
    if (typeof input === "string") {
      return readFileFromPath(input);
    }
    if (isArrayBufferReadable(input)) {
      return new Uint8Array(await input.arrayBuffer());
    }
    return asUint8Array(input);
  }
  function bufferStartsWith(buffer, signature) {
    if (buffer.length < signature.length) {
      return false;
    }
    for (let i = 0; i < signature.length; i += 1) {
      if (buffer[i] !== signature[i]) {
        return false;
      }
    }
    return true;
  }
  function findNullByteIndex(buffer, start) {
    for (let i = start; i < buffer.length; i += 1) {
      if (buffer[i] === 0) {
        return i;
      }
    }
    return -1;
  }
  function parseJsonCandidate(value) {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
      return { value: parsed };
    } catch {
      return null;
    }
  }
  function parseBase64JsonCandidate(value) {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    let normalized = trimmed.replace(/\s+/g, "");
    if (!/^[A-Za-z0-9+/=_-]+$/.test(normalized)) {
      return null;
    }
    normalized = normalized.replace(/-/g, "+").replace(/_/g, "/");
    const remainder = normalized.length % 4;
    if (remainder === 2) {
      normalized += "==";
    } else if (remainder === 3) {
      normalized += "=";
    } else if (remainder === 1) {
      return null;
    }
    try {
      const decoded = decodeBase64ToText(normalized);
      return parseJsonCandidate(decoded);
    } catch {
      return null;
    }
  }
  function parseTextPayload(payload) {
    const separator = findNullByteIndex(payload, 0);
    if (separator < 0 || separator + 1 >= payload.length) {
      return null;
    }
    return textDecoder.decode(payload.subarray(separator + 1));
  }
  async function parseZtxtPayload(payload) {
    const separator = findNullByteIndex(payload, 0);
    if (separator < 0 || separator + 2 > payload.length) {
      return null;
    }
    const compressionMethod = payload[separator + 1];
    if (compressionMethod !== 0) {
      return null;
    }
    try {
      const decompressed = await inflateDeflate(payload.subarray(separator + 2));
      return textDecoder.decode(decompressed);
    } catch {
      return null;
    }
  }
  async function parseItxtPayload(payload) {
    const keywordEnd = findNullByteIndex(payload, 0);
    if (keywordEnd < 0 || keywordEnd + 5 > payload.length) {
      return null;
    }
    const compressionFlag = payload[keywordEnd + 1];
    const compressionMethod = payload[keywordEnd + 2];
    let cursor = keywordEnd + 3;
    const languageTagEnd = findNullByteIndex(payload, cursor);
    if (languageTagEnd < 0) {
      return null;
    }
    cursor = languageTagEnd + 1;
    const translatedKeywordEnd = findNullByteIndex(payload, cursor);
    if (translatedKeywordEnd < 0) {
      return null;
    }
    cursor = translatedKeywordEnd + 1;
    const textData = payload.subarray(cursor);
    if (compressionFlag === 1) {
      if (compressionMethod !== 0) {
        return null;
      }
      try {
        const decompressed = await inflateDeflate(textData);
        return textDecoder.decode(decompressed);
      } catch {
        return null;
      }
    }
    return textDecoder.decode(textData);
  }
  async function extractTextChunksFromPng(bytes) {
    if (!bufferStartsWith(bytes, PNG_SIGNATURE)) {
      throw new Error("\u6587\u4EF6\u4E0D\u662F\u6709\u6548\u7684 PNG");
    }
    const texts = [];
    let offset = PNG_SIGNATURE.length;
    while (offset + 12 <= bytes.length) {
      const chunkLength = bytes[offset] << 24 | bytes[offset + 1] << 16 | bytes[offset + 2] << 8 | bytes[offset + 3];
      const type = String.fromCharCode(
        bytes[offset + 4],
        bytes[offset + 5],
        bytes[offset + 6],
        bytes[offset + 7]
      );
      const dataStart = offset + 8;
      const dataEnd = dataStart + chunkLength;
      const crcEnd = dataEnd + 4;
      if (chunkLength < 0 || crcEnd > bytes.length) {
        break;
      }
      const payload = bytes.subarray(dataStart, dataEnd);
      let parsed = null;
      if (type === "tEXt") {
        parsed = parseTextPayload(payload);
      } else if (type === "zTXt") {
        parsed = await parseZtxtPayload(payload);
      } else if (type === "iTXt") {
        parsed = await parseItxtPayload(payload);
      }
      if (parsed) {
        texts.push(parsed);
      }
      offset = crcEnd;
      if (type === "IEND") {
        break;
      }
    }
    return texts;
  }
  async function parseJsonFromPng(bytes) {
    const textChunks = await extractTextChunksFromPng(bytes);
    const keywordPriority = ["chara", "ccv3", "character", "card"];
    const prioritized = [...textChunks].sort((a, b) => {
      const ai = keywordPriority.findIndex((k) => a.toLowerCase().includes(k));
      const bi = keywordPriority.findIndex((k) => b.toLowerCase().includes(k));
      const aa = ai < 0 ? Number.MAX_SAFE_INTEGER : ai;
      const bb = bi < 0 ? Number.MAX_SAFE_INTEGER : bi;
      return aa - bb;
    });
    for (const value of prioritized) {
      const direct = parseJsonCandidate(value);
      if (direct) {
        return direct;
      }
      const decoded = parseBase64JsonCandidate(value);
      if (decoded) {
        return decoded;
      }
    }
    throw new Error("\u672A\u5728 PNG \u4E2D\u627E\u5230\u53EF\u89E3\u6790\u7684\u89D2\u8272\u5361 JSON");
  }
  function parseJsonFromText(text) {
    const direct = parseJsonCandidate(text);
    if (direct) {
      return direct;
    }
    const decoded = parseBase64JsonCandidate(text);
    if (decoded) {
      return decoded;
    }
    throw new Error("\u6587\u4EF6\u5185\u5BB9\u4E0D\u662F\u6709\u6548 JSON");
  }
  async function parseAnyJson(input) {
    const bytes = await readInputBytes(input);
    if (bufferStartsWith(bytes, PNG_SIGNATURE)) {
      return await parseJsonFromPng(bytes);
    }
    return parseJsonFromText(textDecoder.decode(bytes));
  }
  function asObject(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
    return null;
  }
  function asString(value) {
    return typeof value === "string" ? value : "";
  }
  function asStringArray(value) {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((item) => typeof item === "string");
  }
  function asNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : void 0;
  }
  function asBoolean(value) {
    return typeof value === "boolean" ? value : void 0;
  }
  function isJsonObjectValue(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }
  function parsePath(path) {
    if (Array.isArray(path)) {
      return path;
    }
    const normalized = path.replace(/\[(\d+)\]/g, ".$1");
    return normalized.split(".").map((segment) => segment.trim()).filter((segment) => segment.length > 0).map((segment) => /^\d+$/.test(segment) ? Number(segment) : segment);
  }
  function getValueByPath(source, path, defaultValue) {
    const segments = parsePath(path);
    if (segments.length === 0) {
      if (source === void 0) {
        return defaultValue;
      }
      return source;
    }
    let current = source;
    for (const segment of segments) {
      if (typeof segment === "number") {
        if (!Array.isArray(current) || segment < 0 || segment >= current.length) {
          return defaultValue;
        }
        current = current[segment];
        continue;
      }
      if (!isJsonObjectValue(current) || !(segment in current)) {
        return defaultValue;
      }
      current = current[segment];
    }
    if (current === void 0) {
      return defaultValue;
    }
    return current;
  }
  function pickString(source, keys) {
    if (!source) {
      return "";
    }
    for (const key of keys) {
      const value = source[key];
      if (typeof value === "string" && value.length > 0) {
        return value;
      }
    }
    return "";
  }
  function extractWorldRawFromParsed(parsed) {
    const directKeys = ["character_book", "worldbook", "world_info", "lorebook"];
    for (const key of directKeys) {
      const candidate = asObject(parsed[key]);
      if (candidate) {
        return candidate;
      }
    }
    const data = asObject(parsed.data);
    if (data) {
      for (const key of directKeys) {
        const candidate = asObject(data[key]);
        if (candidate) {
          return candidate;
        }
      }
    }
    const extensions = data ? asObject(data.extensions) : asObject(parsed.extensions);
    if (extensions) {
      const extensionKeys = ["world", "worldbook", "character_book", "lorebook"];
      for (const key of extensionKeys) {
        const candidate = asObject(extensions[key]);
        if (candidate) {
          return candidate;
        }
      }
    }
    return parsed;
  }
  function normalizeWorldEntry(entry) {
    return {
      raw: entry,
      uid: typeof entry.uid === "number" || typeof entry.uid === "string" ? entry.uid : void 0,
      keys: asStringArray(entry.keys),
      secondaryKeys: asStringArray(entry.secondary_keys),
      comment: asString(entry.comment),
      content: asString(entry.content),
      enabled: entry.enabled !== false,
      order: asNumber(entry.order),
      position: typeof entry.position === "number" || typeof entry.position === "string" ? entry.position : void 0,
      probability: asNumber(entry.probability),
      depth: asNumber(entry.depth)
    };
  }
  function createWorldInfo(raw) {
    const entriesRaw = Array.isArray(raw.entries) ? raw.entries : [];
    const entries = entriesRaw.map((entry) => asObject(entry)).filter((entry) => entry !== null).map((entry) => normalizeWorldEntry(entry));
    return {
      raw,
      name: pickString(raw, ["name", "title", "world_name"]),
      entries,
      entryCount: entries.length
    };
  }
  function createCharacterInfo(raw) {
    const data = asObject(raw.data);
    const worldRaw = extractWorldRawFromParsed(raw);
    const worldEntries = Array.isArray(worldRaw.entries) ? worldRaw.entries : [];
    const worldInfo = worldEntries.length > 0 ? createWorldInfo(worldRaw) : null;
    const tagsFromData = asStringArray(data?.tags);
    const tags = tagsFromData.length > 0 ? tagsFromData : asStringArray(raw.tags);
    return {
      raw,
      data,
      name: pickString(data, ["name"]) || pickString(raw, ["name"]),
      description: pickString(data, ["description"]) || pickString(raw, ["description"]),
      personality: pickString(data, ["personality"]) || pickString(raw, ["personality"]),
      scenario: pickString(data, ["scenario"]) || pickString(raw, ["scenario"]),
      firstMessage: pickString(data, ["first_mes", "firstMessage"]) || pickString(raw, ["first_mes", "firstMessage"]),
      exampleMessages: pickString(data, ["mes_example", "example_messages"]) || pickString(raw, ["mes_example", "example_messages"]),
      tags,
      creatorComment: pickString(data, ["creator_notes", "creatorcomment"]) || pickString(raw, ["creator_notes", "creatorcomment"]),
      avatar: pickString(data, ["avatar"]) || pickString(raw, ["avatar"]),
      spec: pickString(raw, ["spec"]),
      specVersion: pickString(raw, ["spec_version"]),
      worldInfo
    };
  }
  function resolvePresetModel(raw, source) {
    const bySource = {
      openai: "openai_model",
      claude: "claude_model",
      windowai: "windowai_model",
      openrouter: "openrouter_model",
      ai21: "ai21_model",
      mistralai: "mistralai_model",
      cohere: "cohere_model",
      perplexity: "perplexity_model",
      groq: "groq_model",
      zerooneai: "zerooneai_model",
      blockentropy: "blockentropy_model",
      custom: "custom_model",
      google: "google_model"
    };
    const modelKey = bySource[source];
    if (modelKey && typeof raw[modelKey] === "string") {
      return asString(raw[modelKey]);
    }
    const fallbackKeys = Object.values(bySource);
    for (const key of fallbackKeys) {
      if (typeof raw[key] === "string" && asString(raw[key]).length > 0) {
        return asString(raw[key]);
      }
    }
    return "";
  }
  function createPresetsInfo(raw) {
    const source = pickString(raw, ["chat_completion_source"]);
    return {
      raw,
      source,
      model: resolvePresetModel(raw, source),
      temperature: asNumber(raw.temperature),
      topP: asNumber(raw.top_p),
      topK: asNumber(raw.top_k),
      minP: asNumber(raw.min_p),
      maxContext: asNumber(raw.openai_max_context),
      maxTokens: asNumber(raw.openai_max_tokens),
      seed: asNumber(raw.seed),
      stream: asBoolean(raw.stream_openai)
    };
  }
  async function getCharacterInfo(input) {
    const raw = await parseAnyJson(input);
    return createCharacterInfo(raw);
  }
  async function getWorldInfo(input) {
    const parsed = await parseAnyJson(input);
    const worldRaw = extractWorldRawFromParsed(parsed);
    return createWorldInfo(worldRaw);
  }
  async function getPresetsInfo(input) {
    const raw = await parseAnyJson(input);
    return createPresetsInfo(raw);
  }
  function isCharacterInfo(value) {
    if (!isJsonObjectValue(value)) {
      return false;
    }
    return isJsonObjectValue(value.raw) && typeof value.name === "string" && Array.isArray(value.tags) && "worldInfo" in value;
  }
  function isWorldInfo(value) {
    if (!isJsonObjectValue(value)) {
      return false;
    }
    return isJsonObjectValue(value.raw) && typeof value.name === "string" && Array.isArray(value.entries);
  }
  function isPresetsInfo(value) {
    if (!isJsonObjectValue(value)) {
      return false;
    }
    return isJsonObjectValue(value.raw) && typeof value.source === "string" && typeof value.model === "string";
  }
  return __toCommonJS(index_exports);
})();
