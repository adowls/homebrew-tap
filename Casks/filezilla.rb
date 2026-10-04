cask "filezilla" do
  version "3.71.1"
  sha256 :no_check # bump 命令会自动计算并替换为正确的 sha256

  url "https://downloads.sourceforge.net/project/filezilla/FileZilla_Client/#{version}/FileZilla_#{version}_macos-arm64.app.tar.bz2"
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