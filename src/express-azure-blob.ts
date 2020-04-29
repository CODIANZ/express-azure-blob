import express = require("express");
import azure from "azure-storage";

declare namespace e {
  interface AzureBlobOptions {    
    connectionString: string;
    container: {
      name: string;
      path: string;
    }
    basePath: string;
  }
}

function e(o: e.AzureBlobOptions) : express.RequestHandler {
  const blob = azure.createBlobService(o.connectionString);
  return (req, res, next) => {
    if(!req.path.startsWith(o.basePath)){
      next(null);
      return;
    }
    const rpath = req.path.substr(o.basePath.length);
    const s = blob.createReadStream(o.container.name, `${o.container.path}${rpath}`, (err) => {
      if(err){
        res.status(400).end();
        next(err);
      }
    });
    s.on("error", (err) =>{
      res.status(400).end();
      next();
    })
    s.on("end", () =>{
      res.status(200).end();
      next();
    })
    s.pipe(res);
  };
}


export = e;
