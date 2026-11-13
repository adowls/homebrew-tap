cask "lingxi" do
  version "latest"
  sha256 "ea5907b65d23412316ba84fed2678055454dd8e674c7a0f2ec06cc8c3593b18b"
  url "https://github.com/adowls/homebrew-tap/releases/download/lingxi-vlatest/lingxi_installer_1dbff0d2ff76.dmg"
  name "WPS 灵犀专业版"
  desc "AI office assistant"
  homepage "https://www.lingxi.cn/"

  livecheck do
    skip "Managed by custom sync workflow"
  end
  app "WPS 灵犀.app"
end
