# QWeather Skill

和风天气查询 skill，支持实时天气、天气预报、空气质量、灾害预警、生活指数、分钟级降水、天文信息等查询。

## 功能

- 实时天气（温度、体感、风力、湿度、能见度等）
- 逐日天气预报（3/7/10/15/30 天）
- 逐时天气预报（24/72/168 小时）
- 空气质量（AQI、污染物浓度、健康建议）
- 灾害预警
- 生活指数（穿衣、紫外线、感冒、洗车等）
- 分钟级降水预报（仅中国大陆）
- 天文信息（日出日落、月相）
- 热带气旋追踪

## 输出模式

- **human**（默认）：带 emoji 的格式化文本，适合直接阅读
- **json**：结构化 JSON，适合其他 skill 或程序消费

## 配置

### 1. 获取和风天气凭据

1. 注册 [和风天气开发者账号](https://dev.qweather.com/)
2. 创建项目，记录 **项目 ID**
3. 生成 Ed25519 密钥对：
   ```bash
   openssl genpkey -algorithm ED25519 -out ed25519-private.pem
   openssl pkey -pubout -in ed25519-private.pem > ed25519-public.pem
   ```
4. 在控制台上传公钥，记录 **凭据 ID**
5. 在控制台设置中查看你的 **API 主机地址**（格式：`xxx.qweatherapi.com`）

### 2. 配置环境变量

设置以下 4 个变量：

| 变量 | 说明 |
|------|------|
| `QWEATHER_API_HOST` | API 主机地址（如 `abc123.qweatherapi.com`） |
| `QWEATHER_PROJECT_ID` | 项目 ID |
| `QWEATHER_CREDENTIAL_ID` | 凭据 ID（用于 JWT 的 `kid`） |
| `QWEATHER_PRIVATE_KEY` | Ed25519 私钥（PEM 文件路径或 PEM 内容） |

### 3. 安装 Skill

将本仓库克隆到你的 skills 目录：

```bash
git clone git@github.com:wangkezun/qweather-skill.git
```

## 技术细节

- 认证方式：Ed25519 (EdDSA) JWT
- Token 生成：`scripts/gen-jwt.js`，零外部依赖，使用 Node.js 内置 `crypto` 模块
- API 文档：https://dev.qweather.com/docs/api/
- 认证文档：https://dev.qweather.com/docs/configuration/authentication/

## License

MIT
