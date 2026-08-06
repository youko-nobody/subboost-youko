<!-- markdownlint-disable MD033 MD041 -->
<div align="center">
  <p><img src="docs/assets/logo.png" alt="SubBoost" width="96"></p>
  <h1>SubBoost Youko 二改版</h1>
  <p>
    <img src="https://img.shields.io/badge/platform-Linux%20%2B%20Docker-lightgrey.svg" alt="平台：Linux + Docker">
    <img src="https://img.shields.io/badge/version-2.7.0--youko-green.svg" alt="版本 2.7.0-youko">
    <img src="https://img.shields.io/badge/Clash%2FMihomo-%E8%AE%A2%E9%98%85%E8%BD%AC%E6%8D%A2-blue.svg" alt="Clash/Mihomo 订阅转换">
    <img src="https://img.shields.io/badge/rules-%E8%87%AA%E7%94%B1%E8%A7%84%E5%88%99%E9%9B%86-orange.svg" alt="自由规则集">
  </p>
  <p><strong>中文说明 | 基于 <a href="https://github.com/SubBoost/subboost">SubBoost/subboost</a> 二次修改</strong></p>
</div>
<!-- markdownlint-enable MD033 MD041 -->

这是一个基于 SubBoost 的 Clash/Mihomo 订阅转换与配置生成工具二改版。这个版本重点增强了自定义分流、策略组图标、订阅后台管理、更新保护、健康检查和 VPS 自部署体验，适合想自己维护 Clash/Mihomo 配置的人使用。

## 二改功能总览

### 分流规则与策略组

- **空配置模式**：可以从更干净的配置开始，不必被默认内置分流和策略组绑住。
- **Youko 分流模板**：新增 `Youko分流模板`，内置按实际使用整理过的策略组、远程 YAML 规则集和 FINAL 兜底规则。
- **自定义远程规则集**：支持手动添加远程规则集，路径可以是完整 `http/https` URL，也可以是规则路径。
- **规则集属性可改**：规则集可配置名称、类型、格式、目标策略组、`DIRECT`、`REJECT` 和 `no-resolve`。
- **规则目标更自由**：规则可以指向内置策略组、自定义策略组、`DIRECT`、`REJECT` 或其它自定义目标。
- **规则顺序可调整**：自定义规则集、自定义规则和部分内置规则可以参与排序，方便控制优先级。
- **策略组成员可控**：策略组可以手动选择其它策略组、`DIRECT`、`REJECT` 和具体节点。
- **远程规则集清理**：移除无用或失效规则集，让默认模板更干净，后续可以按需继续增删。

### 策略组远程图标

- **策略组 `icon` URL**：自定义策略组支持远程图标 URL，生成的 Clash/Mihomo YAML 会输出 `icon:` 字段。
- **图标 URL 一行编辑**：前端支持“图标 URL + 预览 + 打开 + 清空”一行操作。
- **图标预览**：填写图标链接后可直接在页面里预览，方便确认图标是否可用。
- **中转代理组图标**：中转代理组同样支持远程图标 URL，并会写入生成配置。

### 订阅保存与更新保护

- **订阅更新锁**：开启后，编辑保存或更新节点时只更新节点、订阅源、节点过滤、智能匹配等安全字段，不覆盖模板、策略组、规则集、DNS、图标和规则顺序。
- **更新前差异预览**：后台订阅列表可先点 `预览`，查看新增节点、删除节点、保留节点、失败订阅源和流量信息变化，确认后再真正刷新。
- **更新时智能匹配节点**：订阅源更新后可尽量沿用原来的节点选择，减少策略组里手动选择被打乱的情况。
- **流量/到期信息开关**：可以控制订阅响应是否输出 `subscription-userinfo`、套餐名和账户页信息。
- **分享链接主域名优化**：新建、编辑和复制订阅时会优先使用当前访问域名，降低 `APP_URL` 配错导致链接主域名不对的概率。

### 后台运维功能

- **备份 / 导出 / 恢复**：后台支持导出订阅和模板备份 JSON，也可以从备份文件恢复。
- **订阅配置版本历史**：每次刷新保存后保留配置版本，方便查看历史输出并排查问题。
- **订阅健康检查**：拉取订阅源做健康检查，不写入数据库，用来判断节点源是否还正常。
- **规则集连通性检查**：检查当前订阅生成的远程规则集 URL 是否可访问，方便发现失效规则集。
- **配置有效性检查**：检查当前订阅生成配置是否存在明显结构问题，减少客户端导入失败。
- **自动更新管理**：后台可以配置订阅自动刷新间隔，并查看自动更新状态。
- **账户站点信息**：后台可查看当前访问域名和 `.env` 里的 `APP_URL`，辅助排查反代和 Cloudflare Tunnel 部署问题。

### VPS 自部署适配

- **中文部署教程**：提供小白向 VPS 安装教程，项目内也有 `/deploy-guide` 页面。
- **Docker Compose 部署**：支持源码构建部署，也提供镜像部署文件。
- **Cloudflare Tunnel / 反代友好**：文档和后台提示重点说明 `APP_URL`、正式访问域名、订阅分享链接主域名等问题。
- **GitHub Actions 镜像构建**：推送到主分支后自动构建 Youko 版 Docker 镜像。

## 适合谁用

- 不喜欢固定内置策略组，希望自己决定分流结构的人。
- 需要大量自定义远程规则集，并且想给每个规则集指定目标策略的人。
- 需要把规则集指向代理、直连、拒绝或自定义策略组的人。
- 想让策略组在 Clash/Mihomo 客户端里显示远程图标的人。
- 想把订阅服务长期部署在 VPS 上，并在后台管理、备份、检查和更新订阅的人。

## 使用入口

启动后直接打开首页即可使用转换器：

```text
http://127.0.0.1:3001
```

本地管理后台入口：

```text
http://127.0.0.1:3001/login
```

注意：项目没有默认后台账号密码。首次正式部署时，需要使用 `LOCAL_SETUP_TOKEN` 打开初始化链接，然后在页面上创建第一个管理员账号。

## 本地开发运行

环境要求：

- Node.js `>=22.13.0 <23` 或 `>=24.0.0`
- npm
- PostgreSQL，只有保存订阅、登录后台、自动更新等本地管理功能需要数据库

安装依赖：

```bash
npm ci
```

启动前端开发服务：

```bash
npm run dev
```

默认地址：

```text
http://127.0.0.1:3001
```

如果只检查转换器 UI 和生成 YAML，可以先不配置数据库；如果要使用后台登录、保存订阅、模板保存、自动刷新等功能，需要准备 PostgreSQL，并设置 `DATABASE_URL`。

常用检查：

```bash
npm run lint
npm run test:unit
npm run local:typecheck
```

## Docker 部署

推荐在 Linux 服务器上使用 Docker Compose 从源码构建。

完整小白教程见：[VPS 安装部署教程](./docs/DEPLOYMENT-CN.md)。部署完成后，站内首页也会显示 `VPS 部署教程` 入口，可以直接访问 `/deploy-guide`。

### 1. 克隆项目

```bash
git clone https://github.com/youko-nobody/subboost-youko.git
cd subboost-youko
```

### 2. 准备环境变量

复制示例文件：

```bash
cp local/local.env.example local/.env
```

编辑 `local/.env`，至少填写这些值：

```env
POSTGRES_DB=subboost
POSTGRES_USER=subboost
POSTGRES_PASSWORD=换成强密码
DATABASE_URL=postgresql://subboost:换成强密码@db:5432/subboost?schema=public
ENCRYPTION_KEY=换成随机字符串
JWT_SECRET=换成随机字符串
CRON_SECRET=换成随机字符串
LOCAL_SETUP_TOKEN=换成随机初始化令牌
APP_URL=http://你的服务器IP:3000
SUBBOOST_PORT=3000
```

可以用下面的命令生成随机值：

```bash
openssl rand -hex 32
```

`POSTGRES_PASSWORD` 和 `DATABASE_URL` 里的数据库密码要保持一致。

`APP_URL` 会影响后台任务、订阅分享链接和账户页响应头。通过 Cloudflare Tunnel 或反向代理使用域名时，请把它改成最终访问域名，例如：

```env
APP_URL=https://你的域名
```

如果 `APP_URL` 配错了，现在网页端新建、编辑和复制订阅会优先使用当前访问域名兜底；但仍建议在 `local/.env` 里改正确，然后重启容器。

### 3. 构建并启动

```bash
docker compose --env-file local/.env -f local/docker-compose.yml up -d --build
```

查看运行状态：

```bash
docker compose --env-file local/.env -f local/docker-compose.yml ps
```

查看日志：

```bash
docker compose --env-file local/.env -f local/docker-compose.yml logs -f app
```

### 4. 初始化管理员

第一次部署后，用下面地址打开后台初始化页面：

```text
http://你的服务器IP:3000/login#setup-token=你的LOCAL_SETUP_TOKEN
```

然后在页面中创建管理员账号。创建完成后，以后直接访问 `/login` 登录即可。

## 更新部署

拉取最新代码：

```bash
git pull
```

重新构建并启动：

```bash
docker compose --env-file local/.env -f local/docker-compose.yml up -d --build
```

## 生成配置说明

自定义远程规则集会生成到 Clash/Mihomo 的 `rule-providers`，规则会通过 `RULE-SET` 引用它们。策略组的远程图标会写入 `proxy-groups` 下对应组的 `icon:` 字段。

如果远程规则集使用 `.yaml/.yml`，请确认规则内容格式和 `behavior` 匹配；如果使用 `.mrs`，不能选择 `classical`。

## 开源许可

本项目基于 SubBoost 修改，继续遵循 [GNU Affero General Public License v3.0 only](./LICENSE)。

如果你修改本项目并通过网络提供服务，AGPL-3.0 要求你向服务用户提供对应源码。

## 免责声明

本项目不提供任何代理服务，不保证第三方订阅、远程规则集、图标链接的可用性或合法性。请自行确认使用场景符合当地法律法规。
