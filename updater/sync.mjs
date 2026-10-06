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

// 自动修改或新建 ../Casks/<app_id>.rb
function updateOrGenerateCask(appConfig, version, sha256, filename, repo) {
  const caskPath = path.resolve('..', 'Casks', `${appConfig.id}.rb`);
  const tag = `${appConfig.id}-v${version}`;

  if (fs.existsSync(caskPath)) {
    // 存在则只替换版本和哈希
    let content = fs.readFileSync(caskPath, 'utf-8');
    content = content.replace(/version\s+"[^"]+"/, `version "${version}"`);
    content = content.replace(/sha256\s+"[^"]+"/, `sha256 "${sha256}"`);
    fs.writeFileSync(caskPath, content, 'utf-8');
    console.log(`[${appConfig.id}] 已自动更新 ${caskPath} 版本为 ${version}`);
  } else {
    // 不存在则自动根据模板新建
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

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    acceptDownloads: true
  });
  const page = await context.newPage();

  try {
    let version = null;
    let download = null;

    if (appConfig.directDownload) {
      // 模式 A：直链下载模式（适用于 Muse 等 API 下载链接）
      console.log(`[${appConfig.id}] 采用直链模式，正在请求直链并捕获下载流...`);
      const downloadPromise = context.waitForEvent('download', { timeout: 60000 });
      await page.goto(appConfig.pageUrl).catch(() => { });
      download = await downloadPromise;

      if (!download) {
        console.error(`[${appConfig.id}] 未能捕获到直链下载流。`);
        return;
      }

      const filename = download.suggestedFilename();
      console.log(`[${appConfig.id}] 捕获到文件名: ${filename}`);
      const match = filename.match(new RegExp(appConfig.versionRegex, 'i'));
      if (!match || !match[1]) {
        console.error(`[${appConfig.id}] 无法从文件名 ${filename} 中提取版本号，请检查 versionRegex。`);
        await download.cancel().catch(() => { });
        return;
      }

      version = match[1];
      const tag = `${appConfig.id}-v${version}`;
      console.log(`[${appConfig.id}] 解析出版本: ${version} (Tag: ${tag})`);

      if (await checkReleaseExists(repo, tag, token)) {
        console.log(`[${appConfig.id}] 该版本已存在，取消本次下载。`);
        await download.cancel().catch(() => { });
        return;
      }
    } else {
      // 模式 B：页面探测模式（适用于 FileZilla 等在 HTML 中写明版本的网站）
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
      console.error(`[${appConfig.id}] 下载流程未完成。`);
      return;
    }

    const filename = download.suggestedFilename();
    const savePath = path.join(DOWNLOAD_DIR, filename);
    console.log(`[${appConfig.id}] 正在保存文件: ${filename}...`);
    await download.saveAs(savePath);

    const sha256 = getSha256(savePath);
    console.log(`[${appConfig.id}] 下载完成！SHA-256: ${sha256}`);

    // 1. 创建 GitHub Release
    const tag = `${appConfig.id}-v${version}`;
    const title = `${appConfig.name} ${version}`;
    const notes = `Automated release for ${appConfig.name} v${version}\n\nSHA-256: \`${sha256}\``;
    console.log(`[${appConfig.id}] 正在发布 GitHub Release (${tag})...`);
    execSync(
      `gh release create "${tag}" "${savePath}" --title "${title}" --notes "${notes}"`,
      { stdio: 'inherit', env: { ...process.env, GH_TOKEN: token } }
    );

    // 2. 自动更新或新建 Cask 文件
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
  const browser = await chromium.launch({ headless: true });

  for (const app of apps) {
    await processApp(app, browser, repo, token);
  }

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});