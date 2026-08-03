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

这是一个基于 SubBoost 的 Clash/Mihomo 订阅转换与配置生成工具二改版。重点改动放在“分流规则”和“策略组”这两块：尽量去掉内置模板的限制，让用户可以从空配置开始，自由添加远程规则集、修改规则归属，并给策略组配置远程图标。

## 二改重点

- **空配置友好**：可以从更干净的配置开始，不必被默认内置分流和策略组绑住。
- **我的分流模板**：新增 `我的分流` 模板，内置用户提供的策略组、远程 YAML 规则集和 FINAL 兜底规则。
- **自定义远程规则集**：支持手动添加远程规则集，路径可以是完整 `http/https` URL，也可以是规则路径。
- **规则集属性可改**：规则集可配置名称、类型、格式、目标策略组、直连、拒绝和 `no-resolve`。
- **规则目标更自由**：规则可以指向内置策略组、自定义策略组、`DIRECT`、`REJECT` 或其它自定义目标。
- **规则顺序可调整**：自定义规则集和自定义规则可以参与规则排序，方便控制优先级。
- **策略组远程图标**：自定义策略组支持 `icon` URL，生成的 Clash/Mihomo YAML 会输出 `icon:`。
- **图标编辑体验**：前端补了“图标 URL + 预览 + 打开 + 清空”一行编辑。
- **中转代理组图标**：中转代理组同样支持远程图标 URL，并会写入生成配置。

## 适合谁用

- 不喜欢固定内置策略组，希望自己决定分流结构的人。
- 需要大量自定义远程规则集，并且想给每个规则集指定目标策略的人。
- 需要把规则集指向代理、直连、拒绝或自定义策略组的人。
- 想让策略组在 Clash/Mihomo 客户端里显示远程图标的人。

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
