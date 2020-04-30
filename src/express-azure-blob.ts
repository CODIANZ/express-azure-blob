import express = require("express");
import azure from "azure-storage";
import mime from "mime";

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
    indexes?: string[];
    useRedirect?: {
      exceptMimeType?: string[];
      statusCode?: number;            /* default 302 */
      readableMarginSeconds?: number; /* default 60 */
    }
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

function normalize(s: string){
  const ss = s.replace(/\/+/g, "/");
  return ss.startsWith("/") ? ss.substr(1) : ss;
}


function createRedirectUrl(blob: azure.BlobService, container: string, path: string, margin: number) {
  const startDate = new Date();
  const expiryDate = new Date();
  startDate.setSeconds(startDate.getSeconds() - margin);
  expiryDate.setSeconds(expiryDate.getSeconds() + margin);

  const sharedAccessPolicy = {
      AccessPolicy: {
          Permissions: azure.BlobUtilities.SharedAccessPermissions.READ,
          Start: startDate.toISOString(),
          Expiry: expiryDate.toISOString()
      }
  };

  const sas = blob.generateSharedAccessSignature(container, path, sharedAccessPolicy);
  return blob.getUrl(container, path, sas);
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

    const executor = new Promise<number | undefined>((resolve, reject) => {
      if(rpath.endsWith("/")){
        const findfile = o.indexes?.map((x) => {
          const fpath = normalize(`${cpath}${x}`);
          return isExist(blob, o.blob.container.name, fpath)
            .then(exists => exists ? fpath : undefined);
        });
        if(findfile){
          Promise.all(findfile)
          .then((values) => {
            return values.filter(x => x !== undefined) as string[];
          })
          .then((f) => {
            if(f.length > 0){
              res.contentType("text/html");
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
        const fpath = normalize(cpath);
        const mtype = mime.getType(fpath) ?? "application/octet-stream";
        let bRedirect = false;
        if(o.useRedirect){
          if(o.useRedirect.exceptMimeType){
            bRedirect = o.useRedirect.exceptMimeType.find(x => x == mtype) === undefined;
          }
          else{
            bRedirect = true;
          }
        }
        if(bRedirect){
          const margin = o.useRedirect?.readableMarginSeconds ?? 60;
          const statusCode = o.useRedirect?.statusCode ?? 302;
          const redirectUrl = createRedirectUrl(blob, o.blob.container.name, fpath, margin);
          res.redirect(statusCode, redirectUrl);
          resolve(undefined);
        }
        else{
          res.contentType(mtype);
          resolve(execute(res, blob, o.blob.container.name, fpath));
        }
      }
    });

    executor
    .then((status) => {
      if(status) res.status(status);
    })
    .catch((status) => {
      res.status(status);
    })
    .finally(() => {
      res.end();
      next();
    })
  };
}


export = e;
