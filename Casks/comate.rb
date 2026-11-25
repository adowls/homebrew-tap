cask "comate" do
  version "1.8.15"
  sha256 "ba44ea4cde3ec39b0d3774494436694b4394682a72609e4cb86867dbcc7bc847"
  url "https://github.com/adowls/homebrew-tap/releases/download/comate-v#{version}/WPS.Comate_#{version}_aarch64.dmg"
  name "WPS Comate"
  desc "AI office assistant"
  homepage "https://comate.wps.cn/"

  livecheck do
    skip "Managed by custom sync workflow"
  end
  app "WPS Comate.app"
end
