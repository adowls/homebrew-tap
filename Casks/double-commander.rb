cask "double-commander" do
  arch arm: "aarch64"

  version "null"
  sha256 arm:   "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

  url "https://github.com/doublecmd/doublecmd/releases/download/v#{version}/doublecmd-#{version}.cocoa.#{arch}.dmg"
  name "Double Commander"
  desc "File manager with two panels"
  homepage "https://doublecmd.sourceforge.io/"

  livecheck do
    url :url
    strategy :github_latest
  end

  depends_on :macos
  depends_on arch: :arm64

  app "Double Commander.app"

  zap trash: [
    "~/.config/doublecmd",
    "~/Library/Caches/doublecmd",
    "~/Library/Preferences/com.company.doublecmd.plist",
    "~/Library/Saved Application State/com.company.doublecmd.savedState",
  ]
end
