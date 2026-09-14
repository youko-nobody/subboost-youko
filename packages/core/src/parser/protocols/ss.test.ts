import { describe, expect, it } from "vitest";
import { parseSS, normalizeSsPlugin } from "./ss";

function b64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

describe("parseSS", () => {
  it("parses base64 payload and SIP002 links with plugin aliases", () => {
    const full = parseSS(`ss://${b64("aes-128-gcm:secret@ss.example.com:8388")}#Full`);
    const sip002 = parseSS(
      `ss://aes-256-gcm:pass@[2001:db8::1]:8388?plugin=${encodeURIComponent("v2ray-plugin;mode=websocket;mux=1;tls=0")}&uot=1&tfo=yes#IPv6`
    );

    expect(full).toMatchObject({
      name: "Full",
      type: "ss",
      server: "ss.example.com",
      port: 8388,
      cipher: "aes-128-gcm",
      password: "secret",
      udp: true,
    });
    expect(sip002).toMatchObject({
      name: "IPv6",
      server: "2001:db8::1",
      plugin: "v2ray-plugin",
      "plugin-opts": {
        mode: "websocket",
        mux: true,
        tls: false,
      },
      "udp-over-tcp": true,
      tfo: true,
    });
  });

  it("accepts v2ray-plugin JSON parameters when plugin is omitted", () => {
    const params = b64(JSON.stringify({ mode: "websocket", host: "cdn.example.com", mux: "0" }));
    const node = parseSS(
      `ss://${b64("aes-128-gcm:secret")}@ss-json.example.com:8388?v2ray-plugin=${encodeURIComponent(params)}#JSON`
    );

    expect(node).toMatchObject({
      name: "JSON",
      plugin: "v2ray-plugin",
      "plugin-opts": {
        mode: "websocket",
        host: "cdn.example.com",
        mux: false,
      },
    });
  });

  it("removes provider tags appended to valid SS2022 keys", () => {
    const link =
      "ss://MjAyMi1ibGFrZTMtYWVzLTEyOC1nY206dXlXWFlZeFVueGFVZW50QXZTaUo1dz09Ok1UYzFNak0zTWpneE1WUjBTVXhtY1E9PSNCTEFDS1NUT05FQDE1MC4yNDIuODAuMTI5OjEwMTI3?uot=1#%F0%9F%87%AD%F0%9F%87%B0%20%F0%9F%84%B7%20SS%E9%99%90TF%E4%BD%BF%E7%94%A8";
    const node = parseSS(link);

    expect(node).toMatchObject({
      name: "🇭🇰 🄷 SS限TF使用",
      server: "150.242.80.129",
      port: 10127,
      cipher: "2022-blake3-aes-128-gcm",
      password: "uyWXYYxUnxaUentAvSiJ5w==:MTc1MjM3MjgxMVR0SUxmcQ==",
      "udp-over-tcp": true,
    });
  });

  it("parses empty bool query flags and ignores invalid v2ray-plugin JSON", () => {
    const boolFlags = parseSS("ss://aes-128-gcm:secret@bool.example.com:8388?uot=&tfo=#Bool");
    const invalidFlags = parseSS("ss://aes-128-gcm:secret@flags.example.com:8388?uot=maybe&tfo=0#Flags");
    const invalidJson = parseSS(
      `ss://aes-128-gcm:secret@plain.example.com:8388?v2ray-plugin=${encodeURIComponent("not-json")}#Plain`
    );
    const emptyJson = parseSS("ss://aes-128-gcm:secret@empty-json.example.com:8388?v2ray-plugin=   #EmptyJSON");

    expect(boolFlags).toMatchObject({
      name: "Bool",
      server: "bool.example.com",
      "udp-over-tcp": true,
      tfo: true,
    });
    expect(invalidFlags).toMatchObject({
      name: "Flags",
      server: "flags.example.com",
    });
    expect(invalidFlags).not.toHaveProperty("udp-over-tcp");
    expect(invalidFlags).not.toHaveProperty("tfo");
    expect(invalidJson).toMatchObject({
      name: "Plain",
      server: "plain.example.com",
    });
    expect(invalidJson).not.toHaveProperty("plugin");
    expect(emptyJson).not.toHaveProperty("plugin");
  });

  it("normalizes plugin names and rejects malformed links", () => {
    expect(normalizeSsPlugin(undefined, undefined)).toEqual({
      plugin: undefined,
      pluginOpts: undefined,
    });
    expect(normalizeSsPlugin("obfs", undefined)).toEqual({
      plugin: "obfs",
      pluginOpts: undefined,
    });
    expect(normalizeSsPlugin("v2ray-plugin", undefined)).toEqual({
      plugin: "v2ray-plugin",
      pluginOpts: undefined,
    });
    expect(normalizeSsPlugin("obfs-local", { obfs: "http", "obfs-host": "cdn.example.com" })).toEqual({
      plugin: "obfs",
      pluginOpts: { mode: "http", host: "cdn.example.com" },
    });
    expect(normalizeSsPlugin("gost-plugin", { tls: "yes", mux: 0, extra: "keep" })).toEqual({
      plugin: "gost-plugin",
      pluginOpts: { tls: true, mux: false, extra: "keep" },
    });
    expect(normalizeSsPlugin("gost-plugin", { tls: true, mux: 1 })).toEqual({
      plugin: "gost-plugin",
      pluginOpts: { tls: true, mux: true },
    });
    expect(normalizeSsPlugin("gost-plugin", { tls: "", mux: 2 })).toEqual({
      plugin: "gost-plugin",
      pluginOpts: { tls: "", mux: 2 },
    });
    expect(normalizeSsPlugin("xray-plugin", { tls: "off", mux: "maybe" })).toEqual({
      plugin: "xray-plugin",
      pluginOpts: { tls: false, mux: "maybe" },
    });
    expect(normalizeSsPlugin("xray-plugin", { tls: false, mux: "on" })).toEqual({
      plugin: "xray-plugin",
      pluginOpts: { tls: false, mux: true },
    });
    expect(normalizeSsPlugin("xray-plugin", { tls: {}, mux: null })).toEqual({
      plugin: "xray-plugin",
      pluginOpts: { tls: {}, mux: null },
    });
    expect(normalizeSsPlugin("simple-obfs", { mode: "", host: "" })).toEqual({
      plugin: "obfs",
      pluginOpts: undefined,
    });
    expect(normalizeSsPlugin("custom-plugin", { mode: "raw" })).toEqual({
      plugin: "custom-plugin",
      pluginOpts: { mode: "raw" },
    });

    expect(
      parseSS(
        `ss://${b64("aes-128-gcm:secret")}@escaped.example.com:8388?plugin=${encodeURIComponent(
          String.raw`obfs-local;obfs=tls;obfs-host=cdn\;edge.example.com;flag;empty=`
        )}&uot=0&tfo=on#Escaped`
      )
    ).toMatchObject({
      name: "Escaped",
      plugin: "obfs",
      "plugin-opts": {
        mode: "tls",
        host: "cdn;edge.example.com",
      },
      tfo: true,
    });
    expect(
      parseSS(
        `ss://${b64("aes-128-gcm:secret")}@empty-plugin.example.com:8388?plugin=${encodeURIComponent(
          String.raw`obfs-local;%20;empty=`
        )}#EmptyPlugin`
      )
    ).toMatchObject({
      name: "EmptyPlugin",
      plugin: "obfs",
    });
    expect(parseSS(`ss://${b64("aes-128-gcm:secret@[2001:db8::2]:8388")}#FullIPv6`)).toMatchObject({
      name: "FullIPv6",
      server: "2001:db8::2",
      port: 8388,
    });

    expect(() => parseSS("http://bad")).toThrow("无效的 SS 链接");
    expect(() => parseSS(`ss://${b64("aes-128-gcm:secret@ss.example.com")}`)).toThrow("无法解析服务器端口");
    expect(() => parseSS(`ss://${b64("bad@ss.example.com:8388")}`)).toThrow("无法解析加密方式和密码");
    expect(() => parseSS(`ss://${b64("bad")}@outer.example.com:8388`)).toThrow(
      "无法解析加密方式和密码"
    );
    expect(() => parseSS("ss://not-base64")).toThrow("无效的 SS 链接格式");
    expect(() => parseSS(`ss://${b64("aes-128-gcm:secret@ss.example.com:70000")}`)).toThrow("无效的端口号");
  });
});
