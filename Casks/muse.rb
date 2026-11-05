cask "muse" do
  version "11.0"
  sha256 "c3c4eb51732166275ad50bec9105af36b286159ded88aefb9734678bdf42fb85"

  url "https://github.com/adowls/homebrew-tap/releases/download/muse-v11.0/Muse-11.0.dmg"
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
