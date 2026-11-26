cask "lingxi" do
  version "1.3.49"
  sha256 "b1c68c96552d92addfb9e408f490df5b8ebd12c61a1e68d54a7a468af8928339"
  url "https://github.com/adowls/homebrew-tap/releases/download/lingxi-v#{version}/lingxi-desktop-#{version}-arm64.dmg"
  name "WPS 灵犀专业版"
  desc "AI office assistant"
  homepage "https://www.lingxi.cn/"

  livecheck do
    skip "Managed by custom sync workflow"
  end
  app "WPS 灵犀.app"
end
