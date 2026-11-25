cask "filezilla" do
  version "3.72.1"
  sha256 "d2830c8c5167faf3d5f94f9eadb558bc589c6015b2febcdc4514736561f6363e"
  url "https://github.com/adowls/homebrew-tap/releases/download/filezilla-v3.72.1/FileZilla_3.72.1_macos-arm64.app.tar.bz2"
  name "FileZilla"
  desc "FTP, FTPS and SFTP client"
  homepage "https://filezilla-project.org/"

  # ⭐️ 告诉 livecheck 彻底跳过此软件，交给专用脚本管理
  livecheck do
    skip "Managed by custom sync workflow"
  end

  depends_on arch: :arm64
  app "FileZilla.app"
  
  # 卸载时彻底清理残留配置文件
  zap trash: [
    "~/.config/filezilla",
    "~/Library/Application Support/filezilla",
    "~/Library/Preferences/org.filezilla-project.filezilla.plist",
    "~/Library/Saved Application State/org.filezilla-project.filezilla.savedState",
  ]
end