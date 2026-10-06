cask "filezilla" do
  version "3.71.1"
  sha256 "..."

  url "https://github.com/adowls/homebrew-tap/releases/download/filezilla-v#{version}/FileZilla_#{version}_macos-arm64.app.tar.bz2"
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