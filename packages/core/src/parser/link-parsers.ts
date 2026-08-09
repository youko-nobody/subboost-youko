import { parseAnyTLS } from "./protocols/anytls";
import { parseHysteria } from "./protocols/hysteria";
import { parseHysteria2 } from "./protocols/hysteria2";
import { parseMieru } from "./protocols/mieru";
import { parseSimpleProxy, parseSocks, parseTelegramProxyLink } from "./protocols/simple-proxy";
import { parseSS } from "./protocols/ss";
import { parseSSR } from "./protocols/ssr";
import { parseTrojan } from "./protocols/trojan";
import { parseTuic } from "./protocols/tuic";
import { parseVLESS } from "./protocols/vless";
import { parseVMess } from "./protocols/vmess";
import { parseWireGuard } from "./protocols/wireguard";
import { parseSnell } from "./protocols/snell";
import { parseNetch } from "./protocols/netch";
import type { ParsedNode } from "@subboost/core/types/node";

interface LinkParserDefinition {
  name: string;
  test: (link: string) => boolean;
  parse: (link: string) => ParsedNode | null;
}

export function normalizeNodeLinkScheme(input: string): string {
  return input.replace(
    /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//,
    (_, scheme: string) => `${scheme.toLowerCase()}://`
  );
}

function isTelegramHttpProxyLink(link: string): boolean {
  try {
    const url = new URL(link);
    const host = url.hostname.toLowerCase();
    const firstPath = url.pathname.replace(/^\/+/, "").split("/")[0]?.toLowerCase() || "";
    return host === "t.me" && (firstPath === "socks" || firstPath === "http" || firstPath === "https");
  } catch {
    return false;
  }
}

const LINK_PARSERS: LinkParserDefinition[] = [
  {
    name: "ss",
    test: (link) => link.startsWith("ss://"),
    parse: (link) => parseSS(link),
  },
  {
    name: "ssr",
    test: (link) => link.startsWith("ssr://"),
    parse: (link) => parseSSR(link),
  },
  {
    name: "netch",
    test: (link) => link.startsWith("netch://"),
    parse: (link) => parseNetch(link),
  },
  {
    name: "vmess",
    test: (link) => link.startsWith("vmess://") || link.startsWith("vmess1://"),
    parse: (link) => parseVMess(link),
  },
  {
    name: "vless",
    test: (link) => link.startsWith("vless://"),
    parse: (link) => parseVLESS(link),
  },
  {
    name: "trojan",
    test: (link) => link.startsWith("trojan://"),
    parse: (link) => parseTrojan(link),
  },
  {
    name: "anytls",
    test: (link) => link.startsWith("anytls://"),
    parse: (link) => parseAnyTLS(link),
  },
  {
    name: "hysteria",
    test: (link) => link.startsWith("hysteria://") || link.startsWith("hy://"),
    parse: (link) => parseHysteria(link),
  },
  {
    name: "hysteria2",
    test: (link) => link.startsWith("hysteria2://") || link.startsWith("hy2://"),
    parse: (link) => parseHysteria2(link),
  },
  {
    name: "tuic",
    test: (link) => link.startsWith("tuic://"),
    parse: (link) => parseTuic(link),
  },
  {
    name: "wireguard",
    test: (link) => link.startsWith("wireguard://") || link.startsWith("wg://"),
    parse: (link) => parseWireGuard(link),
  },
  {
    name: "mieru",
    test: (link) => link.startsWith("mierus://"),
    parse: (link) => parseMieru(link),
  },
  {
    name: "snell",
    test: (link) => link.startsWith("snell://"),
    parse: (link) => parseSnell(link),
  },
  {
    name: "socks",
    test: (link) =>
      link.startsWith("socks5://") ||
      link.startsWith("socks4://") ||
      link.startsWith("socks://") ||
      link.startsWith("socks5+tls://"),
    parse: (link) => parseSocks(link),
  },
  {
    name: "telegram",
    test: (link) => link.startsWith("tg://"),
    parse: (link) => parseTelegramProxyLink(link),
  },
  {
    name: "http",
    test: (link) => link.startsWith("http://") || link.startsWith("https://"),
    parse: (link) => {
      if (isTelegramHttpProxyLink(link)) {
        return parseTelegramProxyLink(link);
      }
      return parseSimpleProxy(link, "http");
    },
  },
  {
    name: "ssh",
    test: (link) => link.startsWith("ssh://"),
    parse: (link) => parseSimpleProxy(link, "ssh"),
  },
];

export function parseNodeLinkByRegistry(link: string): ParsedNode | null {
  const normalizedLink = normalizeNodeLinkScheme(link.trim());
  for (const parser of LINK_PARSERS) {
    if (parser.test(normalizedLink)) {
      return parser.parse(normalizedLink);
    }
  }
  return null;
}
