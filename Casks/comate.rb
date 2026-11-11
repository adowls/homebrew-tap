cask "comate" do
  version "1.8.6"
  sha256 "7a6464969381dd3639dd98b7ec01977dda764b3447196499f62b9c5cabe9280c"
  url "https://github.com/adowls/homebrew-tap/releases/download/comate-v1.8.6/WPS.Comate_1.8.6_aarch64.dmg"
  name "WPS Comate"
  desc "AI office assistant"
  homepage "https://comate.wps.cn/"

  livecheck do
    skip "Managed by custom sync workflow"
  end
  app "WPS Comate.app"
end
