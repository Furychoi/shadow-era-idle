# 暗影纪元：放置编年史

基于 GDD v1.1 的可玩版本：45° 等距像素战场、七职业技能联动、暗金/传奇技能性态、自动出售与离线收益。

## 运行

静态页，无后端。存档在浏览器 `localStorage`（键 `shadow-era-save-v11`），换设备不会自动同步。

### 本机 / 局域网

```bash
./scripts/serve.sh
```

打开终端里打印的地址（本机 `http://127.0.0.1:8080`；手机连同一 Wi-Fi 用局域网 IP）。不要用 `file://` 打开，部分浏览器会拦脚本。

### 公网上玩（GitHub Pages）

仓库推到 GitHub 后，用 Actions 自动发布，任何人用链接就能玩。

1. 在 GitHub 新建空仓库（不要勾 README）。
2. 把当前工程推上去，并让默认分支叫 `main`：

```bash
cd ~/Projects/shadow-era-idle
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git add -A
git status   # 确认没有把 zip / .DS_Store 加进去
git commit -m "Publish static idle RPG"
git push -u origin main
```

3. GitHub 仓库 → **Settings → Pages**：Source 选 **GitHub Actions**。
4. 打开 **Actions**，应出现工作流 `Deploy GitHub Pages`；跑完后地址为：

`https://<你的用户名>.github.io/<仓库名>/`

之后每次把改动推进 `main`，页面会自动更新。也可在 Actions 里手动跑 **Run workflow**。

仓库若是 **private**，免费账号一般不能开 Pages；改成 Public，或改用下面的 Cloudflare。

### 备用：Cloudflare Pages（也适合私有源码）

1. 把代码推到 GitHub / GitLab。
2. [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages → Create → Pages → Connect git。
3. Framework preset 选 **None**，Build command 留空，Output directory 填 `/`。
4. 部署完成后用 `*.pages.dev` 链接玩。

进游戏后英雄会自动寻敌、普攻和放技能。若战场停住，硬刷新一次。

## 内容

- **战场**：等距菱形地砖，角色与怪物像素块，自动寻敌
- **职业**：开局狂战士 / 亚马逊；薇斯娜→元素师；杜瑞尔→德鲁伊+刺客；议会→圣骑；迪亚波罗→死灵
- **技能**：每职业 12 技能，点数联动 + 标签共鸣 + 起手/收招窗口
- **怪物**：普通 / 精英 / 稀有 / 稀有 Boss / 章节 Boss，含种族抗性
- **装备**：白蓝黄绿暗金橙红；套装；性态词条（穿刺、新星化、击中施放等）
- **背包**：锁定、筛选、一键整理、出售垃圾、DPS 对比
- **挂机**：自动出售规则；离线 12 小时阶梯效率

旧存档键已更换为 `shadow-era-save-v11`，不会读取 v0.2 Demo 存档。
