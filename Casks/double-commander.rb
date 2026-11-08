cask "double-commander" do
  arch arm: "aarch64"

  version "1.2.11"
  sha256 arm:   "5fd85c49a968c2fa23bf77561035aaed87924a569cad290dbb278fe483392c3f"

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
