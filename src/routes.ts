import "reflect-metadata" //for typeORM
import { v4 as uuidv4 } from "uuid";
import express from "express";
import { IReqFile, AlbumSchemaType, IAlbumDictionaryItem, IDBEntry, IErrorObject, IFilterObj, ILogicCategorySpecialSettingsDictionary, ILogicSpecialParamsDictionary, ILogicSpecialSettingsDictionary, IModelDictionary, INewPic, INewMediaItem, IParam, IPicFormStockOverrides, ISettings, IMediaItem } from "types";
import fs from "fs";
import MongoDatabaseLogic from "./mongoDatabaseLogic";
import {Logic} from "./Logic"
import NeDBDatabaseLogic from "./nedbDatabaseLogic";
import { TypeORMInterface } from "./typeORMDatabaseLogic";
import settings from "../settings";
import { upload } from "../middlewares/upload";
import { isDeepStrictEqual } from "util";
import Utility from "./Utility";
let logic = new Logic(settings);

/* 
function compareSpecialSettingsToDefault(initialSettings: typeof settings, divisionType: "special_settings" | "special_params", 
defaultSpecialSettingsOrParams: {[key: string]: any}
) { //the flow is get settings from default and if they dont exuist in settings object add (the else part is adding)

  let internalSettingVar = (JSON.parse(JSON.stringify({...initialSettings})));
  if (!internalSettingVar[divisionType] || !Object.getOwnPropertyNames(internalSettingVar[divisionType]).length) {
    internalSettingVar[divisionType] = defaultSpecialSettingsOrParams;
    return internalSettingVar
  }
  for (const categoryName in defaultSpecialSettingsOrParams) {
    if (Object.prototype.hasOwnProperty.call(defaultSpecialSettingsOrParams, categoryName) && Object.prototype.hasOwnProperty.call(internalSettingVar[divisionType], categoryName) ) {
      const categoryInDefault = defaultSpecialSettingsOrParams[categoryName];
      for (const hostOrCategorySpecific in categoryInDefault) {
        if (Object.prototype.hasOwnProperty.call(categoryInDefault, hostOrCategorySpecific)  && Object.prototype.hasOwnProperty.call(internalSettingVar[divisionType][categoryName], hostOrCategorySpecific) ) {
          if ((internalSettingVar[divisionType][categoryName] as any)[hostOrCategorySpecific]) {
            for (const setting in categoryInDefault[hostOrCategorySpecific]) {
              if (Object.prototype.hasOwnProperty.call(categoryInDefault[hostOrCategorySpecific], setting)) {
                const settingObj = categoryInDefault[hostOrCategorySpecific][setting];
                (internalSettingVar[divisionType][categoryName] as any)[hostOrCategorySpecific][setting] 
                = ((internalSettingVar[divisionType][categoryName] as any)[hostOrCategorySpecific] as any)[setting] 
                ?? settingObj
              }
            }
          }
        } else (internalSettingVar[divisionType][categoryName] as any)[hostOrCategorySpecific] = defaultSpecialSettingsOrParams[categoryName][hostOrCategorySpecific]
      }
    } else internalSettingVar[divisionType][categoryName] = defaultSpecialSettingsOrParams[categoryName]

  }
  if (!isDeepStrictEqual(initialSettings[divisionType], internalSettingVar[divisionType])) {
    if(divisionType == "special_params") settings[divisionType] = (internalSettingVar[divisionType] as ILogicSpecialParamsDictionary)
    else settings[divisionType] = (internalSettingVar[divisionType] as ILogicSpecialSettingsDictionary)
    
    saveSettings();
  }
  return internalSettingVar as typeof initialSettings
}
 */

function compareSpecialSettingsToDefault(
  initialSettings: typeof settings, 
  divisionType: "special_settings" | "special_params", 
  defaultSpecialSettingsOrParams: {[key: string]: IParam}
  ){
  //the goal is get to default settings and if they dont exist in settings object add (the else part is adding)

  let internalSettingVar = (JSON.parse(JSON.stringify({...initialSettings}))) as typeof initialSettings;
  if (!internalSettingVar[divisionType] || !Object.getOwnPropertyNames(internalSettingVar[divisionType]).length) {
    initialSettings[divisionType] = defaultSpecialSettingsOrParams;

    return internalSettingVar
  }
  
for (const param in defaultSpecialSettingsOrParams) {
  if (Object.prototype.hasOwnProperty.call(defaultSpecialSettingsOrParams, param)) {
    if (!internalSettingVar[divisionType][param]) initialSettings[divisionType][param] = defaultSpecialSettingsOrParams[param];
  }
}
  return internalSettingVar as typeof initialSettings
}


compareSpecialSettingsToDefault(settings, "special_params", logic.specialParamsDictionary ?? {})
compareSpecialSettingsToDefault(settings, "special_settings", logic.specialSettingsDictionary ?? {});
saveSettings()
const databaseConnectionOptionsDefault = {
  type: "better-sqlite3",
  database: "database.sqlite",
  synchronize: true,
  logging: false,
  entities: [],
  migrations: [],
  subscribers: [],
}

const databasePromise = TypeORMInterface.init(databaseConnectionOptionsDefault);

//const database = (settings.database_url.checkBox?.checkBoxValue && settings.database_url.textField?.value) ? (new MongoDatabaseLogic(settings.database_url.textField.value, logic.supportedTypes)) : (new NeDBDatabaseLogic(logic.supportedTypes)) ;
const neDBConnection = new NeDBDatabaseLogic(logic.supportedTypes)
const router = express.Router();

function saveSettings() {
  fs.writeFileSync(process.env.baseDir || '.' + "/settings.json", JSON.stringify(settings, null, 2));
  logic = new Logic(settings);
}
/* 
router.use((req, res, next) => {
  console.log('Time: ', Date.now(), req.url)
  next()
})
 */
export async function initialize() {
  const database = await databasePromise;
  database.updateCountEntriesInAllAlbums()

  router.post(
      "/create-album",
      upload.single("album_thumbnail_file"),
      async (req, res) => {
        const { type, name, isHidden } = req.body;
        let album_thumbnail_files;
        const newAlbum: IAlbumDictionaryItem = {
          name: name as string,
          id: uuidv4(),
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
    router.post("/force-save", async (req, res) => {
      console.log(req);
      return res.status(200).json({ sex: "sex" });
    });
    router.post("/check-status", async (req, res) => {
      return res.status(200).json({ sex: "sex" });
    });
  
    router.post("/add-pictures", upload.array("temp_download"), async (req, res) => {

      let newEntries: IDBEntry[] = [];
      const body: INewPic[] = JSON.parse(req.body.entries);
  
      const filePathDict: {[name: string]: Express.Multer.File} = {}
      const reqFiles: Express.Multer.File[] | undefined = req.files as  Express.Multer.File[] | undefined;

      const fileCount  = reqFiles?.length
      if (reqFiles && fileCount) {
        reqFiles.forEach(file => filePathDict[file.originalname] = file)
      }
      //individual entry FOR LOOP START
      for (let newEntry = 0; newEntry < body.length; newEntry++) {
        let addTagsArrayPerEntry: string[] | undefined = undefined;
        let addidsArrayPerEntry: string[] | undefined = undefined;
        let providedFileNamePerEntry: string[] | undefined = undefined;
        let stockOptionalOverridesPerEntry: IPicFormStockOverrides | undefined;
        let specifiedThumbnail: string = "";
        const { url, album, type, files, isHidden, optionalOverrideParams, stockOptionalOverrides } = body[newEntry]; //remember to do .split('\n') and for each to get the stuff bla bla
        if (stockOptionalOverrides) {
          
          if (stockOptionalOverrides.addTags.textField && stockOptionalOverrides.addTags.textField.value)
          addTagsArrayPerEntry = stockOptionalOverrides.addTags.textField?.value.replaceAll(" ", "_").split("\n").filter( (a:string) => a != "");
          if (stockOptionalOverrides.addId.textField && stockOptionalOverrides.addId.textField.value)
          addidsArrayPerEntry = stockOptionalOverrides.addId.textField?.value.replaceAll(" ", "").split("\n").filter( (a:string) => a != "");
          if (stockOptionalOverrides.useProvidedFileName.textField && stockOptionalOverrides.useProvidedFileName.textField.value)
          providedFileNamePerEntry = stockOptionalOverrides.addId.textField?.value.replaceAll(" ", "_").split("\n").filter( (a:string) => a != "");
          
          stockOptionalOverridesPerEntry = {
            thumbnailFile: JSON.parse(JSON.stringify(stockOptionalOverrides.thumbnailFile)),
            addId: JSON.parse(JSON.stringify(stockOptionalOverrides.addId)),
            addTags: JSON.parse(JSON.stringify(stockOptionalOverrides.addTags)),
            compileAllLinksIntoOneEntry: JSON.parse(JSON.stringify(stockOptionalOverrides.compileAllLinksIntoOneEntry)),
            useProvidedFileName: JSON.parse(JSON.stringify(stockOptionalOverrides.useProvidedFileName)),
          }

          if (stockOptionalOverrides.thumbnailFile.textField.value) {
            specifiedThumbnail = await (new Utility()).downloadFromUrl(stockOptionalOverrides?.thumbnailFile?.textField?.value, this.settings.downloadFolder, 
              `/saved_pictures_thumbnails/${album}`, {providedFileName: uuidv4()+'_thumbnail'})
          }
        }
        
        
        let addedPicsArray: IDBEntry[] = [];
        const multipleIntoOne: IDBEntry = {
          album: album, id: uuidv4(), indexer:0, media: [], isHidden: false, hasNSFW:false, thumbnailFile: "",
        }
        let compiledEntry: INewMediaItem = {
              data:{},
              media:[],
              indexer:0,
              date_added: (new Date()).getTime(),
              isMultiSource: stockOptionalOverrides?.compileAllLinksIntoOneEntry.checkBox?.checkBoxValue,
            };
            let arrayOfInputs: string[] | Express.Multer.File[] = [];
            if (url) {
              arrayOfInputs = url.replaceAll(" ", "").split("\n").filter( (a:string) => a != "");
            } else if (files) arrayOfInputs = files.map(file => filePathDict[file])
        if (arrayOfInputs) {
          
          const forLoopPromise = new Promise<IDBEntry[]>(async (resolve, reject) => {

            // individiual link/file looping
            for (let i = 0; i < arrayOfInputs.length; i++) {
              const value = arrayOfInputs[i];
             await new Promise<void>((resolve, reject) => setTimeout(() => {resolve()}, 100)) //just wait a bit
             
             if (stockOptionalOverridesPerEntry) { 
               if (stockOptionalOverridesPerEntry.addId.textField && addidsArrayPerEntry?.length) stockOptionalOverridesPerEntry.addId.textField.value = addidsArrayPerEntry[ (i > addidsArrayPerEntry.length) ? (addidsArrayPerEntry.length - 1) : i];
               if (stockOptionalOverridesPerEntry.addTags.textField && addTagsArrayPerEntry?.length) stockOptionalOverridesPerEntry.addTags.textField.value = addTagsArrayPerEntry[ (i > addTagsArrayPerEntry.length) ? (addTagsArrayPerEntry.length - 1) : i];
               if (stockOptionalOverridesPerEntry.useProvidedFileName.textField && providedFileNamePerEntry?.length) stockOptionalOverridesPerEntry.useProvidedFileName.textField.value = providedFileNamePerEntry[ (i > providedFileNamePerEntry.length) ? (providedFileNamePerEntry.length - 1) : i];
              }
              
              const entry = await logic.ProcessInput(value, type, album, optionalOverrideParams ?? {}, stockOptionalOverridesPerEntry as IPicFormStockOverrides);
              if (entry && entry.media?.length) {
                if (stockOptionalOverridesPerEntry?.addTags.textField?.value) {
                  entry.tags = entry.tags ? [...entry.tags, ...(stockOptionalOverridesPerEntry.addTags.textField.value as any).replaceAll(' ', "").split(',')] : (stockOptionalOverridesPerEntry.addTags.textField.value as any).replaceAll(' ', "").split(',');
                }
      
                const dbEntry: IDBEntry = {
                  album: album,
                  hasNSFW: entry.isNSFW,
                  id: uuidv4(),
                  indexer: entry.indexer,
                  thumbnailFile: entry.thumbnailFile,
                  date_added: (new Date()).getTime(),
                  isHidden: !!isHidden,
                  media: entry.media.map((m: IMediaItem)=>{
                    m.tags = entry.tags;
                    m.isNSFW = entry.isNSFW;
                    m.artists = entry.artists;
                    m.date_created = entry.date_created;
                    m.links = entry.links;
                    m.ids = entry.ids;
                    m.date_created = entry.date_created;
                    return m
                  })
                }
                if (stockOptionalOverrides?.compileAllLinksIntoOneEntry.checkBox?.checkBoxValue) {
                  //compiledEntry.media = compiledEntry.media.concat(entry.media);
                  multipleIntoOne.media.push(...dbEntry.media)
                  /* compiledEntry.urlsArray = entry.urlsArray ? compiledEntry.urlsArray?.concat(entry.urlsArray) : compiledEntry.urlsArray;
                  entry.ids ? Object.assign(compiledEntry.ids, {[i]:  entry.ids})      : {};
                  entry.links ? Object.assign(compiledEntry.links, {[i]:  entry.links}) : {};
                  compiledEntry.hasVideo = compiledEntry.hasVideo ?? hasVideo;
                  if (entry.tags) {
                    compiledEntry.tags = compiledEntry.tags ? compiledEntry.tags.concat(entry.tags) : entry.tags;
                  }
           
                  if (entry.artists) {
                    compiledEntry.artists = compiledEntry.artists ? compiledEntry.artists.concat(entry.artists) : entry.artists
                  }
                   */
                } else {
                  dbEntry.media.map((media,index)=>{
                    media.index = index;
                    return media
                  });
                  await database.addEntry(album, dbEntry, type)
                  .then(res => addedPicsArray.push(res))
                  .catch(console.log)
                }
              }
              if (i == arrayOfInputs.length - 1) {
                if (stockOptionalOverrides?.compileAllLinksIntoOneEntry.checkBox?.checkBoxValue) {      
                  multipleIntoOne.media.map((media,index)=>{
                    media.index = index;
                    return media
                  })
                  await database.addEntry(album, {
                    ...multipleIntoOne,
                    hasNSFW: multipleIntoOne.hasNSFW ?? false,
                    id: uuidv4(),
                    thumbnailFile: specifiedThumbnail || multipleIntoOne.media[0].thumbnailFile,
                    album: album,
                    date_added: (new Date()).getTime(),
                    isHidden: !!isHidden
                  }, type)
                  .then(res => addedPicsArray.push(res))
                  .catch(console.log)
                }
                resolve(addedPicsArray)
              } 
            }
          });
          const resPromise = await forLoopPromise;
          newEntries.push(...resPromise);
        }
        database.updateCountEntriesInAlbumByName(album)
      }
      res.status(200).json(newEntries)
      //database.updateCountEntriesInAlbumByName(album)
    });
  
    router.post("/search", async (req, res) => {
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
  
    router.get("/albums", async (req, res) => {
      
      const albums = await database.getAlbums(!!settings.stock_settings.show_hidden.checkBox?.checkBoxValue)
      return res.status(200).json(albums);
    });
  
    router.post("/connection-test", async (req, res) => {
      const {
        legacyMongoDB,
        stock_settings,
        database,
        special_settings,
        special_params
        } = req.body;
        
  
        const responseSettings: {
          legacyMongoDB: IParam;
          database: ISettings['database'];
          stock_settings: ISettings['stock_settings'];
          special_settings: ISettings['special_settings'];
          special_params: ISettings['special_params'];
        } = {
          legacyMongoDB: legacyMongoDB,
          database,
          stock_settings,
          special_settings,
          special_params
        }
        settings.database = database;
  
      const errorsObject: IErrorObject = {
        hasError: false,
        responseSettings: responseSettings,
      }  
      
      if (responseSettings.legacyMongoDB.checkBox?.checkBoxValue && responseSettings.legacyMongoDB.textField?.value) {
        const canConnect = await MongoDatabaseLogic.testMongoDBConnection(responseSettings.legacyMongoDB.textField?.value);
        if (canConnect) {  
          settings.legacyMongoDB = responseSettings.legacyMongoDB;
          responseSettings.legacyMongoDB.errorMessage = "";
        }
        else {
          errorsObject.hasError = true;
          responseSettings.legacyMongoDB.errorMessage = "Unable to connect to database"
        }
      } else settings.legacyMongoDB.checkBox = {checkBoxValue: false, defaultValue: false, checkBoxDescription: ""}
      
      settings.stock_settings = responseSettings.stock_settings;
      const arrayLength = logic.specialSettingValidityCheck.length;
      if (logic.specialSettingValidityCheck.length && (settings.special_params && errorsObject.responseSettings.special_params) && (settings.special_settings && errorsObject.responseSettings.special_settings)) {
          const validityCheckLoop = new Promise(async (resolve, reject) => {
            logic.specialSettingValidityCheck.forEach(async (checkFunc, index) => {
              const param = recursiveObjectIndex<IParam>(errorsObject.responseSettings, checkFunc.indexer);
              if (param) {
                param.errorMessage = await checkFunc.checkValid(!!param.checkBox?.checkBoxValue, param.textField?.value);
                errorsObject.hasError = errorsObject.hasError || !!param.errorMessage
                
              }
              if ((index + 1) == arrayLength) {
                resolve(true)
              }
            })
          })
          await validityCheckLoop;
        }
  
      if (!errorsObject.hasError) {
        settings.special_params = special_params;
        settings.special_settings = special_settings;
  
      }
  
      saveSettings();
      return res.status(200).json(errorsObject);
    });
    router.post("/migrate-database",async (req, res) => {
      const albums = await neDBConnection.getAlbums(true);
      const addAllAlbums = new Promise(async (resolve,reject)=>{
        for (let i = 0; i < albums.length; i++) {
          const album = albums[i];
           album.id = album.uuid
            console.log(database.appDataSource.entityMetadatas.length);
            await database.createAlbum(album);
            const entries = await neDBConnection.getEntriesInAlbumByNameAndFilter(album.name,{showHidden:true,showNSFW:true});
            for (let ii = 0; ii < entries.length; ii++) {
              const entry = entries[ii];
              
              await database.addEntry(album.name, (entry as any), album.type)
            }
            if (i == (albums.length -1)) {
              resolve(null)
            }
        }
      })
      await addAllAlbums;
      return res.status(200);
    })
    router.get("/types-of-models", async (req, res) => {
      return res.status(200).json(logic.supportedTypes);
    });
  
    router.get("/special-settings", async (req, res) => {
      return res.status(200).json(logic.specialSettingsDictionary);
    });
  
    router.get("/special-params-dictionary", async (req, res) => {
      return res.status(200).json(logic.specialParamsDictionary);
    });
  
    router.delete('/delete-entry-by-id', async (req, res) => {
      const { album, entriesIDs } = req.body      
      await database.deleteEntries(album, entriesIDs);
      database.updateCountEntriesInAlbumByName(album)
    })
  
    router.post("/handle-hide-pictures", (req, res) => {
      const { album, entriesIDs, hide } = req.body;
      database.handleHidingPicturesInAlbum(album, entriesIDs, hide)
    })
  
    router.post("/autocomplete-tags", (req, res) => {
      const {tagSearch, type} = req.body;
  
      database.getTagsForAutocomplete(tagSearch, type).then(tags => {
        res.status(200).json({tags: tags || []})
      })
    })
  
    router.post("/delete-albums-by-uuids", (req, res) => {
      const {albumUUIDs} = req.body;
      database.deleteAlbumsByUUIDS(albumUUIDs)
      res.status(200);
    })
  
    router.post("/handle-hiding-albums", (req, res) => {
      const {albumUUIDs, hide} = req.body;
      database.handleHidingAlbumsByUUIDs(albumUUIDs, hide)
      res.status(200);
    })
    return router;
}
export const Router =  initialize()


  function recursiveObjectIndex<T>(objectToIndex:any, arrayOfIndexes: string[]): T | undefined {
    
    while (arrayOfIndexes.length) {
      if (objectToIndex && Object.prototype.hasOwnProperty.call(objectToIndex, arrayOfIndexes[0])) {
        return (recursiveObjectIndex(objectToIndex[arrayOfIndexes[0]], arrayOfIndexes.slice(1)) as T)
      } else return undefined
    } return objectToIndex
  }

  
  