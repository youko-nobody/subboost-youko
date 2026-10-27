import yaml from "js-yaml";

type GeneratedProxyGroup = {
  name: string;
  proxies?: string[];
};

let cachedYaml: string | null = null;
let cachedGroups = new Map<string, GeneratedProxyGroup>();

function getGeneratedProxyGroups(yamlText: string): Map<string, GeneratedProxyGroup> {
  if (yamlText === cachedYaml) return cachedGroups;
  cachedYaml = yamlText;
  cachedGroups = new Map();

  try {
    const parsed = yaml.load(yamlText) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return cachedGroups;
    const groups = (parsed as Record<string, unknown>)["proxy-groups"];
    if (!Array.isArray(groups)) return cachedGroups;

    for (const group of groups) {
      if (!group || typeof group !== "object" || Array.isArray(group)) continue;
      const record = group as Record<string, unknown>;
      if (typeof record.name !== "string") continue;
      cachedGroups.set(record.name, {
        name: record.name,
        ...(Array.isArray(record.proxies)
          ? { proxies: record.proxies.filter((proxy): proxy is string => typeof proxy === "string") }
          : {}),
      });
    }
  } catch {
    return cachedGroups;
  }

  return cachedGroups;
}

export function getGeneratedProxyGroupsFromYaml(
  yamlText: string,
): GeneratedProxyGroup[] {
  return [...getGeneratedProxyGroups(yamlText).values()];
}

export function getGeneratedProxyGroupNodeCounts(
  yamlText: string,
  nodeNames: ReadonlySet<string>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [name, group] of getGeneratedProxyGroups(yamlText)) {
    const proxies = group.proxies ?? [];
    let count = 0;
    for (const proxy of proxies) {
      if (nodeNames.has(proxy)) count += 1;
    }
    counts.set(name, count);
  }
  return counts;
}
