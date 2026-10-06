import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const DOWNLOAD_DIR = path.resolve('downloads');
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

function getSha256(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function checkReleaseExists(repo, tag, token) {
  if (!repo) return false;
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${tag}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

function updateOrGenerateCask(appConfig, version, sha256, filename, repo) {
  const caskPath = path.resolve('..', 'Casks', `${appConfig.id}.rb`);
  const tag = `${appConfig.id}-v${version}`;

  if (fs.existsSync(caskPath)) {
    let content = fs.readFileSync(caskPath, 'utf-8');
    content = content.replace(/version\s+"[^"]+"/, `version "${version}"`);
    content = content.replace(/sha256\s+"[^"]+"/, `sha256 "${sha256}"`);
    fs.writeFileSync(caskPath, content, 'utf-8');
    console.log(`[${appConfig.id}] 已自动更新 ${caskPath} 版本为 ${version}`);
  } else {
    console.log(`[${appConfig.id}] 检测到 ${caskPath} 不存在，正在自动创建...`);
    const caskContent = `cask "${appConfig.id}" do
  version "${version}"
  sha256 "${sha256}"

  url "https://github.com/${repo}/releases/download/${tag}/${filename}"
  name "${appConfig.name}"
  desc "${appConfig.desc || appConfig.name}"
  homepage "${appConfig.homepage || ""}"

  livecheck do
    skip "Managed by custom sync workflow"
  end

  app "${appConfig.appBundle || appConfig.name + ".app"}"
end
`;
    fs.writeFileSync(caskPath, caskContent, 'utf-8');
    console.log(`[${appConfig.id}] ✔ 已成功自动生成 ${caskPath}`);
  }
}

async function processApp(appConfig, browser, repo, token) {
  console.log(`\n========================================`);
  console.log(`正在检查应用: ${appConfig.name} (${appConfig.id})`);
  console.log(`========================================`);

  // ⭐️ 伪装真实浏览器环境：注入真实 Referer，抹除自动化标头
  const referer = appConfig.homepage || (new URL(appConfig.pageUrl).origin + '/');
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': referer,
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
    },
    acceptDownloads: true
  });

  const page = await context.newPage();

  try {
    let version = null;
    let download = null;

    if (appConfig.directDownload) {
      console.log(`[${appConfig.id}] 采用直链模式，先访问首页建立会话，再发起下载...`);
      // 1. 如果有 homepage，先顺道访问一下建立合法 Session 和 Cookie
      if (appConfig.homepage) {
        await page.goto(appConfig.homepage, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => { });
        await page.waitForTimeout(2000);
      }

      console.log(`[${appConfig.id}] 正在请求下载入口: ${appConfig.pageUrl}`);
      const downloadPromise = context.waitForEvent('download', { timeout: 25000 }).catch(() => null);

      const navResponse = await page.goto(appConfig.pageUrl, { timeout: 30000 }).catch(err => {
        // 如果触发了下载，Chromium 通常会抛出 net::ERR_ABORTED，这是正常现象
        return null;
      });

      download = await downloadPromise;

      if (!download) {
        // ⭐️ 诊断信息：如果没有产生下载，把服务端的真实返回打印出来
        const status = navResponse ? navResponse.status() : 'Unknown';
        const currentUrl = page.url();
        console.error(`[${appConfig.id}] 错误: 未能捕获到下载流！`);
        console.error(`  - HTTP 状态码: ${status}`);
        console.error(`  - 当前所在 URL: ${currentUrl}`);
        const bodySnippet = (await page.innerText('body').catch(() => '')).slice(0, 300);
        console.error(`  - 页面返回内容预览: ${bodySnippet.replace(/\s+/g, ' ')}`);
        return;
      }

      const filename = download.suggestedFilename();
      console.log(`[${appConfig.id}] 捕获到文件名: ${filename}`);

      const match = filename.match(new RegExp(appConfig.versionRegex, 'i'));
      if (match && match[1]) {
        version = match[1];
      } else {
        // 如果文件名是 Muse.dmg 这种没有带版本号的，使用当前日期作为临时版本或预设版本
        console.warn(`[${appConfig.id}] 文件名未包含版本号，使用默认 latest 标记`);
        version = "latest";
      }

      const tag = `${appConfig.id}-v${version}`;
      console.log(`[${appConfig.id}] 解析出版本: ${version} (Tag: ${tag})`);

      if (version !== "latest" && await checkReleaseExists(repo, tag, token)) {
        console.log(`[${appConfig.id}] 该版本已存在，取消下载。`);
        await download.cancel().catch(() => { });
        return;
      }
    } else {
      // 模式 B：页面探测模式（FileZilla 等）
      console.log(`[${appConfig.id}] 正在访问展示页: ${appConfig.pageUrl}`);
      await page.goto(appConfig.pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

      const content = await page.content();
      const match = content.match(new RegExp(appConfig.versionRegex, 'i'));
      if (!match || !match[1]) {
        console.error(`[${appConfig.id}] 提取版本号失败。`);
        return;
      }

      version = match[1];
      const tag = `${appConfig.id}-v${version}`;
      console.log(`[${appConfig.id}] 最新版本: ${version} (Tag: ${tag})`);

      if (await checkReleaseExists(repo, tag, token)) {
        console.log(`[${appConfig.id}] 该版本已存在，跳过下载。`);
        return;
      }

      console.log(`[${appConfig.id}] 发现新版本，开始点击下载...`);
      const link = page.locator(appConfig.clickSelector).first();
      const downloadPromise = context.waitForEvent('download', { timeout: 30000 }).catch(() => null);
      await link.click();
      download = await downloadPromise;

      if (!download && appConfig.fallbackClickSelector) {
        await page.waitForLoadState('domcontentloaded');
        const directPromise = context.waitForEvent('download', { timeout: 60000 });
        await page.locator(appConfig.fallbackClickSelector).first().click();
        download = await directPromise;
      }
    }

    if (!download) {
      console.error(`[${appConfig.id}] 未能完成下载流程。`);
      return;
    }

    const filename = download.suggestedFilename();
    const savePath = path.join(DOWNLOAD_DIR, filename);
    console.log(`[${appConfig.id}] 正在保存文件: ${filename}...`);
    await download.saveAs(savePath);

    const sha256 = getSha256(savePath);
    console.log(`[${appConfig.id}] 下载完成！SHA-256: ${sha256}`);

    // 发布 GitHub Release
    const tag = `${appConfig.id}-v${version}`;
    const title = `${appConfig.name} ${version}`;
    const notes = `Automated release for ${appConfig.name} v${version}\n\nSHA-256: \`${sha256}\``;
    console.log(`[${appConfig.id}] 正在发布 GitHub Release (${tag})...`);
    execSync(
      `gh release create "${tag}" "${savePath}" --title "${title}" --notes "${notes}"`,
      { stdio: 'inherit', env: { ...process.env, GH_TOKEN: token } }
    );

    // 自动更新或创建 Cask 文件
    updateOrGenerateCask(appConfig, version, sha256, filename, repo);

  } catch (err) {
    console.error(`[${appConfig.id}] 处理异常:`, err);
  } finally {
    await context.close();
  }
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;

  const apps = JSON.parse(fs.readFileSync('apps.json', 'utf-8'));
  // ⭐️ 核心关键参数：禁用 Blink 自动化标志，消除 navigator.webdriver 特征
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  for (const app of apps) {
    await processApp(app, browser, repo, token);
  }

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});