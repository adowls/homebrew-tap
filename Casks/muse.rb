cask "muse" do
  version "6.0"
  sha256 "3fb6e93e7c8df0e8986c3f763fb5f534f6ae745472b088ed71611549071e5143"

  url "https://github.com/adowls/homebrew-tap/releases/download/muse-v6.0/Muse-6.0.dmg"
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
