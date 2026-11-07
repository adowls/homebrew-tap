cask "muse" do
  version "11.1"
  sha256 "f8e49acc1b10b221d27757cf1ba4a3b0e2f6363082a4d0be67e55c597f8ecc2b"
  url "https://github.com/adowls/homebrew-tap/releases/download/muse-v11.1/Muse-11.1.dmg"
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
