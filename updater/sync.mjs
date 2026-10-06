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

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
    acceptDownloads: true
  });

  const page = await context.newPage();

  try {
    console.log(`[${appConfig.id}] 正在访问入口页: ${appConfig.pageUrl}`);
    await page.goto(appConfig.pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 自动同意常见的 Cookie 弹窗（防止遮挡点击）
    const cookieBtn = page.locator('button:has-text("Allow all cookies"), button:has-text("Decline optional cookies"), button:has-text("Accept all")').first();
    if (await cookieBtn.count() > 0 && await cookieBtn.isVisible()) {
      await cookieBtn.click().catch(() => { });
    }

    let version = null;

    // ⭐️ 阶段 1：先看页面 HTML 中是否印有版本（如 FileZilla）
    const content = await page.content();
    const pageMatch = content.match(new RegExp(appConfig.versionRegex, 'i'));

    if (pageMatch && pageMatch[1]) {
      version = pageMatch[1];
      console.log(`[${appConfig.id}] 从页面中检测到版本: ${version}`);
      const tag = `${appConfig.id}-v${version}`;
      if (await checkReleaseExists(repo, tag, token)) {
        console.log(`[${appConfig.id}] 该版本已在仓库中发布，跳过下载。`);
        return;
      }
    } else {
      console.log(`[${appConfig.id}] 页面 HTML 中未印有版本号（属于动态分发类型），准备点击按钮捕获下载...`);
    }

    // ⭐️ 阶段 2：定位下载按钮并模拟真实用户点击
    const link = page.locator(appConfig.clickSelector).first();

    console.log(`[${appConfig.id}] 正在等待下载按钮渲染到页面...`);
    try {
      await link.waitFor({ state: 'visible', timeout: 15000 });
    } catch {
      console.error(`[${appConfig.id}] 等待超时，页面未渲染出下载按钮: ${appConfig.clickSelector}`);
      return;
    }

    console.log(`[${appConfig.id}] 捕获到按钮，触发下载点击...`);
    // 统一在外部声明下载相关变量，避免重复声明冲突
    let downloadPromise = context.waitForEvent('download', { timeout: 40000 }).catch(() => null);

    await link.click({ timeout: 10000 }).catch(async () => {
      await link.click({ force: true });
    });

    let download = await downloadPromise;

    // 若未直接触发下载，尝试备用选择器
    if (!download && appConfig.fallbackClickSelector) {
      console.log(`[${appConfig.id}] 尝试备用选择器...`);
      downloadPromise = context.waitForEvent('download', { timeout: 60000 }).catch(() => null);
      await page.locator(appConfig.fallbackClickSelector).first().click({ force: true });
      download = await downloadPromise;
    }

    if (!download) {
      console.error(`[${appConfig.id}] 点击后未捕获到文件下载流。`);
      return;
    }

    // ⭐️ 阶段 3：从捕获到的真实文件名（如 Muse-6.0.dmg）中提取版本
    const filename = download.suggestedFilename();
    console.log(`[${appConfig.id}] 捕获到下载文件名: ${filename}`);

    if (!version) {
      const fileMatch = filename.match(new RegExp(appConfig.versionRegex, 'i'));
      if (fileMatch && fileMatch[1]) {
        version = fileMatch[1];
      } else {
        console.warn(`[${appConfig.id}] 无法从文件名 ${filename} 提取版本号，使用 latest 兜底`);
        version = "latest";
      }
      console.log(`[${appConfig.id}] 从实际文件名中解析出版本: ${version}`);

      const tag = `${appConfig.id}-v${version}`;
      if (version !== "latest" && await checkReleaseExists(repo, tag, token)) {
        console.log(`[${appConfig.id}] 版本 ${version} 已经发布过，取消保存本次下载。`);
        await download.cancel().catch(() => { });
        return;
      }
    }

    // ⭐️ 阶段 4：保存安装包、计算哈希、发布 Release
    const savePath = path.join(DOWNLOAD_DIR, filename);
    console.log(`[${appConfig.id}] 正在下载保存 ${filename}...`);
    await download.saveAs(savePath);

    const sha256 = getSha256(savePath);
    console.log(`[${appConfig.id}] 下载完成！SHA-256: ${sha256}`);

    // 创建 GitHub Release
    const tag = `${appConfig.id}-v${version}`;
    const title = `${appConfig.name} ${version}`;
    const notes = `Automated release for ${appConfig.name} v${version}\n\nSHA-256: \`${sha256}\``;
    console.log(`[${appConfig.id}] 正在发布 GitHub Release (${tag})...`);
    execSync(
      `gh release create "${tag}" "${savePath}" --title "${title}" --notes "${notes}"`,
      { stdio: 'inherit', env: { ...process.env, GH_TOKEN: token } }
    );

    // 自动更新或新建 Cask 文件
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