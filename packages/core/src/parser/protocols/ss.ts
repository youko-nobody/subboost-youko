/**
 * Shadowsocks (SS) 协议解析器
 * 
 * 支持格式:
 * - ss://base64(method:password)@server:port#name
 * - ss://base64(method:password@server:port)#name
 * - SIP002: ss://base64(method:password)@server:port/?plugin=xxx#name
 */

import { decodeBase64, safeDecodeBase64 } from "../base64";
import type { SSNode } from "@subboost/core/types/node";
import { safeDecodeFormUrlEncoded, safeDecodeURIComponent } from "./url-decode";
import { parseJsonObject } from "../json-utils";

function splitSsPluginParam(input: string): string[] {
  const out: string[] = [];
  let current = "";

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === "\\") {
      const next = input[i + 1];
      if (next === ";" || next === "=" || next === "\\") {
        current += next;
        i += 1;
        continue;
      }
      if (next !== undefined) {
        // 其他转义保持原样（避免误伤）
        current += `\\${next}`;
        i += 1;
        continue;
      }
      current += "\\";
      continue;
    }
    if (ch === ";") {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }

  out.push(current);
  return out;
}

export function normalizeSsPlugin(
  plugin: string | undefined,
  pluginOpts: Record<string, unknown> | undefined
): { plugin?: string; pluginOpts?: Record<string, unknown> } {
  const rawPlugin = (plugin ?? "").trim();
  if (!rawPlugin) return { plugin: undefined, pluginOpts: undefined };

  const normalizedName = rawPlugin.toLowerCase();
  const opts = pluginOpts && typeof pluginOpts === "object" ? pluginOpts : undefined;

  const isObfs = normalizedName === "obfs" || normalizedName === "obfs-local" || normalizedName === "simple-obfs";
  if (!isObfs) {
    const boolish = (value: unknown): boolean | undefined => {
      if (typeof value === "boolean") return value;
      if (typeof value === "number" && Number.isFinite(value)) {
        if (value === 0) return false;
        if (value === 1) return true;
        return undefined;
      }
      if (typeof value !== "string") return undefined;
      const s = value.trim().toLowerCase();
      if (!s) return undefined;
      if (s === "0" || s === "false" || s === "off" || s === "no") return false;
      if (s === "1" || s === "true" || s === "on" || s === "yes") return true;
      return undefined;
    };

    const isV2rayPlugin = normalizedName === "v2ray-plugin" || normalizedName === "xray-plugin";
    const isGostPlugin = normalizedName === "gost-plugin";
    if (!isV2rayPlugin && !isGostPlugin) {
      return { plugin: rawPlugin, pluginOpts };
    }

    if (!opts) {
      return { plugin: normalizedName, pluginOpts };
    }

    const nextOpts: Record<string, unknown> = { ...opts };
    for (const key of ["mux", "tls"]) {
      const b = boolish(nextOpts[key]);
      if (b !== undefined) nextOpts[key] = b;
    }

    return {
      plugin: normalizedName,
      pluginOpts: nextOpts,
    };
  }

  const pickString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

  // SIP002: obfs-local;obfs=tls;obfs-host=example.com
  // Clash/Mihomo: plugin: obfs, plugin-opts: { mode: tls, host: example.com }
  const mode = pickString(opts?.mode) || pickString(opts?.obfs);
  const host = pickString(opts?.host) || pickString(opts?.["obfs-host"]) || pickString(opts?.["obfs_host"]);

  const nextOpts: Record<string, unknown> = {};
  if (mode) nextOpts.mode = mode;
  if (host) nextOpts.host = host;

  return {
    plugin: "obfs",
    pluginOpts: Object.keys(nextOpts).length > 0 ? nextOpts : undefined,
  };
}

function parseBoolish(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

function parseV2rayPluginJsonParam(value: string): Record<string, unknown> | undefined {
  const raw = value.trim();
  if (!raw) return undefined;

  const decoded = safeDecodeBase64(raw) ?? raw;
  return parseJsonObject(decoded) ?? undefined;
}

function isBase64Key(value: string, expectedBytes: 16 | 32): boolean {
  const normalized = value.trim().replace(/-/g, "+").replace(/_/g, "/");
  if (!normalized || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) return false;

  const firstPadding = normalized.indexOf("=");
  if (firstPadding !== -1 && /[^=]/.test(normalized.slice(firstPadding))) return false;

  const unpaddedLength = normalized.replace(/=+$/, "").length;
  return Math.floor((unpaddedLength * 6) / 8) === expectedBytes;
}

/**
 * Some SS2022 providers append a plain-text tag after the Base64 key(s)
 * inside the fully encoded payload, for example:
 *   serverKey:userKey#PROVIDER
 *
 * That tag is not part of an SS2022 password and makes Surge reject the
 * generated proxy. Strip it only after the part before `#` is proven to be
 * a valid one- or two-key SS2022 password, leaving ordinary SS passwords
 * untouched.
 */
function normalizeSs2022Password(cipher: string, password: string): string {
  const normalizedCipher = cipher.trim().toLowerCase();
  const expectedBytes =
    normalizedCipher === "2022-blake3-aes-128-gcm"
      ? 16
      : normalizedCipher === "2022-blake3-aes-256-gcm"
        ? 32
        : undefined;
  if (!expectedBytes) return password;

  const hashIndex = password.lastIndexOf("#");
  if (hashIndex <= 0 || hashIndex === password.length - 1) return password;

  const candidate = password.slice(0, hashIndex);
  const keyParts = candidate.split(":");
  if (
    (keyParts.length !== 1 && keyParts.length !== 2) ||
    !keyParts.every((key) => isBase64Key(key, expectedBytes))
  ) {
    return password;
  }

  return candidate;
}

export function parseSS(uri: string): SSNode {
  if (!uri.startsWith("ss://")) {
    throw new Error("无效的 SS 链接");
  }

  const content = uri.slice(5);
  
  // 提取名称（#后面的部分）
  const hashIndex = content.indexOf("#");
  let name = "SS 节点";
  let mainPart = content;
  
  if (hashIndex !== -1) {
    name = safeDecodeFormUrlEncoded(content.slice(hashIndex + 1));
    mainPart = content.slice(0, hashIndex);
  }

  // 提取插件参数（?后面的部分）
  const queryIndex = mainPart.indexOf("?");
  let plugin: string | undefined;
  let pluginOpts: Record<string, unknown> | undefined;
  let queryParams: URLSearchParams | undefined;
  
  if (queryIndex !== -1) {
    const queryString = mainPart.slice(queryIndex + 1);
    mainPart = mainPart.slice(0, queryIndex);
    
    queryParams = new URLSearchParams(queryString);
    const pluginParam = queryParams.get("plugin");
    
    if (pluginParam) {
      const segments = splitSsPluginParam(pluginParam);
      const [pluginName, ...optsParts] = segments;
      plugin = pluginName?.trim();
      
      if (optsParts.length > 0) {
        pluginOpts = {};
        for (const part of optsParts) {
          const trimmed = part.trim();
          if (!trimmed) continue;

          const eqIndex = trimmed.indexOf("=");
          if (eqIndex !== -1) {
            const key = trimmed.slice(0, eqIndex).trim();
            const value = trimmed.slice(eqIndex + 1).trim();
            if (key) pluginOpts[key] = value || true;
          } else {
            pluginOpts[trimmed] = true;
          }
        }

        if (Object.keys(pluginOpts).length === 0) {
          pluginOpts = undefined;
        }
      }
    }

    if (!plugin) {
      const v2rayPluginParam = queryParams.get("v2ray-plugin");
      const v2rayPluginOpts = v2rayPluginParam ? parseV2rayPluginJsonParam(v2rayPluginParam) : undefined;
      if (v2rayPluginOpts) {
        plugin = "v2ray-plugin";
        pluginOpts = v2rayPluginOpts;
      }
    }
  }

  let server: string;
  let port: number;
  let cipher: string;
  let password: string;

  // 尝试解析 SIP002 格式: base64(method:password)@server:port
  const atIndex = mainPart.lastIndexOf("@");
  
  if (atIndex !== -1) {
    // SIP002 格式
    const userInfo = safeDecodeURIComponent(mainPart.slice(0, atIndex));
    const serverPart = mainPart.slice(atIndex + 1);
    
    // 解析 server:port
    const colonIndex = serverPart.lastIndexOf(":");
    if (colonIndex === -1) {
      throw new Error("无法解析服务器端口");
    }
    
    server = serverPart.slice(0, colonIndex);
    port = parseInt(serverPart.slice(colonIndex + 1), 10);
    
    // 解码用户信息
    // 注意：部分分享链接会对 Base64 padding 做 URL 编码（如 %3D），需先 decodeURIComponent；
    // 同时支持明文格式：ss://method:password@server:port
    let decoded: string;
    if (userInfo.includes(":")) {
      decoded = userInfo;
    } else {
      decoded = decodeBase64(userInfo);
    }
    
    const methodPasswordIndex = decoded.indexOf(":");
    if (methodPasswordIndex === -1) {
      throw new Error("无法解析加密方式和密码");
    }
    
    cipher = decoded.slice(0, methodPasswordIndex);
    password = decoded.slice(methodPasswordIndex + 1);
  } else {
    // Base64 payload: base64(method:password@server:port)
    let decoded: string;
    try {
      decoded = decodeBase64(safeDecodeURIComponent(mainPart));
    } catch {
      throw new Error("无法解码 SS 链接");
    }
    
    const methodPasswordAtIndex = decoded.lastIndexOf("@");
    if (methodPasswordAtIndex === -1) {
      throw new Error("无效的 SS 链接格式");
    }
    
    const methodPassword = decoded.slice(0, methodPasswordAtIndex);
    const serverPort = decoded.slice(methodPasswordAtIndex + 1);
    
    const methodIndex = methodPassword.indexOf(":");
    if (methodIndex === -1) {
      throw new Error("无法解析加密方式和密码");
    }
    
    cipher = methodPassword.slice(0, methodIndex);
    password = methodPassword.slice(methodIndex + 1);
    
    const colonIndex = serverPort.lastIndexOf(":");
    if (colonIndex === -1) {
      throw new Error("无法解析服务器端口");
    }
    
    server = serverPort.slice(0, colonIndex);
    port = parseInt(serverPort.slice(colonIndex + 1), 10);
  }

  password = normalizeSs2022Password(cipher, password);

  // 处理 IPv6 地址
  if (server.startsWith("[") && server.endsWith("]")) {
    server = server.slice(1, -1);
  }

  if (isNaN(port) || port <= 0 || port > 65535) {
    throw new Error("无效的端口号");
  }

  const node: SSNode = {
    name,
    type: "ss",
    server,
    port,
    cipher,
    password,
    udp: true,
  };

  if (plugin) {
    const normalized = normalizeSsPlugin(plugin, pluginOpts);
    if (normalized.plugin) node.plugin = normalized.plugin;
    if (normalized.pluginOpts) node["plugin-opts"] = normalized.pluginOpts;
  }

  if (queryParams) {
    const udpOverTcp = parseBoolish(queryParams.get("uot"));
    const tfo = parseBoolish(queryParams.get("tfo"));
    if (udpOverTcp) node["udp-over-tcp"] = true;
    if (tfo) node.tfo = true;
  }

  return node;
}
