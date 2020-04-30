# express-azure-blob

## 概要

node express を使って静的コンテンツを配信する際に Azure Blob Service にコンテンツを配置することができます。コンテナはパブリックアクセスが存在しなくても動作します。Azure Blob Service は匿名アクセスを前提としているため、後からIP制限やBasic認証などの追加となると移行の手間が大きくなります。そこで、安価な App Service のインスタンスに express と express-azure-blob を使用して、現在の資産を維持したまま各種制限を容易に実現します。また、App Service の負荷を軽減するため、リダイレクト可能なファイルは、直接SASを払い出してBlob コンテナにリダイレクトする機能もあります（オプショナル）。
本ライブラリは express のミドルウェアとして動作します。


## 使用方法

### インスタンスの生成は下記のように実装します。
```typescript
import express = require("express");
import eablob = require("express-azure-blob");

const app = express();
app.use(eablob({
    blob: {
        connectionString: "DefaultEndpointsProtocol=http;AccountName=XXXX;AccountKey=XXXX;",
        container: {
            name: "web",
            path: "test"
        },
    }
    basePath: "/abc",
    indexes: ["index.html", "index.htm"],
    /* optional */
    useRedirect: {
        exceptMimeType: [
            "text/html",
            "application/javascript",
            "text/css"
        ],
        statusCode: 302,
        readableMarginSeconds: 60
    }
}));
```

上記設定で下記のような動作をします。

* http://XXXX/abc/foo.jpg ->  container: web test/foo.jpg
* http://XXXX/abc/def/foo.jpg ->  container: web test/def/foo.jpg
* useRedirect.exceptMimeType で指定されているファイル以外を直接blobへredirect

## 依存するライブラリ

* express -> https://www.npmjs.com/package/express
* azure-storage -> https://www.npmjs.com/package/azure-storage
