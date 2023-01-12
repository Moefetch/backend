import express, { Express } from "express";
import cors from "cors";
import http from "http";
import fs from "fs";
import settings from "./settings";
import chalk from "chalk";
import { v4 as uuidv4 } from "uuid";
import { upload } from "./middlewares/upload";
import Logic from "./src/logic";
import MongoDatabaseLogic from "./src/mongoDatabaseLogic";
import NeDBDatabaseLogic from "./src/nedbDatabaseLogic";


let logic = new Logic(settings);

const database = settings.database_url ? (new MongoDatabaseLogic(settings.database_url)) : (new NeDBDatabaseLogic()) ;

function saveSettings() {
  fs.writeFileSync("./settings.json", JSON.stringify(settings, null, 2));
  console.log('New settings: ', settings);
  logic = new Logic(settings);
}

console.log('Settings: ', settings);


//import AnimePic from "./models/AnimePic";

import CreateAnimePicModel from "./models/schemas/CreateMongoDBEntryModel";
import {
  IAlbumDictionaryItem,
  AlbumSchemaType,
  INewPic,
  IMongoDBEntry,
  IErrorObject,
  IFilterObj,
  IDBEntry,
} from "types";
import e from "express";

const modelsDictionary = {
  "Anime Pic": CreateAnimePicModel,
};

let stroredModels: any = {
  "Anime Pic": {

  },
};

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
database.updateCountEntriesInAllAlbums()
class backendServer {
  public express: Express;
  public server: http.Server;
  private backendURL = process.env.DEV
    ? "http://127.0.0.1:2234"
    : "http://localhost:2234"; //if you wanna go with a hostname

  constructor() {
    this.express = express();
    this.server = http.createServer(this.express);
    console.log('Backend URL: ', this.backendURL);

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

    this.express.post(
      "/create-album",
      upload.single("album_thumbnail_file"),
      async (req, res) => {
        const { type, name, isHidden } = req.body;
        let album_thumbnail_files;
        const newAlbum: IAlbumDictionaryItem = {
          name: name as string,
          albumCoverImage: "album_thumbnail_files/image.svg",
          type: type as AlbumSchemaType,
          uuid: uuidv4(),
          estimatedPicCount: 0,
          isHidden: !!isHidden,
        };
        if (req.file) {
          album_thumbnail_files = req.file as Express.Multer.File;
          newAlbum.albumCoverImage = album_thumbnail_files.filename;
        }

        database.createAlbum(newAlbum);

        res.status(200).json(newAlbum);
      }
    );
    this.express.post("/force-save", async (req, res) => {
      console.log(req);
      return res.status(200).json({ sex: "sex" });
    });
    this.express.post("/check-status", async (req, res) => {
      return res.status(200).json({ sex: "sex" });
    });

    this.express.post("/add-picture", async (req, res) => {
      const { url, album, type, useSauceNao, isHidden } = req.body; //remember to do .split('\n') and for each to get the stuff bla bla
      
      let urlsArray: string[] = url.split("\n").filter( (a:string) => a != "");
      let addedPicsArray: IDBEntry[] = [];
      
      const forLoopPromise = new Promise<IDBEntry[]>(async (resolve, reject) => {
        urlsArray.forEach(async (value: string, i: number) => {
          const entry = await logic.processInput(value, album);
          if (entry.imagesDataArray?.length) {
            await database.addEntry(album, {
              ...entry,
              isNSFW: entry.isNSFW ?? false,
              id: uuidv4(),
              album: album,
              date_added: (new Date()).getTime(),
              isHidden: isHidden
            }, type)
            .then(res => addedPicsArray.push(res))
            .catch(console.log)
          }
          if (i == urlsArray.length - 1) resolve(addedPicsArray)
        });
      });
      const resPromise = await forLoopPromise;
      database.updateCountEntriesInAlbumByName(album)
      res.status(200).json(resPromise)
      //database.updateCountEntriesInAlbumByName(album)
    });

    this.express.post("/search", async (req, res) => {
      const {album, options} = req.body; 
      const { sortBy, tags, nameIncludes, showNSFW, showHidden } = options;
      
      let sortOBJ: any = {}
      sortOBJ[sortBy] = 1;

      const filterOBJ: IFilterObj = { 
        showNSFW: showNSFW, 
        showHidden: showHidden,
        tags: tags,
        nameIncludes: nameIncludes,
      }


      const picsInAlbum = await database.getEntriesInAlbumByUUIDAndFilter(album, filterOBJ , sortOBJ)
      
      if (picsInAlbum && picsInAlbum.length) {
        res.status(200).json(picsInAlbum)
      } else {
        res.status(404)
      } 
    });

    this.express.get("/albums", async (req, res) => {
      
      const albums = await database.getAlbums(settings.show_hidden)
      return res.status(200).json(albums);
    });

    this.express.post("/connection-test", async (req, res) => {
      const {
        database_url,
        use_mongodb,
        search_diff_sites,
        saucenao_api_key,
        pixiv_download_first_image_only,
        show_nsfw,
        blur_nsfw,
        show_hidden,
      } = req.body;

      settings.search_diff_sites = search_diff_sites;
      settings.show_nsfw = show_nsfw;
      settings.blur_nsfw = blur_nsfw;
      settings.show_hidden = show_hidden;

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
      if (use_mongodb) {
        const canConnect = await MongoDatabaseLogic.testMongoDBConnection(database_url);
        if (canConnect) {  
          settings.database_url = database_url;
          errorsObject.databaseUrlError = "";
        }
        else errorsObject.databaseUrlError = "Unable to connect to database";
      }
      saveSettings();
      return res.status(200).json(errorsObject);
    });

    this.express.get("/types-of-models", async (req, res) => {
      return res.status(200).json(typesOfModels);
    });

    this.express.delete('/delete-entry-by-id', async (req, res) => {
      const { album, entriesIDs } = req.body      
      database.deleteEntries(album, entriesIDs);
      database.updateCountEntriesInAlbumByName(album)
    })

    this.express.post("/handle-hide-pictures", (req, res) => {
      const { album, entriesIDs, hide } = req.body;
      database.handleHidingPicturesInAlbum(album, entriesIDs, hide)
    })

    this.express.post("/autocomplete-tags", (req, res) => {
      const {tagSearch, type} = req.body;

      database.getTagsForAutocomplete(tagSearch, type).then(tags => {
        res.status(200).json({tags: tags || []})
      })
    })

    this.express.post("/delete-albums-by-uuids", (req, res) => {
      const {albumUUIDs} = req.body;
      database.deleteAlbumsByUUIDS(albumUUIDs)
      res.status(200);
    })

    this.express.post("/handle-hiding-albums", (req, res) => {
      const {albumUUIDs, hide} = req.body;
      database.handleHidingAlbumsByUUIDs(albumUUIDs, hide)
      res.status(200);
    })

  }
}
export default new backendServer();
