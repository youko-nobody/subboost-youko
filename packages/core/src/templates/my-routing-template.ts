import type { CustomProxyGroup, CustomRule, CustomRuleSet, ProxyGroupRuleTarget } from "@subboost/core/types/config";

export const MY_ROUTING_TEMPLATE_TYPE = "my-routing" as const;
export const MY_ROUTING_TEMPLATE_NAME = "我的分流";
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
    "id": "my-bank",
    "name": "BANK",
    "emoji": "",
    "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/PayPal.png",
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
    "id": "my-finance",
    "name": "FINANCE",
    "emoji": "",
    "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/PayPal.png",
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
    "id": "my-fake-location",
    "name": "FAKE-LOCATION",
    "emoji": "",
    "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Rainbow.png",
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
    "id": "PRE_REPAIR_EASY_PRIVACY_DIRECT",
    "name": "PRE_REPAIR_EASY_PRIVACY_DIRECT",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/PreRepairEasyPrivacy/PreRepairEasyPrivacy_DIRECT.yaml",
    "target": "DIRECT"
  },
  {
    "id": "PRE_REPAIR_EASY_PRIVACY_PROXY",
    "name": "PRE_REPAIR_EASY_PRIVACY_PROXY",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/PreRepairEasyPrivacy/PreRepairEasyPrivacy_PROXY.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "PRE_REPAIR_EASY_PRIVACY_REJECT",
    "name": "PRE_REPAIR_EASY_PRIVACY_REJECT",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/PreRepairEasyPrivacy/PreRepairEasyPrivacy_REJECT.yaml",
    "target": {
      "kind": "custom",
      "id": "my-block"
    }
  },
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
    "name": "BM_EASYPRIVACY",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/EasyPrivacy/EasyPrivacy.yaml",
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
    "id": "FASTLY_IP",
    "name": "FASTLY_IP",
    "behavior": "ipcidr",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Fastly/Fastly_IP.yaml",
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
    "id": "EMULE_SERVER_IP",
    "name": "EMULE_SERVER_IP",
    "behavior": "ipcidr",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/eMuleServer/eMuleServer_IP.yaml",
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
    "id": "BANK_AU_DOMAIN",
    "name": "BANK_AU_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Bank/BankAU_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-bank"
    }
  },
  {
    "id": "BANK_CA_DOMAIN",
    "name": "BANK_CA_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Bank/BankCA_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-bank"
    }
  },
  {
    "id": "BANK_DE_DOMAIN",
    "name": "BANK_DE_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Bank/BankDE_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-bank"
    }
  },
  {
    "id": "BANK_FR_DOMAIN",
    "name": "BANK_FR_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Bank/BankFR_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-bank"
    }
  },
  {
    "id": "BANK_HK_DOMAIN",
    "name": "BANK_HK_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Bank/BankHK_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-bank"
    }
  },
  {
    "id": "BANK_JP_DOMAIN",
    "name": "BANK_JP_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Bank/BankJP_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-bank"
    }
  },
  {
    "id": "BANK_NL_DOMAIN",
    "name": "BANK_NL_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Bank/BankNL_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-bank"
    }
  },
  {
    "id": "BANK_SG_DOMAIN",
    "name": "BANK_SG_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Bank/BankSG_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-bank"
    }
  },
  {
    "id": "BANK_UK_DOMAIN",
    "name": "BANK_UK_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Bank/BankUK_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-bank"
    }
  },
  {
    "id": "BANK_US_DOMAIN",
    "name": "BANK_US_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Bank/BankUS_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-bank"
    }
  },
  {
    "id": "PAYPAL",
    "name": "PAYPAL",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/VirtualFinance/Paypal.yaml",
    "target": {
      "kind": "custom",
      "id": "my-finance"
    }
  },
  {
    "id": "WISE",
    "name": "WISE",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/VirtualFinance/Wise.yaml",
    "target": {
      "kind": "custom",
      "id": "my-finance"
    }
  },
  {
    "id": "MONZO",
    "name": "MONZO",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/VirtualFinance/Monzo.yaml",
    "target": {
      "kind": "custom",
      "id": "my-finance"
    }
  },
  {
    "id": "REVOLUT",
    "name": "REVOLUT",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/VirtualFinance/Revolut.yaml",
    "target": {
      "kind": "custom",
      "id": "my-finance"
    }
  },
  {
    "id": "HOMEIP_JP",
    "name": "HOMEIP_JP",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/HomeIP/HomeIPJP.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "HOMEIP_US",
    "name": "HOMEIP_US",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/HomeIP/HomeIPUS.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
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
    "id": "FAKE_LOCATION_BILIBILI",
    "name": "FAKE_LOCATION_BILIBILI",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/FakeLocation/FakeLocationBiliBili.yaml",
    "target": {
      "kind": "custom",
      "id": "my-fake-location"
    }
  },
  {
    "id": "FAKE_LOCATION_DOUBAN",
    "name": "FAKE_LOCATION_DOUBAN",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/FakeLocation/FakeLocationDouBan.yaml",
    "target": {
      "kind": "custom",
      "id": "my-fake-location"
    }
  },
  {
    "id": "FAKE_LOCATION_DOUYIN",
    "name": "FAKE_LOCATION_DOUYIN",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/FakeLocation/FakeLocationDouYin.yaml",
    "target": {
      "kind": "custom",
      "id": "my-fake-location"
    }
  },
  {
    "id": "FAKE_LOCATION_KUAISHOU",
    "name": "FAKE_LOCATION_KUAISHOU",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/FakeLocation/FakeLocationKuaiShou.yaml",
    "target": {
      "kind": "custom",
      "id": "my-fake-location"
    }
  },
  {
    "id": "FAKE_LOCATION_TIEBA",
    "name": "FAKE_LOCATION_TIEBA",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/FakeLocation/FakeLocationTieBa.yaml",
    "target": {
      "kind": "custom",
      "id": "my-fake-location"
    }
  },
  {
    "id": "FAKE_LOCATION_WEIBO",
    "name": "FAKE_LOCATION_WEIBO",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/FakeLocation/FakeLocationWeiBo.yaml",
    "target": {
      "kind": "custom",
      "id": "my-fake-location"
    }
  },
  {
    "id": "FAKE_LOCATION_XIGUA",
    "name": "FAKE_LOCATION_XIGUA",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/FakeLocation/FakeLocationXiGua.yaml",
    "target": {
      "kind": "custom",
      "id": "my-fake-location"
    }
  },
  {
    "id": "FAKE_LOCATION_XIANYU",
    "name": "FAKE_LOCATION_XIANYU",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/FakeLocation/FakeLocationXianYu.yaml",
    "target": {
      "kind": "custom",
      "id": "my-fake-location"
    }
  },
  {
    "id": "FAKE_LOCATION_XIAOHONGSHU",
    "name": "FAKE_LOCATION_XIAOHONGSHU",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/FakeLocation/FakeLocationXiaoHongShu.yaml",
    "target": {
      "kind": "custom",
      "id": "my-fake-location"
    }
  },
  {
    "id": "FAKE_LOCATION_ZHIHU",
    "name": "FAKE_LOCATION_ZHIHU",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/FakeLocation/FakeLocationZhiHu.yaml",
    "target": {
      "kind": "custom",
      "id": "my-fake-location"
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
    "id": "GEO_ROUTING_AMERICA_NORTH_CCTLD_DOMAIN",
    "name": "GEO_ROUTING_AMERICA_NORTH_CCTLD_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_Domain/GeoRouting_America_North_ccTLD_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_AMERICA_SOUTH_CCTLD_DOMAIN",
    "name": "GEO_ROUTING_AMERICA_SOUTH_CCTLD_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_Domain/GeoRouting_America_South_ccTLD_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_EUROPE_WEST_CCTLD_DOMAIN",
    "name": "GEO_ROUTING_EUROPE_WEST_CCTLD_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_Domain/GeoRouting_Europe_West_ccTLD_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_EUROPE_EAST_CCTLD_DOMAIN",
    "name": "GEO_ROUTING_EUROPE_EAST_CCTLD_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_Domain/GeoRouting_Europe_East_ccTLD_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_OCEANIA_CCTLD_DOMAIN",
    "name": "GEO_ROUTING_OCEANIA_CCTLD_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_Domain/GeoRouting_Oceania_ccTLD_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_ANTARCTICA_CCTLD_DOMAIN",
    "name": "GEO_ROUTING_ANTARCTICA_CCTLD_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_Domain/GeoRouting_Antarctica_ccTLD_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_ASIA_EAST_CCTLD_DOMAIN",
    "name": "GEO_ROUTING_ASIA_EAST_CCTLD_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_Domain/GeoRouting_Asia_East_ccTLD_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_ASIA_EASTSOUTH_CCTLD_DOMAIN",
    "name": "GEO_ROUTING_ASIA_EASTSOUTH_CCTLD_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_Domain/GeoRouting_Asia_EastSouth_ccTLD_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_ASIA_SOUTH_CCTLD_DOMAIN",
    "name": "GEO_ROUTING_ASIA_SOUTH_CCTLD_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_Domain/GeoRouting_Asia_South_ccTLD_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_ASIA_CENTRAL_CCTLD_DOMAIN",
    "name": "GEO_ROUTING_ASIA_CENTRAL_CCTLD_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_Domain/GeoRouting_Asia_Central_ccTLD_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_ASIA_WEST_CCTLD_DOMAIN",
    "name": "GEO_ROUTING_ASIA_WEST_CCTLD_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_Domain/GeoRouting_Asia_West_ccTLD_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_AFRICA_NORTH_CCTLD_DOMAIN",
    "name": "GEO_ROUTING_AFRICA_NORTH_CCTLD_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_Domain/GeoRouting_Africa_North_ccTLD_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_AFRICA_SOUTH_CCTLD_DOMAIN",
    "name": "GEO_ROUTING_AFRICA_SOUTH_CCTLD_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_Domain/GeoRouting_Africa_South_ccTLD_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_AFRICA_WEST_CCTLD_DOMAIN",
    "name": "GEO_ROUTING_AFRICA_WEST_CCTLD_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_Domain/GeoRouting_Africa_West_ccTLD_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_AFRICA_EAST_CCTLD_DOMAIN",
    "name": "GEO_ROUTING_AFRICA_EAST_CCTLD_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_Domain/GeoRouting_Africa_East_ccTLD_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_AFRICA_CENTRAL_CCTLD_DOMAIN",
    "name": "GEO_ROUTING_AFRICA_CENTRAL_CCTLD_DOMAIN",
    "behavior": "domain",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_Domain/GeoRouting_Africa_Central_ccTLD_Domain.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_AMERICA_NORTH_GEOIP",
    "name": "GEO_ROUTING_AMERICA_NORTH_GEOIP",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_IP/GeoRouting_America_North_GeoIP.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_AMERICA_SOUTH_GEOIP",
    "name": "GEO_ROUTING_AMERICA_SOUTH_GEOIP",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_IP/GeoRouting_America_South_GeoIP.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_EUROPE_WEST_GEOIP",
    "name": "GEO_ROUTING_EUROPE_WEST_GEOIP",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_IP/GeoRouting_Europe_West_GeoIP.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_EUROPE_EAST_GEOIP",
    "name": "GEO_ROUTING_EUROPE_EAST_GEOIP",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_IP/GeoRouting_Europe_East_GeoIP.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_OCEANIA_GEOIP",
    "name": "GEO_ROUTING_OCEANIA_GEOIP",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_IP/GeoRouting_Oceania_GeoIP.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_ANTARCTICA_GEOIP",
    "name": "GEO_ROUTING_ANTARCTICA_GEOIP",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_IP/GeoRouting_Antarctica_GeoIP.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_ASIA_EAST_GEOIP",
    "name": "GEO_ROUTING_ASIA_EAST_GEOIP",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_IP/GeoRouting_Asia_East_GeoIP.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_ASIA_EASTSOUTH_GEOIP",
    "name": "GEO_ROUTING_ASIA_EASTSOUTH_GEOIP",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_IP/GeoRouting_Asia_EastSouth_GeoIP.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_ASIA_SOUTH_GEOIP",
    "name": "GEO_ROUTING_ASIA_SOUTH_GEOIP",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_IP/GeoRouting_Asia_South_GeoIP.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_ASIA_CENTRAL_GEOIP",
    "name": "GEO_ROUTING_ASIA_CENTRAL_GEOIP",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_IP/GeoRouting_Asia_Central_GeoIP.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_ASIA_WEST_GEOIP",
    "name": "GEO_ROUTING_ASIA_WEST_GEOIP",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_IP/GeoRouting_Asia_West_GeoIP.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_AFRICA_NORTH_GEOIP",
    "name": "GEO_ROUTING_AFRICA_NORTH_GEOIP",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_IP/GeoRouting_Africa_North_GeoIP.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_AFRICA_SOUTH_GEOIP",
    "name": "GEO_ROUTING_AFRICA_SOUTH_GEOIP",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_IP/GeoRouting_Africa_South_GeoIP.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_AFRICA_WEST_GEOIP",
    "name": "GEO_ROUTING_AFRICA_WEST_GEOIP",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_IP/GeoRouting_Africa_West_GeoIP.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_AFRICA_EAST_GEOIP",
    "name": "GEO_ROUTING_AFRICA_EAST_GEOIP",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_IP/GeoRouting_Africa_East_GeoIP.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
  },
  {
    "id": "GEO_ROUTING_AFRICA_CENTRAL_GEOIP",
    "name": "GEO_ROUTING_AFRICA_CENTRAL_GEOIP",
    "behavior": "classical",
    "format": "yaml",
    "path": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeoRouting_For_IP/GeoRouting_Africa_Central_GeoIP.yaml",
    "target": {
      "kind": "custom",
      "id": "my-proxy"
    }
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
  "custom-rule-set:PRE_REPAIR_EASY_PRIVACY_DIRECT",
  "custom-rule-set:PRE_REPAIR_EASY_PRIVACY_PROXY",
  "custom-rule-set:PRE_REPAIR_EASY_PRIVACY_REJECT",
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
  "custom-rule-set:FASTLY_IP",
  "custom-rule-set:PARSEC_DOMAIN",
  "custom-rule-set:RUSTDESK_DOMAIN",
  "custom-rule-set:MAC_APP_UPGRADE_DOMAIN",
  "custom-rule-set:EMULE_SERVER_IP",
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
  "custom-rule-set:BANK_AU_DOMAIN",
  "custom-rule-set:BANK_CA_DOMAIN",
  "custom-rule-set:BANK_DE_DOMAIN",
  "custom-rule-set:BANK_FR_DOMAIN",
  "custom-rule-set:BANK_HK_DOMAIN",
  "custom-rule-set:BANK_JP_DOMAIN",
  "custom-rule-set:BANK_NL_DOMAIN",
  "custom-rule-set:BANK_SG_DOMAIN",
  "custom-rule-set:BANK_UK_DOMAIN",
  "custom-rule-set:BANK_US_DOMAIN",
  "custom-rule-set:PAYPAL",
  "custom-rule-set:WISE",
  "custom-rule-set:MONZO",
  "custom-rule-set:REVOLUT",
  "custom-rule-set:HOMEIP_JP",
  "custom-rule-set:HOMEIP_US",
  "custom-rule-set:BM_BILIBILI",
  "custom-rule-set:BM_XIAOHONGSHU",
  "custom-rule-set:BM_TIKTOK",
  "custom-rule-set:FAKE_LOCATION_BILIBILI",
  "custom-rule-set:FAKE_LOCATION_DOUBAN",
  "custom-rule-set:FAKE_LOCATION_DOUYIN",
  "custom-rule-set:FAKE_LOCATION_KUAISHOU",
  "custom-rule-set:FAKE_LOCATION_TIEBA",
  "custom-rule-set:FAKE_LOCATION_WEIBO",
  "custom-rule-set:FAKE_LOCATION_XIGUA",
  "custom-rule-set:FAKE_LOCATION_XIANYU",
  "custom-rule-set:FAKE_LOCATION_XIAOHONGSHU",
  "custom-rule-set:FAKE_LOCATION_ZHIHU",
  "custom-rule-set:GEO_ROUTING_ASIA_CHINA_CCTLD_DOMAIN",
  "custom-rule-set:GEO_ROUTING_ASIA_CHINA_GEOIP",
  "custom-rule-set:GEO_ROUTING_AMERICA_NORTH_CCTLD_DOMAIN",
  "custom-rule-set:GEO_ROUTING_AMERICA_SOUTH_CCTLD_DOMAIN",
  "custom-rule-set:GEO_ROUTING_EUROPE_WEST_CCTLD_DOMAIN",
  "custom-rule-set:GEO_ROUTING_EUROPE_EAST_CCTLD_DOMAIN",
  "custom-rule-set:GEO_ROUTING_OCEANIA_CCTLD_DOMAIN",
  "custom-rule-set:GEO_ROUTING_ANTARCTICA_CCTLD_DOMAIN",
  "custom-rule-set:GEO_ROUTING_ASIA_EAST_CCTLD_DOMAIN",
  "custom-rule-set:GEO_ROUTING_ASIA_EASTSOUTH_CCTLD_DOMAIN",
  "custom-rule-set:GEO_ROUTING_ASIA_SOUTH_CCTLD_DOMAIN",
  "custom-rule-set:GEO_ROUTING_ASIA_CENTRAL_CCTLD_DOMAIN",
  "custom-rule-set:GEO_ROUTING_ASIA_WEST_CCTLD_DOMAIN",
  "custom-rule-set:GEO_ROUTING_AFRICA_NORTH_CCTLD_DOMAIN",
  "custom-rule-set:GEO_ROUTING_AFRICA_SOUTH_CCTLD_DOMAIN",
  "custom-rule-set:GEO_ROUTING_AFRICA_WEST_CCTLD_DOMAIN",
  "custom-rule-set:GEO_ROUTING_AFRICA_EAST_CCTLD_DOMAIN",
  "custom-rule-set:GEO_ROUTING_AFRICA_CENTRAL_CCTLD_DOMAIN",
  "custom-rule-set:GEO_ROUTING_AMERICA_NORTH_GEOIP",
  "custom-rule-set:GEO_ROUTING_AMERICA_SOUTH_GEOIP",
  "custom-rule-set:GEO_ROUTING_EUROPE_WEST_GEOIP",
  "custom-rule-set:GEO_ROUTING_EUROPE_EAST_GEOIP",
  "custom-rule-set:GEO_ROUTING_OCEANIA_GEOIP",
  "custom-rule-set:GEO_ROUTING_ANTARCTICA_GEOIP",
  "custom-rule-set:GEO_ROUTING_ASIA_EAST_GEOIP",
  "custom-rule-set:GEO_ROUTING_ASIA_EASTSOUTH_GEOIP",
  "custom-rule-set:GEO_ROUTING_ASIA_SOUTH_GEOIP",
  "custom-rule-set:GEO_ROUTING_ASIA_CENTRAL_GEOIP",
  "custom-rule-set:GEO_ROUTING_ASIA_WEST_GEOIP",
  "custom-rule-set:GEO_ROUTING_AFRICA_NORTH_GEOIP",
  "custom-rule-set:GEO_ROUTING_AFRICA_SOUTH_GEOIP",
  "custom-rule-set:GEO_ROUTING_AFRICA_WEST_GEOIP",
  "custom-rule-set:GEO_ROUTING_AFRICA_EAST_GEOIP",
  "custom-rule-set:GEO_ROUTING_AFRICA_CENTRAL_GEOIP",
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
