import express, { Express } from "express";
import cors from "cors";
import http from "http";
import fs from "fs";
import settings from "./settings";
import chalk from "chalk";
import { v4 as uuidv4 } from "uuid";
import { upload } from "./middlewares/upload";
import Logic from "./src/logic";
import type { CreateCollectionOptions } from "mongodb";

let logic = new Logic(settings);

function saveSettings() {
  fs.writeFileSync("./settings.json", JSON.stringify(settings, null, 2));
  console.log(settings);
  logic = new Logic(settings);
}

console.log(settings);
/////////////////////////////////////////////// grounds for testing if dd connection can be established
import mongoose, { Mongoose } from "mongoose";
let serverState;

mongoose.connection.on("error", function (error) {
  console.log("error: ", error);
});
mongoose.connection.on("open", function (ref) {
  console.log("Connected to Mongo server...");
});

const dbConnection = mongoose.connect(settings.database_url);

///////////////////////////////////////////////////////////////////
import TableOfContentsModel from "./models/TableOfContents";

//import AnimePic from "./models/AnimePic";

import CreateAnimePicModel from "./models/schemas/CreateAnimePicModel";
import {
  ITableOfContents,
  AlbumSchemaType,
  INewPic,
  IAnimePic,
  IErrorObject,
} from "types";

const modelsDictionary = {
  "Anime Pic": CreateAnimePicModel,
};

let stroredModels: any = {
  "Anime Pic": {

  },
};

function typesOfModelsDictionary<T>(type: AlbumSchemaType, name: string): mongoose.Model<T> {
  if (!stroredModels[type] || !stroredModels[type][name]) { 
    const newModel = modelsDictionary[type](name);
    stroredModels[type][name] = newModel;
  }
  return stroredModels[type][name];
}

const typesOfModels = ["Anime Pic"];

if (!logic.checkDirectory(`${settings.downloadFolder}/album_thumbnail_files/`)) {
  logic.downloadFromUrl(
    "https://raw.githubusercontent.com/Moefetch/backend/33a32fb43464e006eb84c43202b8350d68136e75/image.svg",
    `/album_thumbnail_files/`,{providedFileName: 'image'}
  );
}

const errorsObject: IErrorObject = {
  backendUrlError: "",
  databaseUrlError: "",
  saucenaoApiKeyError: "",
};

class backendServer {
  public express: Express;
  public server: http.Server;
  private backendURL = process.env.DEV
    ? "http://127.0.0.1:2234"
    : "http://localhost:2234"; //if you wanna go with a hostname

  constructor() {
    this.express = express();
    this.server = http.createServer(this.express);
    console.log(this.backendURL);

    this.registerExpressRoutes();

    this.server.listen(settings.port, () =>
      console.log(
        chalk.cyan(`[SERVER] Started on port ${settings.port.toString()}`)
      )
    );
  }
  private registerExpressRoutes() {
    this.express.use(
      cors({
        origin: (origin: any, callback: any) => callback(null, true),
      })
    );
    //oh fuck here we go
    this.express.use(express.json());
    this.express.use(express.static(settings.downloadFolder));

    this.express.post("/force-save", async (req, res) => {
      console.log(req);
      return res.status(200).json({ sex: "sex" });
    });
    this.express.post("/check-status", async (req, res) => {
      return res.status(200).json({ sex: "sex" });
    });

    this.express.post("/add-picture", async (req, res) => {
      const { url, album, type, useSauceNao } = req.body; //remember to do .split('\n') and for each to get the stuff bla bla
      const newModelEntry = typesOfModelsDictionary<IAnimePic>((type as AlbumSchemaType),(album));

      let urlsArray: string[] = url.split("\n").filter( (a:string) => a != "");
      const forLoopPromise = new Promise(async (resolve, reject) => {
        urlsArray.forEach(async (value: string, i: number) => {
          const entry = await logic.processInput(value, album);
          console.log(JSON.stringify({
            ...entry,
            id: uuidv4(),
            album: album,
          }))
          if (entry.foundUrl) {
            const newEntry = new newModelEntry({
              ...entry,
              id: uuidv4(),
              album: album,
            }); 
            newEntry.save();
          }
          
          /*             file: url,
            thumbnail_file: url,
            links: {discord: url},
            has_results: false,

 */
          console.log(i);
          if (i == urlsArray.length - 1) resolve;
        });
      });
      await forLoopPromise;
      console.log("out of loop");

      const newNumOfPic = await newModelEntry.countDocuments();
      const albumUpdate = await TableOfContentsModel.findOne({ name: album });
      if (albumUpdate) {
        albumUpdate.estimatedPicCount = newNumOfPic; // maybe do ++ instead for less cpu cylces but for now

        await albumUpdate.save();
      }
    });

    this.express.get("/album/:album", async (req, res) => {
      const albumUUID = req.params.album; //i think i figured this out, old message -> imma stop here cus idk how to get what model to use from this
      const album = (await TableOfContentsModel.findOne({
        uuid: albumUUID,
      })) as ITableOfContents;
      const response = await typesOfModelsDictionary<IAnimePic>(
        album.type as AlbumSchemaType,
        album.name).find();
      res.status(200).json(response);
    });

    this.express.post(
      "/create-album",
      upload.single("album_thumbnail_file"),
      async (req, res) => {
        console.log(req)
        const { type, name } = req.body;

        let album_thumbnail_files;
        const newAlbum: ITableOfContents = {
          name: name as string,
          albumCoverImage: "album_thumbnail_files/image.svg",
          type: type as AlbumSchemaType,
          uuid: uuidv4(),
          estimatedPicCount: 0,
        };
        if (req.file) {
          album_thumbnail_files = req.file as Express.Multer.File;
          newAlbum.albumCoverImage = album_thumbnail_files.filename;
        }

        const tableOfContentsEntry = new TableOfContentsModel(newAlbum);
        tableOfContentsEntry.save();

        mongoose.connection.createCollection(newAlbum.name);
        res.status(200).json(newAlbum);
      }
    );
    this.express.get("/albums", async (req, res) => {
      //table is a table of contents aka all of the albums or whatever databases
      const albums = await TableOfContentsModel.find<ITableOfContents>();
      /* const wuh = await (await dbConnection).connection.db.listCollections().toArray()
    console.log(wuh); */
      return res.status(200).json(albums);
    });

    this.express.post("/connection-test", async (req, res) => {
      console.log(settings);
      const {
        database_url,
        search_diff_sites,
        saucenao_api_key,
        pixiv_download_first_image_only,
      } = req.body;

      settings.search_diff_sites = search_diff_sites;
      settings.pixiv_download_first_image_only =
        pixiv_download_first_image_only;
      if (search_diff_sites) {
        let apiKeyCheck = await Logic.checkSauceNaoApi(saucenao_api_key);
        if (apiKeyCheck) {
          settings.saucenao_api_key = saucenao_api_key;
          errorsObject.saucenaoApiKeyError = "";
        } else
          errorsObject.saucenaoApiKeyError =
            "SauceNao api key invalid or expired";
      }

      const mongodbTestConnection = await mongoose
        .createConnection(database_url)
        .asPromise()
        .then((connection) => {
          settings.database_url = database_url;

          saveSettings();
          connection.close();
          errorsObject.databaseUrlError = "";
          return res.status(200).json(errorsObject);
        })
        .catch(() => {
          saveSettings();
          errorsObject.databaseUrlError = "Unable to connect to database";
          return res.status(200).json(errorsObject);
        });
    });

    this.express.get("/types-of-models", async (req, res) => {
      return res.status(200).json(typesOfModels);
    });
  }
}
export default new backendServer();
