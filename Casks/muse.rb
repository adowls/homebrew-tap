cask "muse" do
  version "13.1"
  sha256 "00cfff39d21c5b5fb694487c8395dbb74b387e1448c0b07208879a8286529e80"
  url "https://github.com/adowls/homebrew-tap/releases/download/muse-v13.1/Muse-13.1.dmg"
  name "Muse"
  desc "Muse — Your Personal AI Agent"
  homepage "https://ai.meta.com/"

  livecheck do
    skip "Managed by custom sync workflow"
  end
  app "Muse.app"

  zap trash: [
    "/tmp/muse.mac",
    "~/Library/Application Support/com.meta.endo",
    "~/Library/Caches/com.meta.endo",
    "~/Library/HTTPStorages/com.meta.endo",
    "~/Library/Preferences/com.meta.endo.plist",
    "~/Library/Saved Application State/com.meta.endo.savedState",
    "~/Library/WebKit/com.meta.endo",
  ]
end
