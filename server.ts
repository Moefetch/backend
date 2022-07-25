import express, { Express } from "express";
import cors from "cors";
import http from "http";
import fs from "fs";
import settings from "./settings";
import chalk from "chalk";
import { v4 as uuidv4 } from "uuid";
import {upload} from "./middlewares/upload"


function saveSettings() {
  fs.writeFileSync("./settings.json", JSON.stringify(settings, null, 2));
  
}

import type { CreateCollectionOptions } from "mongodb";
console.log(settings);
/////////////////////////////////////////////// grounds for testing if dd connection can be established
import mongoose, { Mongoose } from "mongoose";
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
import { ITableOfContents, AlbumSchemaType, INewPic, IErrorObject } from "types";


const typesOfModelsDictionary = {
  "Anime Pic": CreateAnimePicModel,
}

const typesOfModels = ["Anime Pic"];

if (!fs.existsSync("../files/thumbnail_files")) {
  fs.mkdirSync("../files/thumbnail_files", { recursive: true })
}

const errorsObject: IErrorObject = {
  anyErrors: false,
  backendErrors: [],
  databaseErrors: [],
  saucenaoAPIErrors: []
}


class backendServer {
  public express: Express;
  public server: http.Server;
  private backendURL = process.env.DEV ? "http://127.0.0.1:2234" : "http://localhost:2234" ; //if you wanna go with a hostname

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
    newEntry.save();

    const newNumOfPic = await (typesOfModelsDictionary[type as AlbumSchemaType](album)).countDocuments();
    const albumUpdate = await TableOfContentsModel.findOne({name: album})
    if (albumUpdate) {
      albumUpdate.estimatedPicCount = newNumOfPic; // maybe do ++ instead for less cpu cylces but for now
      
      await albumUpdate.save();
    }
  })

  this.express.get('/album/:album', async (req, res) => {
    const albumUUID = req.params.album; //i think i figured this out, old message -> imma stop here cus idk how to get what model to use from this 
    const album = ((await TableOfContentsModel.findOne({uuid: albumUUID})) as ITableOfContents);
    const response = await (typesOfModelsDictionary[album.type as AlbumSchemaType](album.name)).find();
    res.status(200).json(response);
  })
  this.express.post('/create-album', upload.single("thumbnail_file"), async (req, res) => {
    const {type, name} = req.body;
    
    let thumbnail_file;
    const newAlbum: ITableOfContents = {
      name: name as string,
      albumCoverImage: "thumbnail_files/image.svg",
      type: type as AlbumSchemaType,
      uuid: uuidv4(),
      estimatedPicCount: 0,
    };
    if (req.file) {
      thumbnail_file = req.file as Express.Multer.File;
      newAlbum.albumCoverImage = thumbnail_file.filename;
    }
  
    const tableOfContentsEntry = new TableOfContentsModel(newAlbum);
    tableOfContentsEntry.save();

    mongoose.connection.createCollection(newAlbum.name);
    res.status(200).json("success");
  })
  this.express.get('/albums', async (req, res) => {      //table is a table of contents aka all of the albums or whatever databases
    const albums = await TableOfContentsModel.find();
    /* const wuh = await (await dbConnection).connection.db.listCollections().toArray()
    console.log(wuh); */
    return res.status(200).json(albums);
  })

  this.express.post('/connection-test', async (req, res) => {
    const {
      database_url,
      prefered_quality_highest_bool,
      search_diff_sites,
      saucenao_api_key
    } = req.body;
      console.log(req.body);
      
      settings.prefered_quality_highest_bool = prefered_quality_highest_bool;
      settings.search_diff_sites = search_diff_sites;
      if (search_diff_sites) settings.saucenao_api_key = saucenao_api_key;

    try {
      
    const mongodbTestConnection = await mongoose.createConnection(database_url).asPromise()

    mongodbTestConnection.on('open', function (ref) {
      mongodbTestConnection.close(); //connected

      settings.database_url = database_url;

      saveSettings();
      return res.status(200).json(errorsObject);
    });
    //i need to make sure this has no use ever and then remove it 
    mongodbTestConnection.on('error', function(error) { //for some reason this doesnt catch errors, good job mongoose
      console.log("failed to connect to MongoDB . . . . "); //cant connected

      saveSettings();
      errorsObject.databaseErrors.push('Unable to connect to database')
      errorsObject.anyErrors = true;
      return res.status(200).json(errorsObject);
    })
  
    
    } catch (error) { //this is what actually runs when you cant connect to a database
      
      saveSettings();
      errorsObject.databaseErrors.push('Unable to connect to database')
      errorsObject.anyErrors = true;
      return res.status(200).json(errorsObject);

    }
  })

  this.express.get('/types-of-models', async (req, res) => {
    return res.status(200).json(typesOfModels);
  })
}

}
export default new backendServer();
