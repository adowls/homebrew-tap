cask "comate" do
  version "1.7.10"
  sha256 "7e62de730417c4c2333b9ffa5a9e93977d6b9000950d624dbd31419e75bf6aa8"

  url "https://github.com/adowls/homebrew-tap/releases/download/comate-v1.7.10/WPS.Comate_1.7.10_aarch64.dmg"
  name "WPS Comate"
  desc "AI office assistant"
  homepage "https://comate.wps.cn/"

  livecheck do
    skip "Managed by custom sync workflow"
  end

  app "WPS Comate.app"
end
