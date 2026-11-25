cask "lingxi" do
  version "1.3.47"
  sha256 "4db6dbf965729694b4d66ea88facb9e9edb6b45220095850d843169558b8c87e"
  url "https://github.com/adowls/homebrew-tap/releases/download/lingxi-v#{version}/lingxi-desktop-#{version}-arm64.dmg"
  name "WPS 灵犀专业版"
  desc "AI office assistant"
  homepage "https://www.lingxi.cn/"

  livecheck do
    skip "Managed by custom sync workflow"
  end
  app "WPS 灵犀.app"
end
