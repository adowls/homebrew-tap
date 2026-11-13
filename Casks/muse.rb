cask "muse" do
  version "12.0"
  sha256 "d2fb78b9368e88bdcef06112ec65e9f07d8fae25ac3ac67cc2c814f6842e4d6d"
  url "https://github.com/adowls/homebrew-tap/releases/download/muse-v12.0/Muse-12.0.dmg"
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
