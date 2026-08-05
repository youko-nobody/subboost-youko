import Link from "next/link";
import { ArrowLeft, CheckCircle2, Copy, ExternalLink, Server, TerminalSquare } from "lucide-react";
import { Button } from "@subboost/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@subboost/ui/components/ui/card";

const installSteps = [
  {
    title: "1. 登录 VPS",
    body: "用 SSH 登录你的服务器。建议使用 Ubuntu 22.04/24.04 或 Debian 12，内存至少 1GB。",
    command: "ssh root@你的服务器IP",
  },
  {
    title: "2. 安装 Docker",
    body: "如果服务器还没有 Docker，可以先安装 Docker 和 Compose 插件。",
    command: [
      "curl -fsSL https://get.docker.com | bash",
      "docker compose version",
    ].join("\n"),
  },
  {
    title: "3. 拉取项目",
    body: "把你二改后的 GitHub 仓库拉到服务器。下面地址按你的仓库为例。",
    command: [
      "git clone https://github.com/youko-nobody/subboost-youko.git",
      "cd subboost-youko",
    ].join("\n"),
  },
  {
    title: "4. 创建环境变量",
    body: "复制示例环境变量，然后编辑 local/.env。最重要的是 APP_URL，公网域名部署时必须写正式域名。",
    command: [
      "cp local/local.env.example local/.env",
      "nano local/.env",
    ].join("\n"),
  },
  {
    title: "5. 启动服务",
    body: "首次启动会构建镜像并启动数据库、应用和定时任务。",
    command: "docker compose --env-file local/.env -f local/docker-compose.yml up -d --build",
  },
  {
    title: "6. 创建管理员",
    body: "浏览器打开初始化链接，把 LOCAL_SETUP_TOKEN 换成 local/.env 里的值，创建第一个管理员账号。",
    command: "https://你的域名/login#setup-token=你的LOCAL_SETUP_TOKEN",
  },
];

const envRows = [
  ["APP_URL", "正式访问地址。Cloudflare Tunnel 用 https://你的域名 这种公网域名。"],
  ["SUBBOOST_PORT", "容器映射到服务器的端口，常用 3000。"],
  ["DATABASE_URL", "数据库连接串，密码要和 POSTGRES_PASSWORD 一致。"],
  ["ENCRYPTION_KEY", "加密保存订阅配置的密钥，部署后不要随便改。"],
  ["JWT_SECRET", "登录会话密钥，部署后不要随便改。"],
  ["CRON_SECRET", "定时任务调用接口的密钥。"],
  ["LOCAL_SETUP_TOKEN", "首次初始化管理员用的令牌，初始化后仍建议妥善保存。"],
];

export default function DeployGuidePage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-4 gap-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
        </Button>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm text-indigo-300">SubBoost Youko 自部署</p>
            <h1 className="text-2xl font-bold text-white md:text-3xl">VPS 安装部署教程</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
              这份教程按“能跑起来、能生成正确订阅链接、方便后续更新”的顺序写。你用 Cloudflare Tunnel
              或其它反向代理时，重点确认 APP_URL 是最终给 Clash 客户端导入的公网域名。
            </p>
          </div>
          <Button asChild className="gap-2">
            <a href="/dashboard/settings">
              查看运行站点
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <div className="rounded-lg bg-indigo-500/20 p-2 text-indigo-300">
              <Server className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">推荐环境</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-white/60">
            Linux VPS、Docker Compose、PostgreSQL 容器、一个可访问的公网域名。
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">关键检查</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-white/60">
            后台“账户设置 / 运行站点”里，订阅分享主域名应显示你的正式域名。
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <div className="rounded-lg bg-sky-500/20 p-2 text-sky-300">
              <Copy className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">备份重点</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-white/60">
            保存 local/.env 和数据库备份。ENCRYPTION_KEY 丢了，已保存订阅配置无法解密。
          </CardContent>
        </Card>
      </div>

      <section className="mt-6 space-y-4">
        {installSteps.map((step) => (
          <Card key={step.title}>
            <CardHeader>
              <CardTitle className="text-base">{step.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-6 text-white/60">{step.body}</p>
              <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/35 p-3 text-xs leading-5 text-white/75">
                <code>{step.command}</code>
              </pre>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">local/.env 小白说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-hidden rounded-lg border border-white/10">
              {envRows.map(([key, desc]) => (
                <div key={key} className="grid gap-2 border-b border-white/10 p-3 last:border-b-0 sm:grid-cols-[10rem_1fr]">
                  <code className="text-xs text-indigo-200">{key}</code>
                  <p className="text-sm text-white/60">{desc}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100/80">
              通过 Cloudflare Tunnel 访问时，APP_URL 写隧道域名，例如 https://你的域名，
              不要写 localhost，也不要写容器内地址。
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <div className="rounded-lg bg-white/10 p-2 text-white/70">
              <TerminalSquare className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">常用维护命令</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/35 p-3 text-xs leading-5 text-white/75">
              <code>
                {[
                  "docker compose --env-file local/.env -f local/docker-compose.yml ps",
                  "docker compose --env-file local/.env -f local/docker-compose.yml logs -f app",
                  "git pull",
                  "docker compose --env-file local/.env -f local/docker-compose.yml up -d --build",
                  "docker compose --env-file local/.env -f local/docker-compose.yml down",
                ].join("\n")}
              </code>
            </pre>
            <p className="text-sm leading-6 text-white/60">
              改了 APP_URL、密钥或端口后，需要重新 up -d。更新代码后建议重新构建镜像。
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
