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

## 配置

环境变量和密钥生成详见 README.md。所有 API 调用通过 `scripts/api.js` 统一入口，自动从环境变量或 `.env` 文件读取配置并处理 JWT 认证。

## 执行流程

1. **解析用户意图**：判断查询类型（实时天气/预报/空气质量/预警等）和目标地点
2. **位置归一化**：
   - 城市名 → 调用 `city-lookup` 取返回的 `id` 与 `lat`/`lon`
   - LocationID → 直接使用
   - 原始经纬度 → 按下方「坐标系规则」确认坐标系；可疑时改走城市名 + city-lookup
3. **调用对应 API**：使用 `node /path/to/skill_dir/scripts/api.js <command>` 调用相应接口
4. **格式化输出**：按输出模式呈现结果

### API CLI 命令参考

所有命令输出 JSON，可直接解析。

```bash
# 城市查询（--location 支持：城市名 | 经度,纬度 | LocationID | Adcode，中国 Adcode 可避免歧义）
# → location[]: name, id, lat, lon, adm1, adm2, country
node /path/to/skill_dir/scripts/api.js city-lookup --location=北京

# 实时天气（--location: LocationID 或 经度,纬度，下同）
# → now: temp, feelsLike, text, windDir, windScale, humidity, precip, pressure, vis, cloud, dew
node /path/to/skill_dir/scripts/api.js weather-now --location=101010100

# 逐日预报（默认3天，可选 3/7/10/15/30）→ daily[]: fxDate, tempMax, tempMin, textDay, textNight, windDirDay, windScaleDay, humidity, precip, uvIndex, sunrise, sunset
node /path/to/skill_dir/scripts/api.js weather-daily --location=101010100 --days=7

# 逐时预报（默认24小时，可选 24/72/168）→ hourly[]: fxTime, temp, text, pop(降水概率%), precip, windDir, windScale, humidity, cloud
node /path/to/skill_dir/scripts/api.js weather-hourly --location=101010100

# 空气质量 → indexes[]: aqi, category, primaryPollutant; pollutants[]: name, concentration.value/unit
node /path/to/skill_dir/scripts/api.js air-quality --lat=39.90 --lon=116.41

# 灾害预警 → alerts[]: headline, severity, description, effectiveTime, expireTime, instruction
node /path/to/skill_dir/scripts/api.js weather-alert --lat=39.90 --lon=116.41 [--localTime=true]

# 生活指数（type: 0=全部, 3=穿衣, 5=紫外线, 9=感冒）→ daily[]: name, level, category, text
node /path/to/skill_dir/scripts/api.js indices --location=101010100 --type=3,5,9

# 分钟级降水（仅中国大陆）→ summary(文字描述), minutely[]: fxTime, precip, type
node /path/to/skill_dir/scripts/api.js minutely --lat=39.90 --lon=116.41

# 日出日落 → sunrise, sunset
node /path/to/skill_dir/scripts/api.js sun --location=101010100 --date=20260415

# 月升月落 → moonrise, moonset, moonPhase[]: name, illumination
node /path/to/skill_dir/scripts/api.js moon --location=101010100 --date=20260415
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

其他类型（预警、生活指数、逐时预报、分钟级降水、天文信息）参照上述风格，根据返回字段组织即可。无数据时给出简短提示（如"✅ 当前无气象预警"、"☀️ 未来两小时无降水"）。

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

### ⚠️ 坐标系规则（最重要）

QWeather 所有传入坐标——`city-lookup`、v7 的 `location=经度,纬度`、v1 的 `/{lat}/{lon}` 路径——统一遵守：

- **中国大陆境内：必须 GCJ-02**（高德、腾讯、搜狗等中国地图服务）
- **中国大陆境外：必须 WGS-84**（Google Maps、Apple Maps 海外版、GPS 设备、OpenStreetMap）
- **百度是 BD-09，不能直接用**，需转 GCJ-02 后再传

错的坐标系会偏移几百米到 1km，看起来"成功"但数据是隔壁地区的。

**当用户给原始经纬度时**：
- 优先建议改用城市名走 `city-lookup`，拿 QWeather 自家返回的 `id` 和 `lat`/`lon` 后续使用
- 如果用户坚持用坐标且位置在中国大陆，先确认坐标来源是否为 GCJ-02 系；不确定就直接问，不要默默调用
- 用户坐标位置在中国大陆境外时按 WGS-84 处理即可

### 其他

- 城市名有歧义时（如"苏州"），使用 `adm` 参数指定省份；中国境内也可改用 Adcode 彻底消歧
- 空气质量和预警接口用**路径参数** `/{lat}/{lon}`（纬度在前），v7 接口用 **query 参数** `?location={id 或 lon,lat}`（经度在前）——顺序不同，注意别写反
- 分钟级降水仅限中国大陆，海外查询会返回空结果
- 默认使用公制单位（`unit=m`），用户要求时可切换为英制（`unit=i`）
- 如果用户同时问天气和空气质量，可并行调用两个接口
