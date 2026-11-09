cask "lingxi" do
  version "1.3.36"
  sha256 "1fb8317bb61c32f0352029121a9f3231258cd8ffcaee553a9bb3b5f01f59ed8c"
  url "https://github.com/adowls/homebrew-tap/releases/download/lingxi-v1.3.36/lingxi-desktop-1.3.36-arm64.dmg"
  name "WPS 灵犀专业版"
  desc "AI office assistant"
  homepage "https://www.lingxi.cn/"

  livecheck do
    skip "Managed by custom sync workflow"
  end

  app "WPS 灵犀.app"
end
