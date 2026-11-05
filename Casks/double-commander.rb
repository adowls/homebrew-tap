cask "double-commander" do
  arch arm: "aarch64"

  version "1.2.10"
  sha256 arm:   "890bf553059d82150b185c0cb7a71ba0de55350d66a0329d941acafb21452470"

  url "https://downloads.sourceforge.net/doublecmd/Double%20Commander/v#{version}/doublecmd-#{version}.cocoa.#{arch}.dmg"
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
