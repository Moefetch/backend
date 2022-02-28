import express, { Express } from "express";
import cors from "cors";
import http from "http";
import fs from "fs";
import settings from "./settings";
console.log(settings);
import chalk from "chalk";
import { v4 as uuidv4 } from "uuid";
import {upload} from "./middlewares/upload"

import type { CreateCollectionOptions } from "mongodb";

/////////////////////////////////////////////// grounds for testing if dd connection can be established
import mongoose from "mongoose";
let serverState;

mongoose.connection.on('error', function(error) {
  console.log("error: ", error)
})
mongoose.connection.on('open', function (ref) {
  console.log('Connected to Mongo server...')
})

const dbConnection = mongoose.connect(settings.database_url);

///////////////////////////////////////////////////////////////////
import TableOfContentsModel from "./models/TableOfContents";

//import AnimePic from "./models/AnimePic";

import CreateAnimePicModel from "./models/schemas/CreateAnimePicModel";
import { ITableOfContents, AlbumSchemaType, INewPic } from "types";


const typesOfModelsDictionary = {
  "Anime Pic": CreateAnimePicModel,
}

const typesOfModels = ["Anime Pic"];

if (!fs.existsSync("../files/thumbnail_files")) {
  fs.mkdirSync("../files/thumbnail_files", { recursive: true })
}

class backendServer {
  public express: Express;
  public server: http.Server;
  private backendURL = process.env.DEV ? "http://127.0.0.1:2234" : "http://localhost:2234" ;

  constructor() {
    this.express = express();
    this.server = http.createServer(this.express);
    console.log(this.backendURL)

    this.registerExpressRoutes();

    this.server.listen(settings.port, () =>
      console.log(chalk.cyan(`[SERVER] Started on port ${settings.port.toString()}`))
    );
  }
  private registerExpressRoutes(){
    this.express.use(
        cors({
          origin: (origin: any, callback: any) => callback(null, true),
        })
      );
      //oh fuck here we go 
    this.express.use(express.json());
    this.express.use(express.static("../files"));

    this.express.post('/force-save', async (req, res) =>{
        console.log(req);
        return res.status(200).json({"sex":"sex"})

    })
    this.express.post('/check-status', async (req, res) =>{

    return res.status(200).json({"sex":"sex"})

  })

  this.express.post('/add-picture', async (req, res) => {
    const {url, album, type} = req.body;
    const newEntry = new (typesOfModelsDictionary[type as AlbumSchemaType](album))({
      id: uuidv4(),
      file: url,
      thumbnail_file: url,
      album: album,
      links: {discord: url},
      has_results: false,
    })
    newEntry.save()
  })

  this.express.get('/album/:album', async (req, res) => {
    const albumName = req.params.album; //im stop here cus how to get what model to use from this 
    const album = ((await TableOfContentsModel.findOne({uuid: albumName})) as ITableOfContents);
    const response = await (typesOfModelsDictionary[album.type as AlbumSchemaType](album.name)).find();
    res.status(200).json(response);
  })
  this.express.post('/create-album', upload.single("thumbnail_file"), async (req, res) => {
    const thumbnail_file = req.file as Express.Multer.File;
    const {type, name} = req.body;
    const newAlbum: ITableOfContents = {
      name: name as string,
      albumCoverImage: (thumbnail_file.filename),
      type: type as AlbumSchemaType,
      uuid: uuidv4()
    };
    const tableOfContentsEntry = new TableOfContentsModel(newAlbum);
    tableOfContentsEntry.save();
    console.log(newAlbum.name);

    mongoose.connection.createCollection(newAlbum.name);
  })
  this.express.get('/albums', async (req, res) => {      //table is a table of contents aka all of the albums or whatever databases
    const albums = await TableOfContentsModel.find();
    /* const wuh = await (await dbConnection).connection.db.listCollections().toArray()
    console.log(wuh); */
    return res.status(200).json(albums);
  })
  this.express.get('/types-of-models', async (req, res) => {
    return res.status(200).json(typesOfModels);
  })
}

}
export default new backendServer();
