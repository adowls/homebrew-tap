cask "muse" do
  version "14.1"
  sha256 "af5e2bbc7dda9490bb7ddcf5cbedbb5289281fac9b2f8be0fdb428e56ace6985"
  url "https://github.com/adowls/homebrew-tap/releases/download/muse-v#{version}/Muse-#{version}.dmg"
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
