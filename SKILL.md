---
name: qweather
description: 和风天气查询 — 查询实时天气、天气预报、空气质量、灾害预警、生活指数等。当用户询问天气、气温、降雨、空气质量、日出日落等信息时使用。
license: MIT
compatibility: Requires Node.js 12+ for JWT generation scripts
metadata:
  author: wangkezun
  version: "1.0.0"
  tags: weather, air-quality, forecast, qweather
---

## 输出模式

本 skill 支持两种输出模式：

- **human**（默认）：带 emoji 的格式化文本，适合直接阅读
- **json**：结构化 JSON，适合其他 skill 或程序消费

当其他 skill 调用本 skill 时，应在请求中注明"以 JSON 格式返回"。JSON 输出使用统一信封：

```json
{
  "ok": true,
  "type": "weather_now | forecast_daily | forecast_hourly | air_quality | alert | indices | minutely | astronomy",
  "location": { "name": "北京", "id": "101010100", "lat": "39.90", "lon": "116.41" },
  "data": { ... },
  "updateTime": "2026-04-15T11:30+08:00"
}
```

错误时：
```json
{
  "ok": false,
  "error": { "code": "401", "message": "认证失败，请检查 JWT token" }
}
```

## 激活条件

当用户提到以下关键词或意图时激活：
- 天气、气温、温度、预报、降雨、降水、下雨、下雪
- 空气质量、AQI、PM2.5、雾霾
- 预警、台风、暴雨、高温
- 日出、日落、月相
- 穿衣、紫外线、洗车、运动指数

## 密钥生成

如果尚未生成 Ed25519 密钥对，使用本项目的脚本：

```bash
node scripts/gen-keys.js
```

默认在当前目录生成 `ed25519-private.pem` 和 `ed25519-public.pem`，也可指定输出目录：

```bash
node scripts/gen-keys.js /path/to/output
```

生成后：
1. 将 `ed25519-public.pem` 上传到和风天气控制台
2. 记录生成的**凭据 ID**
3. 妥善保管 `ed25519-private.pem`，切勿提交到版本控制

## 参数获取

本 skill 需要以下环境变量：

| 变量 | 必填 | 说明 |
|------|------|------|
| `QWEATHER_API_HOST` | 是 | API 主机地址（如 `abc123.qweatherapi.com`） |
| `QWEATHER_PROJECT_ID` | 是 | 项目 ID |
| `QWEATHER_CREDENTIAL_ID` | 是 | 凭据 ID（用于 JWT 的 `kid`） |
| `QWEATHER_PRIVATE_KEY` | 是 | Ed25519 私钥（PEM 文件路径或 PEM 内容） |

按以下优先级获取：

1. **本目录 `.env` 文件**（优先）：读取本 skill 目录下的 `.env` 文件
2. **用户全局配置**：`~/.config/qweather/.env`
3. **系统环境变量**：从当前 shell 环境获取

读取 `.env` 文件：
```bash
source "$(dirname "$0")/.env" 2>/dev/null || source ~/.config/qweather/.env 2>/dev/null || true
```

`.env` 文件格式参考 `.env.example`。

## 认证 — JWT Token 生成

所有 API 请求需要 `Authorization: Bearer <token>` 头。

使用本项目的脚本生成 token：

```bash
TOKEN=$(node scripts/gen-jwt.js "$QWEATHER_PROJECT_ID" "$QWEATHER_CREDENTIAL_ID" "$QWEATHER_PRIVATE_KEY")
```

Token 有效期 1 小时。同一会话内可复用，无需每次重新生成。

## 执行流程

1. **解析用户意图**：判断查询类型（实时天气/预报/空气质量/预警等）和目标地点
2. **生成 JWT Token**（如会话内尚未生成）
3. **城市查询**：如果用户给的是城市名，先调用 GeoAPI 获取 `location ID`
4. **调用对应 API**：根据查询类型调用相应接口
5. **格式化输出**：按模板呈现结果

所有请求使用 `WebFetch`，基础 URL 为 `https://$QWEATHER_API_HOST`。

## API 接口

### 1. 城市查询（前置步骤）

```
GET /geo/v2/city/lookup?location={城市名}&lang=zh
```

| 参数 | 必填 | 说明 |
|------|------|------|
| location | 是 | 城市名、经纬度（lon,lat）或 LocationID |
| adm | 否 | 上级行政区划，用于区分同名城市 |
| range | 否 | ISO 3166 国家代码，限定搜索范围 |
| number | 否 | 返回数量 1-20，默认 10 |
| lang | 否 | 语言，默认 zh |

从返回的 `location[0]` 中提取：
- `id` — 后续天气查询的 location 参数
- `lat`, `lon` — 空气质量/预警等路径参数接口使用
- `name` — 城市显示名

**重要**：如果用户直接提供了经纬度，可跳过此步。

### 2. 实时天气

```
GET /v7/weather/now?location={id}&lang=zh&unit=m
```

返回 `now` 对象，关键字段：`temp`(温度)、`feelsLike`(体感)、`text`(天气状况)、`windDir`(风向)、`windScale`(风力等级)、`humidity`(湿度)、`precip`(降水量mm)、`vis`(能见度km)。

### 3. 逐日天气预报

```
GET /v7/weather/{3d|7d|10d|15d|30d}?location={id}&lang=zh&unit=m
```

默认使用 `3d`，用户要求更长时用 `7d` 或 `15d`。

返回 `daily[]`，关键字段：`fxDate`(日期)、`tempMax`/`tempMin`、`textDay`/`textNight`、`windDirDay`/`windScaleDay`、`humidity`、`precip`、`uvIndex`、`sunrise`/`sunset`。

### 4. 逐时天气预报

```
GET /v7/weather/{24h|72h|168h}?location={id}&lang=zh&unit=m
```

默认使用 `24h`。返回 `hourly[]`，关键字段：`fxTime`、`temp`、`text`、`pop`(降水概率%)、`precip`、`windDir`/`windScale`。

### 5. 空气质量（实时）

⚠️ 注意：此接口使用**路径参数**，不是 query 参数。

```
GET /airquality/v1/current/{latitude}/{longitude}?lang=zh
```

纬度/经度保留两位小数。返回：
- `indexes[]` — AQI 指数，含 `level`、`category`、`primaryPollutant`、`health.effect`/`health.advice`
- `pollutants[]` — 各污染物浓度

### 6. 灾害预警

⚠️ 同样使用**路径参数**。

```
GET /weatheralert/v1/current/{latitude}/{longitude}?lang=zh
```

返回 `alerts[]`，关键字段：`headline`(标题)、`severity`(严重程度)、`description`(详细描述)、`effectiveTime`/`expireTime`、`instruction`(防御指南)。

如果 `metadata.zeroResult` 为 true，表示当前无预警。

### 7. 生活指数

```
GET /v7/indices/1d?location={id}&type={type_ids}&lang=zh
```

常用指数类型：

| type | 名称 | type | 名称 |
|------|------|------|------|
| 1 | 运动 | 2 | 洗车 |
| 3 | 穿衣 | 5 | 紫外线 |
| 9 | 感冒 | 15 | 交通 |
| 16 | 过敏 | 0 | 全部 |

多个用逗号分隔，如 `type=3,5,9`。返回 `daily[]`，含 `name`、`level`、`category`、`text`。

### 8. 分钟级降水（仅中国大陆）

```
GET /v7/minutely/5m?location={lon},{lat}&lang=zh
```

⚠️ 此接口 location 使用**经度,纬度**格式（非 ID）。仅限中国大陆地区。

返回 `summary`(文字描述) 和 `minutely[]`(未来2小时每5分钟降水量)。

### 9. 天文

日出日落：
```
GET /v7/astronomy/sun?location={id}&date={yyyyMMdd}
```

月升月落及月相：
```
GET /v7/astronomy/moon?location={id}&date={yyyyMMdd}&lang=zh
```

### 10. 热带气旋

台风列表：
```
GET /v7/tropical/storm-list?basin=NP&year={year}
```

台风路径：
```
GET /v7/tropical/storm-track?stormid={storm_id}
```

## 输出格式模板

### 实时天气

```
🌤 {城市} 实时天气

🌡 温度：{temp}°C（体感 {feelsLike}°C）
🌥 天气：{text}
💨 {windDir} {windScale}级
💧 湿度：{humidity}%
🌧 降水：{precip}mm
👁 能见度：{vis}km
🕐 更新：{obsTime}
```

### 逐日预报

```
📅 {城市} 未来{N}天预报

| 日期 | 白天 | 夜间 | 最高 | 最低 | 湿度 | 紫外线 |
|------|------|------|------|------|------|--------|
| {fxDate} | {textDay} | {textNight} | {tempMax}°C | {tempMin}°C | {humidity}% | {uvIndex} |
```

### 空气质量

```
🌬 {城市} 空气质量

📊 AQI：{aqi} — {category}
⚠️ 首要污染物：{primaryPollutant}
💡 建议：{health.advice.generalPopulation}
```

### 灾害预警

```
🚨 {城市} 气象预警

⚠️ {severity} | {headline}
📋 {description}
🛡 防御建议：{instruction}
⏰ 有效期：{effectiveTime} ~ {expireTime}
```

如无预警：`✅ {城市} 当前无气象预警。`

### 生活指数

```
📋 {城市} 今日生活指数

| 指数 | 等级 | 建议 |
|------|------|------|
| {name} | {category} | {text} |
```

### JSON 模式示例

实时天气：
```json
{
  "ok": true,
  "type": "weather_now",
  "location": { "name": "北京", "id": "101010100", "lat": "39.90", "lon": "116.41" },
  "data": {
    "temp": 18, "feelsLike": 16, "text": "霾",
    "windDir": "东风", "windScale": "2", "humidity": 44,
    "precip": 0.0, "vis": 6, "pressure": 1011
  },
  "updateTime": "2026-04-15T11:30+08:00"
}
```

逐日预报：
```json
{
  "ok": true,
  "type": "forecast_daily",
  "location": { "name": "北京", "id": "101010100", "lat": "39.90", "lon": "116.41" },
  "data": {
    "days": [
      { "date": "2026-04-15", "tempMax": 26, "tempMin": 14, "textDay": "晴", "textNight": "多云", "humidity": 52, "uvIndex": 7 },
      { "date": "2026-04-16", "tempMax": 20, "tempMin": 10, "textDay": "小雨", "textNight": "小雨", "humidity": 82, "uvIndex": 2 }
    ]
  },
  "updateTime": "2026-04-15T11:43+08:00"
}
```

空气质量：
```json
{
  "ok": true,
  "type": "air_quality",
  "location": { "name": "北京", "id": "101010100", "lat": "39.90", "lon": "116.41" },
  "data": {
    "aqi": 115, "category": "轻度污染", "primaryPollutant": "PM 2.5",
    "advice": "儿童、老年人及心脏病、呼吸系统疾病患者应减少长时间、高强度的户外锻炼。",
    "pollutants": [
      { "name": "PM 2.5", "value": 87.0, "unit": "μg/m³" },
      { "name": "PM 10", "value": 135.83, "unit": "μg/m³" }
    ]
  },
  "updateTime": "2026-04-15T11:40+08:00"
}
```

## 错误处理

### v7 接口（天气、预报、指数等）

返回 HTTP 200，通过响应体 `code` 字段判断结果：

| code | 含义 | 处理 |
|------|------|------|
| 200 | 成功 | 正常解析数据 |
| 204 | 无数据 | 告知用户该地点暂无此类数据 |
| 400 | 参数错误 | 检查 location 参数是否正确 |
| 401 | 认证失败 | 重新生成 JWT token |
| 403 | 权限不足 | 告知用户订阅不支持此功能 |
| 429 | 请求过频 | 等待后重试 |

⚠️ **关键**：必须检查 `code` 字段，HTTP 状态码始终是 200。

### v1 接口（空气质量、预警、太阳辐射）

直接使用 HTTP 状态码：401=认证失败，400=参数错误，403=权限不足，429=限流。

## 注意事项

- 城市名有歧义时（如"苏州"），使用 `adm` 参数指定省份
- 空气质量和预警接口用**路径参数** `/{lat}/{lon}`，天气接口用 **query 参数** `?location={id}`
- 分钟级降水仅限中国大陆，海外查询会返回空结果
- 默认使用公制单位（`unit=m`），用户要求时可切换为英制（`unit=i`）
- 如果用户同时问天气和空气质量，可并行调用两个接口
