cask "mediainfoex" do
  version "null"
  sha256 "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

  url "https://github.com/sbarex/MediaInfo/releases/download/#{version}/MediaInfoEx.zip"
  name "MediaInfo"
  desc "Display file information in Finder contextual menu"
  homepage "https://github.com/sbarex/MediaInfo"

  livecheck do
    url :url
    strategy :github_latest
  end

  depends_on macos: :big_sur

  app "MediaInfoEx.app"

  zap trash: [
    "~/Library/Application Scripts/org.sbarex.MediaInfo",
    "~/Library/Application Scripts/org.sbarex.MediaInfo.Finder-Extension",
    "~/Library/Containers/MediaInfo Finder Extension",
    "~/Library/Containers/org.sbarex.MediaInfo",
    "~/Library/Containers/org.sbarex.MediaInfo.Finder-Extension",
    "~/Library/Preferences/org.sbarex.MediaInfo.plist",
  ]
end