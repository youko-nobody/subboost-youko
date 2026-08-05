# SubBoost Youko VPS 安装部署教程

这份教程给第一次部署的人看，目标是把 SubBoost Youko 跑在 VPS 上，并让分享订阅链接使用正确的公网域名。示例仓库地址使用 `https://github.com/youko-nobody/subboost-youko.git`。

## 准备条件

- 一台 Linux VPS，推荐 Ubuntu 22.04/24.04 或 Debian 12
- 服务器能访问 GitHub 和 Docker 镜像源
- 一个公网访问地址，可以是服务器 IP，也可以是 Cloudflare Tunnel 域名
- 本机能通过 SSH 登录服务器

## 1. 登录 VPS

```bash
ssh root@你的服务器IP
```

如果你不是 root 用户，后面的 Docker 安装命令可能需要加 `sudo`。

## 2. 安装 Docker

如果服务器还没有 Docker，可以直接使用官方安装脚本：

```bash
curl -fsSL https://get.docker.com | bash
docker compose version
```

看到 Docker Compose 版本号就说明可用。

## 3. 拉取项目

```bash
git clone https://github.com/youko-nobody/subboost-youko.git
cd subboost-youko
```

如果以后要更新，也是在这个目录里执行 `git pull`。

## 4. 创建环境变量

复制示例文件：

```bash
cp local/local.env.example local/.env
```

编辑环境变量：

```bash
nano local/.env
```

至少要填写这些值：

```env
POSTGRES_DB=subboost
POSTGRES_USER=subboost
POSTGRES_PASSWORD=换成强密码
DATABASE_URL=postgresql://subboost:换成强密码@db:5432/subboost?schema=public
ENCRYPTION_KEY=换成随机字符串
JWT_SECRET=换成随机字符串
CRON_SECRET=换成随机字符串
LOCAL_SETUP_TOKEN=换成随机初始化令牌
APP_URL=https://你的正式域名
SUBBOOST_PORT=3000
```

可以用下面的命令生成随机值：

```bash
openssl rand -hex 32
```

`POSTGRES_PASSWORD` 和 `DATABASE_URL` 里的数据库密码必须保持一致。

## 5. 正确填写 APP_URL

`APP_URL` 很重要，它会影响：

- 后台任务生成订阅相关链接
- 分享订阅链接的主域名兜底
- `profile-web-page-url` 等订阅响应头

如果你直接用服务器 IP 访问：

```env
APP_URL=http://你的服务器IP:3000
```

如果你通过 Cloudflare Tunnel 访问，例如域名是 `https://你的域名`：

```env
APP_URL=https://你的域名
```

不要把 `APP_URL` 写成 `localhost`、`127.0.0.1` 或容器内部地址，除非你只在服务器本机测试。

当前版本在网页端新建、编辑和复制订阅时，会优先使用当前访问域名生成订阅链接。也就是说，你从正式域名打开后台，复制出来的链接会优先使用这个域名。但后台定时任务仍然需要正确的 `APP_URL`，所以正式部署后还是建议把它写对。

## 6. 启动服务

```bash
docker compose --env-file local/.env -f local/docker-compose.yml up -d --build
```

查看服务状态：

```bash
docker compose --env-file local/.env -f local/docker-compose.yml ps
```

查看应用日志：

```bash
docker compose --env-file local/.env -f local/docker-compose.yml logs -f app
```

## 7. 初始化管理员

第一次部署后，打开：

```text
https://你的正式域名/login#setup-token=你的LOCAL_SETUP_TOKEN
```

如果暂时只用 IP：

```text
http://你的服务器IP:3000/login#setup-token=你的LOCAL_SETUP_TOKEN
```

在页面上创建第一个管理员账号。项目没有默认后台账号密码。

## 8. Cloudflare Tunnel 提醒

Cloudflare Tunnel 只负责把公网域名转发到你的 VPS 服务。一般需要确认：

- Tunnel 的 Public Hostname 指向你的域名
- Service 指向应用端口，例如 `http://localhost:3000`
- `local/.env` 里的 `APP_URL` 写公网域名，例如 `https://你的域名`
- 容器启动后访问 `https://你的域名/api/health/live` 能返回正常响应

部署完成后，可以登录后台进入“账户设置 / 运行站点”，检查：

- “订阅分享主域名”是否是你的正式域名
- “.env 里的 APP_URL”是否也是你的正式域名

## 9. 更新部署

进入项目目录：

```bash
cd subboost-youko
git pull
docker compose --env-file local/.env -f local/docker-compose.yml up -d --build
```

如果你使用镜像版 Compose，则使用：

```bash
docker compose --env-file local/.env -f local/docker-compose.image.yml pull
docker compose --env-file local/.env -f local/docker-compose.image.yml up -d
```

## 10. 常用维护命令

```bash
docker compose --env-file local/.env -f local/docker-compose.yml ps
docker compose --env-file local/.env -f local/docker-compose.yml logs -f app
docker compose --env-file local/.env -f local/docker-compose.yml restart app
docker compose --env-file local/.env -f local/docker-compose.yml down
```

## 11. 备份重点

一定要保存：

- `local/.env`
- PostgreSQL 数据库备份

特别是 `ENCRYPTION_KEY`，它用于解密已保存的订阅配置。这个值丢失或被改掉后，旧数据可能无法恢复。

## 12. 常见问题

### 复制出来的订阅链接主域名不对

先登录后台，进入“账户设置 / 运行站点”查看当前主域名。如果 `.env 里的 APP_URL` 不对，编辑 `local/.env`：

```env
APP_URL=https://你的正式域名
```

然后重启：

```bash
docker compose --env-file local/.env -f local/docker-compose.yml up -d
```

### 初始化链接打不开

检查 `LOCAL_SETUP_TOKEN` 是否和 `local/.env` 里的值一致，并确认访问路径是：

```text
/login#setup-token=你的LOCAL_SETUP_TOKEN
```

### 容器启动了但网页打不开

先看容器状态和日志：

```bash
docker compose --env-file local/.env -f local/docker-compose.yml ps
docker compose --env-file local/.env -f local/docker-compose.yml logs -f app
```

再检查端口、防火墙、Cloudflare Tunnel 的 Service 地址是否指向 `http://localhost:3000` 或你实际配置的 `SUBBOOST_PORT`。
