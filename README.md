# Adowls Tap

## How do I install these formulae?

`brew install adowls/tap/<formula>`

Or `brew tap adowls/tap` and then `brew install <formula>`.

Or, in a `brew bundle` `Brewfile`:

```ruby
tap "adowls/tap"
brew "<formula>"
```

## Documentation

`brew help`, `man brew` or check [Homebrew's documentation](https://docs.brew.sh).

updater/apps.json字段说明（未来添加其他 App 时参考）：
id: 唯一标识，用于区分 Tag（如 filezilla-v3.71.1）。
pageUrl: 带有版本信息或下载入口的官网页面。
versionRegex: 从页面 HTML 中提取最新版本号的正则表达式（第一个括号分组为版本号）。
clickSelector: 页面上触发下载的元素选择器（支持文字匹配，如 a:has-text('arm64') 或 CSS 选择器）。
fallbackClickSelector: （选填）若点击上一链接进入了二级详情页，继续点击下载按钮的选择器。
appBundle: （选填）安装包解压后的应用名称，用于生成 Cask 的 app "xxx.app"。