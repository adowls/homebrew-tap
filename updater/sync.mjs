import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

// 临时文件下载目录放于 updater/downloads
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

// 自动修改 ../Casks/<app_id>.rb 的版本号和哈希值
function updateCaskFile(appId, version, sha256) {
  const caskPath = path.resolve('..', 'Casks', `${appId}.rb`);
  if (!fs.existsSync(caskPath)) {
    console.warn(`[${appId}] 未找到对应的 Cask 文件: ${caskPath}，跳过自动修改。`);
    return;
  }

  let content = fs.readFileSync(caskPath, 'utf-8');
  content = content.replace(/version\s+"[^"]+"/, `version "${version}"`);
  content = content.replace(/sha256\s+"[^"]+"/, `sha256 "${sha256}"`);
  fs.writeFileSync(caskPath, content, 'utf-8');
  console.log(`[${appId}] 已自动更新 ${caskPath} 的版本为 ${version}`);
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
    await page.goto(appConfig.pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const content = await page.content();
    const match = content.match(new RegExp(appConfig.versionRegex, 'i'));
    if (!match || !match[1]) {
      console.error(`[${appConfig.id}] 提取版本号失败。`);
      return;
    }

    const version = match[1];
    const tag = `${appConfig.id}-v${version}`;
    console.log(`[${appConfig.id}] 最新版本: ${version}`);

    if (await checkReleaseExists(repo, tag, token)) {
      console.log(`[${appConfig.id}] 该版本已存在，无需更新。`);
      return;
    }

    console.log(`[${appConfig.id}] 发现新版本，开始下载...`);
    const link = page.locator(appConfig.clickSelector).first();
    const downloadPromise = context.waitForEvent('download', { timeout: 30000 }).catch(() => null);
    await link.click();
    let download = await downloadPromise;

    if (!download && appConfig.fallbackClickSelector) {
      await page.waitForLoadState('domcontentloaded');
      const directPromise = context.waitForEvent('download', { timeout: 60000 });
      await page.locator(appConfig.fallbackClickSelector).first().click();
      download = await directPromise;
    }

    if (!download) {
      console.error(`[${appConfig.id}] 下载失败。`);
      return;
    }

    const filename = download.suggestedFilename();
    const savePath = path.join(DOWNLOAD_DIR, filename);
    await download.saveAs(savePath);

    const sha256 = getSha256(savePath);
    console.log(`[${appConfig.id}] 下载完成，SHA-256: ${sha256}`);

    // 1. 发布 GitHub Release
    const title = `${appConfig.name} ${version}`;
    const notes = `Automated release for ${appConfig.name} v${version}\n\nSHA-256: \`${sha256}\``;
    execSync(
      `gh release create "${tag}" "${savePath}" --title "${title}" --notes "${notes}"`,
      { stdio: 'inherit', env: { ...process.env, GH_TOKEN: token } }
    );

    // 2. 自动回写并更新 ../Casks/<app_id>.rb
    updateCaskFile(appConfig.id, version, sha256);

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