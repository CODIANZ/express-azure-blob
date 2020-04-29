# express-azure-blob

## 概要

node express を使って静的コンテンツを配信する際に Azure Blob Service にコンテンツを配置することができます。
本ライブラリは express のミドルウェアとして動作します。


## 使用方法

### インスタンスの生成は下記のように実装します。
```typescript
import express = require("express");
import eablob = require("express-azure-blob");

const app = express();
app.use(eablob({
    connectionString: "DefaultEndpointsProtocol=http;AccountName=XXXX;AccountKey=XXXX;",
    container: {
        name: "web",
        path: "test"
    },
    basePath: "/abc"
}));
```

上記設定で下記のような動作をします。

http://XXXX/abc/foo.jpg ->  container: web test/foo.jpg
http://XXXX/abc/def/foo.jpg ->  container: web test/def/foo.jpg

## 依存するライブラリ

* express -> https://www.npmjs.com/package/express
* azure-storage -> https://www.npmjs.com/package/azure-storage
