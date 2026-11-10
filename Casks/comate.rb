cask "comate" do
  version "1.8.5"
  sha256 "be39ad65f803c367775b51223e29ea7e56e47a8399e78d58e2b872b85a04a000"
  url "https://github.com/adowls/homebrew-tap/releases/download/comate-v1.8.5/WPS.Comate_1.8.5_aarch64.dmg"
  name "WPS Comate"
  desc "AI office assistant"
  homepage "https://comate.wps.cn/"

  livecheck do
    skip "Managed by custom sync workflow"
  end
  app "WPS Comate.app"
end
