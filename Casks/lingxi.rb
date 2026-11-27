cask "lingxi" do
  version "1.3.52"
  sha256 "45660e6b3d0d23382725c5633dd11aed31796169056034070d13c7869637e23f"
  url "https://github.com/adowls/homebrew-tap/releases/download/lingxi-v#{version}/lingxi-desktop-#{version}-arm64.dmg"
  name "WPS 灵犀专业版"
  desc "AI office assistant"
  homepage "https://www.lingxi.cn/"

  livecheck do
    skip "Managed by custom sync workflow"
  end
  app "WPS 灵犀.app"
end
