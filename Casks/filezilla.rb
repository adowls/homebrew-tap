cask "filezilla" do
  version "3.71.1"
  sha256 "d6e4652f3dd155c7768931d2f4f48c6b2700a7813120462465112b7cf732d01b" # 替换为当前版本的实际 sha256

  url "https://download.filezilla-project.org/client/FileZilla_#{version}_macos-arm64.app.tar.bz2"
  name "FileZilla"
  desc "Free FTP, FTPS and SFTP client"
  homepage "https://filezilla-project.org/"

  livecheck do
    url "https://filezilla-project.org/newsfeed.php"
    regex(/FileZilla\s+Client\s+v?(\d+(?:\.\d+)+)/i)
  end

  depends_on arch: :arm64
  depends_on macos: :big_sur

  app "FileZilla.app"

  zap trash: [
    "~/.config/filezilla",
    "~/Library/Application Support/filezilla",
    "~/Library/Saved Application State/de.filezilla.savedState",
  ]
end