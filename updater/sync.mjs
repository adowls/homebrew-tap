import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

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
    extraHTTPHeaders: {
      'sec-ch-ua-platform': '"macOS"',
      'sec-ch-ua-mobile': '?0',
      'Referer': appConfig.homepage || 'https://ai.meta.com/'
    },
    acceptDownloads: true
  });

  // ⭐️ 核心关键：在 Linux 容器中强制伪装 navigator.platform 为 MacIntel
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });
    if (navigator.userAgentData) {
      Object.defineProperty(navigator.userAgentData, 'platform', { get: () => 'macOS' });
    }
  });

  const page = await context.newPage();

  try {
    console.log(`[${appConfig.id}] 正在访问入口页: ${appConfig.pageUrl}`);
    await page.goto(appConfig.pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 自动同意 Meta / 网站 Cookie 弹窗
    const cookieBtn = page.locator('button:has-text("Allow all cookies"), button:has-text("Decline optional cookies"), button:has-text("Accept all")').first();
    if (await cookieBtn.count() > 0 && await cookieBtn.isVisible()) {
      await cookieBtn.click().catch(() => { });
    }

    let version = null;

    // 阶段 1：先看页面 HTML 中是否已经印有版本（如 FileZilla）
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
      console.log(`[${appConfig.id}] 页面 HTML 中未印有版本号（属于动态分发类型），准备捕获下载流...`);
    }

    // Muse 的下载入口是一个前端渲染出来的 CDN 签名直链。优先抓取它，
    // 避免 /api/hatch/app-download/mac 对未登录或未授权会话返回 not_eligible。
    let directDownload = null;
    if (appConfig.downloadLinkSelector) {
      let href = null;

      if (appConfig.downloadLinkSelector) {
        const directLink = page.locator(appConfig.downloadLinkSelector).first();
        await directLink.waitFor({ state: 'attached', timeout: 20000 }).catch(() => { });
        href = await directLink.getAttribute('href').catch(() => null);
      }

      if (!href) {
        href = await page.$$eval('a[href]', anchors => {
          const match = anchors.find(anchor => /\.dmg(?:[?#]|$)/i.test(anchor.getAttribute('href') || ''));
          return match?.getAttribute('href') || null;
        }).catch(() => null);
      }

      if (href) {
        try {
          const parsed = new URL(href);
          const filename = decodeURIComponent(parsed.pathname.split('/').pop());
          if (filename.toLowerCase().endsWith('.dmg')) {
            directDownload = { href, filename };
            console.log(`[${appConfig.id}] 找到前端渲染的直链: ${filename}`);
          }
        } catch { }
      }
    }

    if (directDownload) {
      const filename = directDownload.filename;
      const fileMatch = filename.match(new RegExp(appConfig.versionRegex, 'i'));
      const releaseVersion = fileMatch?.[1] || version || "latest";
      const releaseTag = `${appConfig.id}-v${releaseVersion}`;

      if (releaseVersion !== "latest" && await checkReleaseExists(repo, releaseTag, token)) {
        console.log(`[${appConfig.id}] 版本 ${releaseVersion} 已经发布过，跳过下载。`);
        return;
      }

      const savePath = path.join(DOWNLOAD_DIR, filename);
      console.log(`[${appConfig.id}] 正在通过签名直链下载 ${filename}...`);
      const response = await context.request.get(directDownload.href, {
        timeout: 600000,
        headers: { Referer: appConfig.pageUrl }
      });

      if (!response.ok()) {
        throw new Error(`签名直链下载失败: HTTP ${response.status()} ${await response.text().catch(() => '')}`);
      }

      fs.writeFileSync(savePath, await response.body());
      const sha256 = getSha256(savePath);
      const notes = `Automated release for ${appConfig.name} v${releaseVersion}\n\nSHA-256: \`${sha256}\``;
      const title = `${appConfig.name} ${releaseVersion}`;

      console.log(`[${appConfig.id}] 下载完成！SHA-256: ${sha256}`);
      console.log(`[${appConfig.id}] 正在发布 GitHub Release (${releaseTag})...`);
      execFileSync(
        'gh',
        ['release', 'create', releaseTag, savePath, '--title', title, '--notes', notes],
        { stdio: 'inherit', env: { ...process.env, GH_TOKEN: token } }
      );

      updateOrGenerateCask(appConfig, releaseVersion, sha256, filename, repo);
      return;
    }

    // 阶段 2：寻找下载按钮触发下载
    let download = null;
    let downloadPromise = context.waitForEvent('download', { timeout: 35000 }).catch(() => null);

    const link = page.locator(appConfig.clickSelector).first();
    let buttonFound = false;

    try {
      console.log(`[${appConfig.id}] 正在等待下载按钮渲染到页面...`);
      await link.waitFor({ state: 'visible', timeout: 10000 });
      buttonFound = true;
    } catch {
      console.warn(`[${appConfig.id}] 未能等到按钮渲染，准备启动智能会话降级机制...`);
    }

    if (buttonFound) {
      console.log(`[${appConfig.id}] 捕获到按钮，触发下载点击...`);
      await link.click({ timeout: 10000 }).catch(async () => {
        await link.click({ force: true });
      });
      download = await downloadPromise;
    }

    // ⭐️ 阶段 2.5：智能降级机制（如果按钮被隐藏或点击未触发，直接在已建立的合法会话中请求 fallbackUrl）
    if (!download && appConfig.fallbackUrl) {
      console.log(`[${appConfig.id}] 触发降级机制：直接在当前合法 Mac 会话内导航到下载入口: ${appConfig.fallbackUrl}`);
      downloadPromise = context.waitForEvent('download', { timeout: 40000 }).catch(() => null);
      await page.goto(appConfig.fallbackUrl).catch(() => { });
      download = await downloadPromise;
    }

    if (!download) {
      // 输出深度诊断日志
      console.error(`[${appConfig.id}] 无法触发下载！诊断信息:`);
      console.error(`  - 当前 URL: ${page.url()}`);
      console.error(`  - 页面标题: ${await page.title()}`);
      const bodyText = (await page.innerText('body').catch(() => '')).slice(0, 300);
      console.error(`  - 页面文字预览: ${bodyText.replace(/\s+/g, ' ')}`);
      return;
    }

    // 阶段 3：从实际下载到的文件名（如 Muse-6.0.dmg）中提取版本
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

    // 阶段 4：保存安装包、计算哈希、发布 Release
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
    execFileSync(
      'gh',
      ['release', 'create', tag, savePath, '--title', title, '--notes', notes],
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
