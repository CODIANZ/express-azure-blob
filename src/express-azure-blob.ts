import express = require("express");
import azure from "azure-storage";

declare namespace e {
  interface Options {
    blob: {
      connectionString: string;
      container: {
        name: string;
        path: string;
      }
    };
    basePath: string;
    indexes?: string[]
  }
}

function isExist(blob: azure.BlobService, c: string, p: string) {
  return new Promise<boolean>((resolve, reject) => {
    blob.doesBlobExist(c, p, (err, data) => {
      if(err){
        reject(404);
      }
      else{
        resolve(data.exists ?? false);
      }
    });
  });
}

function execute(res: express.Response<any>, blob: azure.BlobService, c: string, p: string) {
  return new Promise<number>((resolve, reject) => {
    const s = blob.createReadStream(c, p, (err) => {
      if(err){
        reject(404);
      }
    });
    s.on("error", (err) =>{
      reject(404);
    })
    s.on("end", () =>{
      resolve(200);
    })
    s.pipe(res);
  });
}

function e(o: e.Options) : express.RequestHandler {
  const blob = azure.createBlobService(o.blob.connectionString);
  return (req, res, next) => {
    if(!req.path.startsWith(o.basePath)){
      next(null);
      return;
    }
    const rpath = req.path.substr(o.basePath.length);
    const cpath = `${o.blob.container.path}${rpath}`;

    const executor = new Promise<number>((resolve, reject) => {
      if(rpath.endsWith("/")){
        const findfile = o.indexes?.map((x) => {
          return isExist(blob, o.blob.container.name, `${cpath}${x}`)
            .then(exists => exists ? `${cpath}${x}` : undefined);
        });
        if(findfile){
          Promise.all(findfile)
          .then((values) => {
            return values.filter(x => x !== undefined) as string[];
          })
          .then((f) => {
            if(f.length > 0){
              resolve(execute(res, blob, o.blob.container.name, f[0]));
            }
            reject(404);
          })
          .catch((status) => {
            reject(status);
          })
        }
        else{
          reject(404);
        }
      }
      else{
        resolve(execute(res, blob, o.blob.container.name, cpath));
      }
    });

    executor
    .then((status) => {
      res.status(status).end();
    })
    .catch((status) => {
      res.status(status).end();
    })
    .finally(() => {
      next();
    })
  };
}


export = e;
