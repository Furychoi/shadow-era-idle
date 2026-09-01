# 暗影纪元

仓库根目录是游戏入口。各游戏在 `games/` 下：

| 目录 | 游戏 |
|---|---|
| [`games/放置/`](games/放置/) | 暗影纪元：放置编年史 |
| [`games/塔防/`](games/塔防/) | 暗影防线 · 八方塔防 |

## 运行

```bash
./scripts/serve.sh
```

打开 `http://127.0.0.1:8080` 选游戏。不要用 `file://` 打开。

- 放置：`http://127.0.0.1:8080/games/放置/`
- 塔防：`http://127.0.0.1:8080/games/塔防/`

塔防规则自检：

```bash
node games/塔防/tests/rules.test.js
```

GitHub Pages 会发布目录页和两个游戏。
