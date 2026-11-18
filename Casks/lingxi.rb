cask "lingxi" do
  version "1.3.41"
  sha256 "ea5907b65d23412316ba84fed2678055454dd8e674c7a0f2ec06cc8c3593b18b"
  url "https://github.com/adowls/homebrew-tap/releases/download/lingxi-v1.3.41/lingxi_installer_eb1bbc6bec16.dmg"
  name "WPS 灵犀专业版"
  desc "AI office assistant"
  homepage "https://www.lingxi.cn/"

  livecheck do
    skip "Managed by custom sync workflow"
  end
  app "WPS 灵犀.app"
end
