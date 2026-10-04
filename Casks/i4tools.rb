cask "i4tools" do
  version "9.10.018"
  sha256 ""
  url "https://url.i4.cn/FFRBr2aa"
  name "i4Tools"
  name "爱思助手"
  desc "All-in-one iOS device management and flashing tool"
  homepage "https://www.i4.cn/"

  # 关键：让 Homebrew 请求短链并从重定向的目标文件名中解析出版本号
  livecheck do
    url :url
    strategy :header_match
    regex(/i4Tools[._-]v?(\d+(?:\.\d+)+)[._-]arm64\.dmg/i)
  end

  # 明确声明仅适用于 Apple Silicon 架构
  depends_on arch: :arm64
  depends_on macos: :big_sur

  # 爱思助手解压后的 App 名称
  pkg "i4tools_arm64.pkg"
  
  uninstall pkgutil: "cn.i4tools.mac"

  zap trash: [
    "~/Library/Caches/cn.i4tools.mac",
    "~/Library/HTTPStorages/cn.i4tools.mac",
    "~/Library/Preferences/cn.i4tools.mac.plist",
    "~/Library/Saved Application State/cn.i4tools.mac.savedState",
  ]
end