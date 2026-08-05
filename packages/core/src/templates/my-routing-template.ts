import type { CustomProxyGroup, CustomRule, CustomRuleSet, ProxyGroupRuleTarget } from "@subboost/core/types/config";

export const MY_ROUTING_TEMPLATE_TYPE = "my-routing" as const;
export const MY_ROUTING_TEMPLATE_NAME = "Youko分流模板";
export const MY_ROUTING_TEMPLATE_DESCRIPTION = "按用户提供的 Clash 分流规则生成：自定义策略组、远程 YAML 规则集和 FINAL 兜底";

export const MY_ROUTING_CUSTOM_PROXY_GROUPS: CustomProxyGroup[] = [
  {
    "id": "my-proxy",
    "name": "PROXY",
    "emoji": "",
    "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Proxy.png",
    "groupType": "select",
    "includeInGroupMembers": true,
    "advanced": {
      "extraMembers": [
        {
          "kind": "custom",
          "id": "my-auto-speedtest"
        },
        {
          "kind": "direct"
        }
      ],
      "excludedMembers": [
        {
          "kind": "reject"
        }
      ],
      "memberOrder": [
        {
          "kind": "custom",
          "id": "my-auto-speedtest"
        },
        {
          "kind": "direct"
        }
      ]
    }
  },
  {
    "id": "my-emby",
    "name": "Emby代理",
    "emoji": "",
    "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Emby.png",
    "groupType": "select",
    "includeInGroupMembers": true,
    "advanced": {
      "extraMembers": [
        {
          "kind": "custom",
          "id": "my-proxy"
        },
        {
          "kind": "direct"
        }
      ],
      "excludedMembers": [
        {
          "kind": "reject"
        }
      ],
      "memberOrder": [
        {
          "kind": "custom",
          "id": "my-proxy"
        },
        {
          "kind": "direct"
        }
      ]
    }
  },
  {
    "id": "my-tg",
    "name": "TG",
    "emoji": "",
    "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Telegram.png",
    "groupType": "select",
    "includeInGroupMembers": true,
    "advanced": {
      "extraMembers": [
        {
          "kind": "custom",
          "id": "my-proxy"
        },
        {
          "kind": "direct"
        }
      ],
      "excludedMembers": [
        {
          "kind": "reject"
        }
      ],
      "memberOrder": [
        {
          "kind": "custom",
          "id": "my-proxy"
        },
        {
          "kind": "direct"
        }
      ]
    }
  },
  {
    "id": "my-ai",
    "name": "AI",
    "emoji": "",
    "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/AI.png",
    "groupType": "select",
    "includeInGroupMembers": true,
    "advanced": {
      "extraMembers": [
        {
          "kind": "custom",
          "id": "my-proxy"
        },
        {
          "kind": "direct"
        }
      ],
      "excludedMembers": [
        {
          "kind": "reject"
        }
      ],
      "memberOrder": [
        {
          "kind": "custom",
          "id": "my-proxy"
        },
        {
          "kind": "direct"
        }
      ]
    }
  },
  {
    "id": "my-youtube",
    "name": "YOUTUBE",
    "emoji": "",
    "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/YouTube.png",
    "groupType": "select",
    "includeInGroupMembers": true,
    "advanced": {
      "extraMembers": [
        {
          "kind": "custom",
          "id": "my-proxy"
        },
        {
          "kind": "direct"
        }
      ],
      "excludedMembers": [
        {
          "kind": "reject"
        }
      ],
      "memberOrder": [
        {
          "kind": "custom",
          "id": "my-proxy"
        },
        {
          "kind": "direct"
        }
      ]
    }
  },
  {
    "id": "my-tiktok",
    "name": "TIKTOK",
    "emoji": "",
    "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/TikTok.png",
    "groupType": "select",
    "includeInGroupMembers": true,
    "advanced": {
      "extraMembers": [
        {
          "kind": "custom",
          "id": "my-proxy"
        },
        {
          "kind": "direct"
        }
      ],
      "excludedMembers": [
        {
          "kind": "reject"
        }
      ],
      "memberOrder": [
        {
          "kind": "custom",
          "id": "my-proxy"
        },
        {
          "kind": "direct"
        }
      ]
    }
  },
  {
    "id": "my-final",
    "name": "FINAL",
    "emoji": "",
    "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Final.png",
    "groupType": "select",
    "includeInGroupMembers": true,
    "advanced": {
      "extraMembers": [
        {
          "kind": "custom",
          "id": "my-proxy"
        },
        {
          "kind": "direct"
        }
      ],
      "excludedMembers": [
        {
          "kind": "reject"
        }
      ],
      "memberOrder": [
        {
          "kind": "custom",
          "id": "my-proxy"
        },
        {
          "kind": "direct"
        }
      ]
    }
  },
  {
    "id": "my-block",
    "name": "BLOCK",
    "emoji": "",
    "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Reject.png",
    "groupType": "reject-first",
    "includeInGroupMembers": true,
    "includeProxyProviders": false,
    "advanced": {
      "includeRegex": "(?!)",
      "extraMembers": [
        {
          "kind": "reject"
        },
        {
          "kind": "direct"
        }
      ],
      "memberOrder": [
        {
          "kind": "reject"
        },
        {
          "kind": "direct"
        }
      ]
    }
  },
  {
    "id": "my-apple",
    "name": "APPLE",
    "emoji": "",
    "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Apple.png",
    "groupType": "direct-first",
    "includeInGroupMembers": true,
    "advanced": {
      "extraMembers": [
        {
          "kind": "direct"
        },
        {
          "kind": "custom",
          "id": "my-proxy"
        }
      ],
      "excludedMembers": [
        {
          "kind": "reject"
        }
      ],
      "memberOrder": [
        {
          "kind": "direct"
        },
        {
          "kind": "custom",
          "id": "my-proxy"
        }
      ]
    }
  },
  {
    "id": "my-auto-speedtest",
    "name": "♻️ 自动测速",
    "emoji": "??",
    "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Speedtest.png",
    "groupType": "url-test",
    "includeInGroupMembers": true
  }
];

export const MY_ROUTING_CUSTOM_RULE_SETS: CustomRuleSet[] = [
  {
    "id": "BM_ADVERTISING_LITE",
    "name": "BM_ADVERTISING_LITE",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/AdvertisingLite/AdvertisingLite.yaml",
    "target": {
      "kind": "custom",
      "id": "my-block"
    }
  },
  {
    "id": "BM_EASYPRIVACY",
    "name": "BM_PRIVACY",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Privacy/Privacy.yaml",
    "target": {
      "kind": "custom",
      "id": "my-block"
    }
  },
  {
    "id": "BLOCK_HTTP_DNS_PLUS",
    "name": "BLOCK_HTTP_DNS_PLUS",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/BlockHttpDNSPlus/BlockHttpDNSPlus.yaml",
    "target": {
      "kind": "custom",
      "id": "my-block"
    }
  },
  {
    "id": "CHINA_DNS_DOMAIN",
    "name": "CHINA_DNS_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/ChinaDNS/ChinaDNS_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-block"
    }
  },
  {
    "id": "CHINA_DNS_IP",
    "name": "CHINA_DNS_IP",
    "behavior": "ipcidr",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/ChinaDNS/ChinaDNS_IP.yaml",
    "target": {
      "kind": "custom",
      "id": "my-block"
    }
  },
  {
    "id": "HIJACKING_PLUS",
    "name": "HIJACKING_PLUS",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/HijackingPlus/HijackingPlus.yaml",
    "target": {
      "kind": "custom",
      "id": "my-block"
    }
  },
  {
    "id": "GEMINI_DOMAIN",
    "name": "GEMINI_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Gemini/Gemini_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-ai"
    }
  },
  {
    "id": "GROK_DOMAIN",
    "name": "GROK_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Grok/Grok_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-ai"
    }
  },
  {
    "id": "COPILOT_DOMAIN",
    "name": "COPILOT_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Copilot/Copilot_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-ai"
    }
  },
  {
    "id": "APPLE_AI_DOMAIN",
    "name": "APPLE_AI_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/AppleAI/AppleAI_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-ai"
    }
  },
  {
    "id": "BM_OPENAI",
    "name": "BM_OPENAI",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/OpenAI/OpenAI.yaml",
    "target": {
      "kind": "custom",
      "id": "my-ai"
    }
  },
  {
    "id": "BM_CLAUDE",
    "name": "BM_CLAUDE",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Claude/Claude.yaml",
    "target": {
      "kind": "custom",
      "id": "my-ai"
    }
  },
  {
    "id": "BM_TELEGRAM",
    "name": "BM_TELEGRAM",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Telegram/Telegram.yaml",
    "target": {
      "kind": "custom",
      "id": "my-tg"
    }
  },
  {
    "id": "BM_YOUTUBE",
    "name": "BM_YOUTUBE",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/YouTube/YouTube.yaml",
    "target": {
      "kind": "custom",
      "id": "my-youtube"
    }
  },
  {
    "id": "APPLE_NEWS_DOMAIN",
    "name": "APPLE_NEWS_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/AppleNews/AppleNews_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "SIGNAL_DOMAIN",
    "name": "SIGNAL_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Signal/Signal_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "KWAI_DOMAIN",
    "name": "KWAI_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Kwai/Kwai_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "PORNHUB_DOMAIN",
    "name": "PORNHUB_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Pornhub/Pornhub_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "WAYBACK_MACHINE_DOMAIN",
    "name": "WAYBACK_MACHINE_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/WaybackMachine/WaybackMachine_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "WAYBACK_MACHINE_IP",
    "name": "WAYBACK_MACHINE_IP",
    "behavior": "ipcidr",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/WaybackMachine/WaybackMachine_IP.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "PARSEC_DOMAIN",
    "name": "PARSEC_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Parsec/Parsec_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "RUSTDESK_DOMAIN",
    "name": "RUSTDESK_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/RustDesk/RustDesk_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "MAC_APP_UPGRADE_DOMAIN",
    "name": "MAC_APP_UPGRADE_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/MacAppUpgrade/MacAppUpgrade_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GLOBAL_DNS_DOMAIN",
    "name": "GLOBAL_DNS_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GlobalDNS/GlobalDNS_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GLOBAL_DNS_IP",
    "name": "GLOBAL_DNS_IP",
    "behavior": "ipcidr",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GlobalDNS/GlobalDNS_IP.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "APPLE_DOMAIN",
    "name": "APPLE_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Apple/Apple_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-apple"
    }
  },
  {
    "id": "APPLE_IP",
    "name": "APPLE_IP",
    "behavior": "ipcidr",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Apple/Apple_IP.yaml",
    "target": {
      "kind": "custom",
      "id": "my-apple"
    }
  },
  {
    "id": "MICROSOFT_APPS_DOMAIN",
    "name": "MICROSOFT_APPS_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/MicrosoftAPPs/MicrosoftAPPs_Domain.yaml",
    "target": "DIRECT"
  },
  {
    "id": "ALIPAN_DOMAIN",
    "name": "ALIPAN_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Alipan/Alipan_Domain.yaml",
    "target": "DIRECT"
  },
  {
    "id": "BAIDU_NETDISK_DOMAIN",
    "name": "BAIDU_NETDISK_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/BaiduNetDisk/BaiduNetDisk_Domain.yaml",
    "target": "DIRECT"
  },
  {
    "id": "WEIYUN_DOMAIN",
    "name": "WEIYUN_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/WeiYun/WeiYun_Domain.yaml",
    "target": "DIRECT"
  },
  {
    "id": "WEIYUN_IP",
    "name": "WEIYUN_IP",
    "behavior": "ipcidr",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/WeiYun/WeiYun_IP.yaml",
    "target": "DIRECT"
  },
  {
    "id": "AQARA_CN_DOMAIN",
    "name": "AQARA_CN_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Aqara/AqaraCN._Domain.yaml",
    "target": "DIRECT"
  },
  {
    "id": "AQARA_GLOBAL_DOMAIN",
    "name": "AQARA_GLOBAL_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Aqara/AqaraGlobal._Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "AQARA_GLOBAL_IP",
    "name": "AQARA_GLOBAL_IP",
    "behavior": "ipcidr",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Aqara/AqaraGlobal._IP.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "UNSUPPORT_VPN_DOMAIN",
    "name": "UNSUPPORT_VPN_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/UnsupportVPN/UnsupportVPN_Domain.yaml",
    "target": "DIRECT"
  },
  {
    "id": "BM_BILIBILI",
    "name": "BM_BILIBILI",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/BiliBili/BiliBili.yaml",
    "target": "DIRECT"
  },
  {
    "id": "BM_XIAOHONGSHU",
    "name": "BM_XIAOHONGSHU",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/XiaoHongShu/XiaoHongShu.yaml",
    "target": "DIRECT"
  },
  {
    "id": "BM_TIKTOK",
    "name": "BM_TIKTOK",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/TikTok/TikTok.yaml",
    "target": {
      "kind": "custom",
      "id": "my-tiktok"
    }
  },
  {
    "id": "GEO_ROUTING_ASIA_CHINA_CCTLD_DOMAIN",
    "name": "GEO_ROUTING_ASIA_CHINA_CCTLD_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_Domain/GeoRouting_Asia_China_ccTLD_Domain.yaml",
    "target": "DIRECT"
  },
  {
    "id": "GEO_ROUTING_ASIA_CHINA_GEOIP",
    "name": "GEO_ROUTING_ASIA_CHINA_GEOIP",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_IP/GeoRouting_Asia_China_GeoIP.yaml",
    "target": "DIRECT"
  },
  {
    "id": "GEOSITE_CN_DOMAIN",
    "name": "GEOSITE_CN_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeositeCN/GeositeCN_Domain.yaml",
    "target": "DIRECT"
  },
  {
    "id": "CHINA_DOMAIN",
    "name": "CHINA_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/China/China_Domain.yaml",
    "target": "DIRECT"
  },
  {
    "id": "CHINA_MAX_DOMAIN",
    "name": "CHINA_MAX_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/ChinaMax/ChinaMax_Domain.yaml",
    "target": "DIRECT"
  }
];

export const MY_ROUTING_CUSTOM_RULES: CustomRule[] = [
  {
    "id": "my-routing-rule-01",
    "type": "DOMAIN-SUFFIX",
    "value": "emby.fan",
    "target": {
      "kind": "custom",
      "id": "my-emby"
    }
  },
  {
    "id": "my-routing-rule-02",
    "type": "DOMAIN-SUFFIX",
    "value": "111848.xyz",
    "target": {
      "kind": "custom",
      "id": "my-emby"
    }
  },
  {
    "id": "my-routing-rule-03",
    "type": "DOMAIN-SUFFIX",
    "value": "xueshan.liminalnet.com",
    "target": {
      "kind": "custom",
      "id": "my-emby"
    }
  },
  {
    "id": "my-routing-rule-04",
    "type": "DOMAIN-SUFFIX",
    "value": "qzz.io",
    "target": {
      "kind": "custom",
      "id": "my-emby"
    }
  },
  {
    "id": "my-routing-rule-05",
    "type": "DOMAIN-SUFFIX",
    "value": "emos.best",
    "target": {
      "kind": "custom",
      "id": "my-emby"
    }
  },
  {
    "id": "my-routing-rule-06",
    "type": "DOMAIN-SUFFIX",
    "value": "cn2gias.uk",
    "target": {
      "kind": "custom",
      "id": "my-emby"
    }
  },
  {
    "id": "my-routing-rule-07",
    "type": "DOMAIN-SUFFIX",
    "value": "lightting.net",
    "target": {
      "kind": "custom",
      "id": "my-emby"
    }
  },
  {
    "id": "my-routing-rule-08",
    "type": "DOMAIN-SUFFIX",
    "value": "0008866.xyz",
    "target": "DIRECT"
  },
  {
    "id": "my-routing-rule-09",
    "type": "DOMAIN-SUFFIX",
    "value": "emby.yun",
    "target": "DIRECT"
  },
  {
    "id": "my-routing-rule-10",
    "type": "DOMAIN-SUFFIX",
    "value": "lyezi.xyz",
    "target": "DIRECT"
  },
  {
    "id": "my-routing-rule-11",
    "type": "DOMAIN-SUFFIX",
    "value": "lyezi.cc",
    "target": "DIRECT"
  },
  {
    "id": "my-routing-rule-12",
    "type": "DOMAIN-SUFFIX",
    "value": "taotu.in",
    "target": "DIRECT"
  },
  {
    "id": "my-routing-rule-13",
    "type": "DOMAIN-SUFFIX",
    "value": "223789.xyz",
    "target": "DIRECT"
  },
  {
    "id": "my-routing-rule-14",
    "type": "DOMAIN",
    "value": "localhost",
    "target": "DIRECT"
  },
  {
    "id": "my-routing-rule-15",
    "type": "DOMAIN-SUFFIX",
    "value": "local",
    "target": "DIRECT"
  },
  {
    "id": "my-routing-rule-16",
    "type": "IP-CIDR",
    "value": "127.0.0.0/8",
    "target": "DIRECT",
    "noResolve": true
  },
  {
    "id": "my-routing-rule-17",
    "type": "IP-CIDR",
    "value": "10.0.0.0/8",
    "target": "DIRECT",
    "noResolve": true
  },
  {
    "id": "my-routing-rule-18",
    "type": "IP-CIDR",
    "value": "100.64.0.0/10",
    "target": "DIRECT",
    "noResolve": true
  },
  {
    "id": "my-routing-rule-19",
    "type": "IP-CIDR",
    "value": "169.254.0.0/16",
    "target": "DIRECT",
    "noResolve": true
  },
  {
    "id": "my-routing-rule-20",
    "type": "IP-CIDR",
    "value": "172.16.0.0/12",
    "target": "DIRECT",
    "noResolve": true
  },
  {
    "id": "my-routing-rule-21",
    "type": "IP-CIDR",
    "value": "192.168.0.0/16",
    "target": "DIRECT",
    "noResolve": true
  },
  {
    "id": "my-routing-rule-22",
    "type": "IP-CIDR6",
    "value": "::1/128",
    "target": "DIRECT",
    "noResolve": true
  },
  {
    "id": "my-routing-rule-23",
    "type": "IP-CIDR6",
    "value": "fc00::/7",
    "target": "DIRECT",
    "noResolve": true
  },
  {
    "id": "my-routing-rule-24",
    "type": "IP-CIDR6",
    "value": "fe80::/10",
    "target": "DIRECT",
    "noResolve": true
  },
  {
    "id": "my-routing-rule-25",
    "type": "GEOIP",
    "value": "CN",
    "target": "DIRECT"
  }
];

export const MY_ROUTING_RULE_ORDER: string[] = [
  "custom-rule:my-routing-rule-01",
  "custom-rule:my-routing-rule-02",
  "custom-rule:my-routing-rule-03",
  "custom-rule:my-routing-rule-04",
  "custom-rule:my-routing-rule-05",
  "custom-rule:my-routing-rule-06",
  "custom-rule:my-routing-rule-07",
  "custom-rule:my-routing-rule-08",
  "custom-rule:my-routing-rule-09",
  "custom-rule:my-routing-rule-10",
  "custom-rule:my-routing-rule-11",
  "custom-rule:my-routing-rule-12",
  "custom-rule:my-routing-rule-13",
  "custom-rule:my-routing-rule-14",
  "custom-rule:my-routing-rule-15",
  "custom-rule:my-routing-rule-16",
  "custom-rule:my-routing-rule-17",
  "custom-rule:my-routing-rule-18",
  "custom-rule:my-routing-rule-19",
  "custom-rule:my-routing-rule-20",
  "custom-rule:my-routing-rule-21",
  "custom-rule:my-routing-rule-22",
  "custom-rule:my-routing-rule-23",
  "custom-rule:my-routing-rule-24",
  "custom-rule-set:BM_ADVERTISING_LITE",
  "custom-rule-set:BM_EASYPRIVACY",
  "custom-rule-set:BLOCK_HTTP_DNS_PLUS",
  "custom-rule-set:CHINA_DNS_DOMAIN",
  "custom-rule-set:CHINA_DNS_IP",
  "custom-rule-set:HIJACKING_PLUS",
  "custom-rule-set:GEMINI_DOMAIN",
  "custom-rule-set:GROK_DOMAIN",
  "custom-rule-set:COPILOT_DOMAIN",
  "custom-rule-set:APPLE_AI_DOMAIN",
  "custom-rule-set:BM_OPENAI",
  "custom-rule-set:BM_CLAUDE",
  "custom-rule-set:BM_TELEGRAM",
  "custom-rule-set:BM_YOUTUBE",
  "custom-rule-set:APPLE_NEWS_DOMAIN",
  "custom-rule-set:SIGNAL_DOMAIN",
  "custom-rule-set:KWAI_DOMAIN",
  "custom-rule-set:PORNHUB_DOMAIN",
  "custom-rule-set:WAYBACK_MACHINE_DOMAIN",
  "custom-rule-set:WAYBACK_MACHINE_IP",
  "custom-rule-set:PARSEC_DOMAIN",
  "custom-rule-set:RUSTDESK_DOMAIN",
  "custom-rule-set:MAC_APP_UPGRADE_DOMAIN",
  "custom-rule-set:GLOBAL_DNS_DOMAIN",
  "custom-rule-set:GLOBAL_DNS_IP",
  "custom-rule-set:APPLE_DOMAIN",
  "custom-rule-set:APPLE_IP",
  "custom-rule-set:MICROSOFT_APPS_DOMAIN",
  "custom-rule-set:ALIPAN_DOMAIN",
  "custom-rule-set:BAIDU_NETDISK_DOMAIN",
  "custom-rule-set:WEIYUN_DOMAIN",
  "custom-rule-set:WEIYUN_IP",
  "custom-rule-set:AQARA_CN_DOMAIN",
  "custom-rule-set:AQARA_GLOBAL_DOMAIN",
  "custom-rule-set:AQARA_GLOBAL_IP",
  "custom-rule-set:UNSUPPORT_VPN_DOMAIN",
  "custom-rule-set:BM_BILIBILI",
  "custom-rule-set:BM_XIAOHONGSHU",
  "custom-rule-set:BM_TIKTOK",
  "custom-rule-set:GEO_ROUTING_ASIA_CHINA_CCTLD_DOMAIN",
  "custom-rule-set:GEO_ROUTING_ASIA_CHINA_GEOIP",
  "custom-rule-set:GEOSITE_CN_DOMAIN",
  "custom-rule-set:CHINA_DOMAIN",
  "custom-rule-set:CHINA_MAX_DOMAIN",
  "custom-rule:my-routing-rule-25"
];

export const MY_ROUTING_FALLBACK_POLICY_TARGET: ProxyGroupRuleTarget = {
  "kind": "custom",
  "id": "my-final"
};

export const MY_ROUTING_TEMPLATE_GROUP_COUNT = MY_ROUTING_CUSTOM_PROXY_GROUPS.length;
export const MY_ROUTING_TEMPLATE_RULE_COUNT = MY_ROUTING_CUSTOM_RULES.length + MY_ROUTING_CUSTOM_RULE_SETS.length;

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createMyRoutingTemplateParts() {
  return {
    customProxyGroups: cloneJson(MY_ROUTING_CUSTOM_PROXY_GROUPS),
    customRuleSets: cloneJson(MY_ROUTING_CUSTOM_RULE_SETS),
    customRules: cloneJson(MY_ROUTING_CUSTOM_RULES),
    ruleOrder: [...MY_ROUTING_RULE_ORDER],
    fallbackPolicyTarget: cloneJson(MY_ROUTING_FALLBACK_POLICY_TARGET),
  };
}
