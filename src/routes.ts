import "reflect-metadata" //for typeORM
import { v4 as uuidv4 } from "uuid";
import express from "express";
import { IReqFile, AlbumSchemaType, IAlbumDictionaryItem, IDBEntry, IErrorObject, IFilterObj, ILogicCategorySpecialSettingsDictionary, ILogicSpecialParamsDictionary, ILogicSpecialSettingsDictionary, IModelDictionary, INewMediaSubmittionItem, INewMediaItem, IParam, IMediaSubmitFormStockOverrides, ISettings, IMediaItem, INewMediaSubmittionItemInternal } from "types";
import fs from "fs";
import {Logic} from "./Logic"
import { TypeORMInterface } from "./typeORMDatabaseLogic";
import settings from "../settings";
import { upload } from "../middlewares/upload";
import { isDeepStrictEqual } from "util";
import Utility from "./Utility";
import { requestStatusTracker } from "./webSocket";
let logic = new Logic(settings);
const routesUtility = new Utility();
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
  nativeBinding: "./better_sqlite3_driver/better_sqlite3.node",
  database: "database.sqlite",
  synchronize: true,
  logging: false,
  entities: [],
  migrations: [],
  subscribers: [],
}

const databasePromise = TypeORMInterface.init({
  ...settings.database,
  synchronize:false, logging:false
});

//const database = (settings.database_url.checkBox?.checkBoxValue && settings.database_url.textField?.value) ? (new MongoDatabaseLogic(settings.database_url.textField.value, logic.supportedTypes)) : (new NeDBDatabaseLogic(logic.supportedTypes)) ;
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



function reqBodyToAlbumDictionaryItem(name :string, type :string,isHidden: boolean, uuid: string, estimatedPicCount:number, albumCoverImage: string, file?: Express.Multer.File) {
  let album_thumbnail_files;
  const album: IAlbumDictionaryItem = {
    name: name as string,
    id: uuid,
    albumCoverImage: albumCoverImage,
    type: type as AlbumSchemaType,
    uuid: uuid,
    estimatedPicCount: estimatedPicCount,
    isHidden: !!isHidden,
  };
  if (file) {
    album_thumbnail_files = file as Express.Multer.File;
    album.albumCoverImage = album_thumbnail_files.filename;
  }
  return album;
      
}

export async function initialize() {
  const database = await databasePromise;
  database.updateCountEntriesInAllAlbums()
  
  router.post(
    "/change-entry-thumbnail",
    upload.single("temp_download"),
    async (req, res) => {
      const entryUUID: string = req.body.entryUUID;
      const albumName: string = req.body.albumName;
      let newPath = "";
      if (req.file) {
        const newThumbnailfile = req.file;
        newPath = `${settings.downloadFolder}/saved_pictures_thumbnails/${albumName}/thumbnail-${+Date.now() + "-"  + (newThumbnailfile.path.substring(newThumbnailfile.path.lastIndexOf("/") + 1))}`;
        routesUtility.moveFile(newThumbnailfile.path, newPath);
        newPath = newPath.substring(newPath.indexOf('/saved_pictures_thumbnails/'));
      }
      const oldEntry = (await database.getEntriesInAlbumByNameAndFilter(albumName, {id:entryUUID}))[0] as IDBEntry
      if (oldEntry && oldEntry.id == entryUUID) {
        oldEntry.thumbnailFile = newPath;
      }
      
      database.updateEntry(albumName, oldEntry);
      res.status(200).json(oldEntry);
    }
  );

  router.post(
    "/edit-media-item",
    upload.single("temp_download"),
    async (req, res) => {
      const mediaItem: IMediaItem = JSON.parse(req.body.item);
      let newPath = "";
      if (req.file) {
        const newThumbnailfile = req.file;
        newPath = `${settings.downloadFolder}/saved_pictures_thumbnails/${mediaItem.album}/thumbnail-${+Date.now() + "-"  + (newThumbnailfile.path.substring(newThumbnailfile.path.lastIndexOf("/") + 1))}`;
        routesUtility.moveFile(newThumbnailfile.path, newPath);
        newPath = newPath.substring(newPath.indexOf('/saved_pictures_thumbnails/'));
      }
      database.editMediaItem(mediaItem, newPath);
      res.status(200).json(mediaItem);
    }
  );

  router.post(
    "/edit-album",
    upload.single("album_thumbnail_file"),
    async (req, res) => {
      const { uuid, type, name, estimatedPicCount, album_thumbnail_file,  isHidden } = req.body;
      const album: IAlbumDictionaryItem = reqBodyToAlbumDictionaryItem(name, type, isHidden, uuid, parseInt(estimatedPicCount), album_thumbnail_file, req.file);

      database.updateAlbum(album);

      res.status(200).json(album);
    }
  );

  router.post(
      "/create-album",
      upload.single("album_thumbnail_file"),
      async (req, res) => {
        const { type, name, isHidden } = req.body;
        const newAlbum: IAlbumDictionaryItem = reqBodyToAlbumDictionaryItem(name, type, isHidden, uuidv4(), 0, "album_thumbnail_files/image.svg", req.file);

  
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
  
    router.post("/add-new-entries", upload.array("temp_download"), async (req, res) => {

      const body: INewMediaSubmittionItem[] = JSON.parse(req.body.entries);
      const reqFiles: Express.Multer.File[] | undefined = req.files as  Express.Multer.File[] | undefined;
      
      
      let newEntries: IDBEntry[] = await parseRequestInputs(body, database, reqFiles)
      res.status(200).json(newEntries)
      //database.updateCountEntriesInAlbumByName(album)
    });
  
    router.post("/search", async (req, res) => {
      const {album, options} = req.body; 
      const { sortBy, tags, nameIncludes, showNSFW, showHidden } = options;
      
  
      const filterOBJ: IFilterObj = { 
        showNSFW: showNSFW, 
        showHidden: showHidden,
        tags: tags,
        nameIncludes: nameIncludes,
      }
  
  
      const picsInAlbum = await database.getEntriesInAlbumByUUIDAndFilter(album, filterOBJ , sortBy)
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
        stock_settings,
        database,
        special_settings,
        special_params
        } = req.body;
        
  
        const responseSettings: {
          database: ISettings['database'];
          stock_settings: ISettings['stock_settings'];
          special_settings: ISettings['special_settings'];
          special_params: ISettings['special_params'];
        } = {
          database,
          stock_settings,
          special_settings,
          special_params
        }
        if (settings.database.type = "better-sqlite3") {
          settings.database.nativeBinding = "./better_sqlite3_driver/better_sqlite3.node";
        }
        settings.database = database;

      const errorsObject: IErrorObject = {
        hasError: false,
        responseSettings: responseSettings,
      }  
      
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
      const { album, entriesIDs } = req.body;      
      await database.deleteEntries(album, entriesIDs);
      database.updateCountEntriesInAlbumByName(album)
    })
  
    router.post("/handle-hide-entries", (req, res) => {
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

  

  function INewMediaItemToIDBEntry(entry: INewMediaItem, album:string, isHidden: boolean, optional?: {specifiedThumbnail?:string} ):IDBEntry {
    const dbEntry: IDBEntry = {
      album: album,
      hasNSFW: entry.isNSFW,
      id: uuidv4(),
      indexer: entry.indexer,
      thumbnailFile: optional?.specifiedThumbnail || entry.thumbnailFile,
      date_added: (new Date()).getTime(),
      isHidden: !!isHidden,
      media: entry.media.map((m: IMediaItem)=>{
        m.album = album;
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
    return dbEntry
  }


  function mediaItemsSetIndex(mediaItems: IMediaItem[]) {
    return mediaItems.map((media, index)=>{      
      media.index = index;
      if (!media.id) media.id = uuidv4();
      return media
    });
    
  }
  async function parseRequestInputs(requestEntries: INewMediaSubmittionItem[], database: TypeORMInterface, reqFiles: Express.Multer.File[] | undefined) {
    //create a dictionary of the uploaded files
    const filePathDict: {[name: string]: Express.Multer.File} = {};
    if (reqFiles && reqFiles?.length) {
      reqFiles.forEach(file => filePathDict[file.originalname] = file);
    }
    let addedPicsArray: IDBEntry[] = [];
    let addedPicsPromises: Promise<IDBEntry>[] = [];
    //looping through entries
    for (let i = 0; i < requestEntries.length; i++) {
      const { url, album, type, files, isHidden, optionalOverrideParams, stockOptionalOverrides, thumbnailFile, old_file } = requestEntries[i]; //remember to do .split('\n') and for each to get the stuff bla bla
      let inputs: (Express.Multer.File | string)[] = [];
      if (url) {
        inputs = removeSpacesAndSplitByNewLine(url, "");
      }
      if (files) files.forEach(file => inputs.push(filePathDict[file]));
      //multiple into one 
      if (stockOptionalOverrides?.compileAllLinksIntoOneEntry?.checkBox?.checkBoxValue) {
        const requestTracker  = new requestStatusTracker({
              id: uuidv4(),
              status: "Initializing",
              currentIndex: 0,
              numberOfEntries: inputs.length - 1 ,
              newSubmittion: requestEntries[i]
            })
            addedPicsPromises.push(parseMultipleIntoOne({inputs, album, type, isHidden, optionalOverrideParams, stockOptionalOverrides, old_file, thumbnailFile}, database, requestTracker));
      }
      //one to one
      else {
        for (let i = 0; i < inputs.length; i++) {
          const input = inputs[i];
          const requestTracker  = new requestStatusTracker({
            id: uuidv4(),
            status: "Initializing",
            currentIndex: 0,
            numberOfEntries: 1,
            newSubmittion: {...requestEntries[i],
            url: typeof input == "string" ? input : input.originalname}
          });
          addedPicsPromises.push(parseMultipleIntoOne({inputs: [input], album, type, isHidden, optionalOverrideParams, stockOptionalOverrides, old_file, thumbnailFile}, database, requestTracker));
        }
      }
    }
    //i'd love to use .map but you still end up with array of promises and cant await the whole line;
    for (let i = 0; i < addedPicsPromises.length; i++) {
      const addedPic = await addedPicsPromises[i]
      addedPicsArray.push(addedPic);
    }
    
    return addedPicsArray
  }
  async function parseMultipleIntoOne(newEntrySubmission: INewMediaSubmittionItemInternal, database: TypeORMInterface, requestTracker: requestStatusTracker) {
    const { inputs, thumbnailFile, album, type, isHidden, optionalOverrideParams, stockOptionalOverrides } = newEntrySubmission;
    
    //variables to hold data of all inputs
    //STRING ARRAYS FOR EASIER ACCEESS
    let addTagsArrayPerEntry: string[] | undefined = undefined;
    let addidsArrayPerEntry: string[] | undefined = undefined;
    let providedFileNamePerEntry: string[] | undefined = undefined;
    
    //to prevent recreating the same object n times, i will be only changing the properties relavant to each input, THIS WILL BECOME AN OVERRIDE FROM OVERRIDES[i]
    let stockOptionalOverridesPerEntry: IMediaSubmitFormStockOverrides | undefined;
    let specifiedThumbnail: string = "";


    if (stockOptionalOverrides) {
      addTagsArrayPerEntry = handleParsingAndSplittingOfParamtextField(stockOptionalOverrides.addTags.textField, " ")
      addidsArrayPerEntry = handleParsingAndSplittingOfParamtextField(stockOptionalOverrides.addId.textField, "")
      providedFileNamePerEntry = handleParsingAndSplittingOfParamtextField(stockOptionalOverrides.useProvidedFileName.textField, "_")
      
      stockOptionalOverridesPerEntry = JSON.parse(JSON.stringify(stockOptionalOverrides)) //copying structure so i can use it down later, will replace each value by it's 
        

      if (stockOptionalOverrides.thumbnailFile.textField.value) {
        specifiedThumbnail = await routesUtility.noStatusDl(stockOptionalOverrides?.thumbnailFile?.textField?.value, this.settings.downloadFolder, 
          `/saved_pictures_thumbnails/${album}`, {providedFileName: uuidv4()+'_thumbnail'})
      }
    }
    const multipleIntoOne: IDBEntry = {
      album: album, id: uuidv4(), indexer: 0, media: [], isHidden: !!isHidden, hasNSFW:false, date_added: (new Date()).getTime(), thumbnailFile: "",
    }
    
    if (newEntrySubmission.stockOptionalOverrides.addToExistingEntry.checkBox?.checkBoxValue && newEntrySubmission.stockOptionalOverrides.addToExistingEntry.textField?.value) {
      const preExistingEntry = (await database.getEntriesInAlbumByNameAndFilter(album,{id: newEntrySubmission.stockOptionalOverrides.addToExistingEntry.textField?.value}) as undefined as IDBEntry[])[0];
      if (preExistingEntry) { 
        multipleIntoOne.id = newEntrySubmission.stockOptionalOverrides.addToExistingEntry.textField.value;
        multipleIntoOne.indexer = preExistingEntry.indexer;
        multipleIntoOne.media = preExistingEntry.media;
        multipleIntoOne.isHidden = preExistingEntry.isHidden;
        multipleIntoOne.hasNSFW = preExistingEntry.hasNSFW;
        multipleIntoOne.date_added = preExistingEntry.date_added;
        multipleIntoOne.thumbnailFile = preExistingEntry.thumbnailFile;
      }
    }
    if (inputs) {
      for (let i = 0; i < inputs.length; i++) {
        if (stockOptionalOverridesPerEntry) {
          if (stockOptionalOverridesPerEntry.addId.textField && addidsArrayPerEntry?.length) stockOptionalOverridesPerEntry.addId.textField.value = addidsArrayPerEntry[ calIndexForLimited(addidsArrayPerEntry, i)];
          if (stockOptionalOverridesPerEntry.addTags.textField && addTagsArrayPerEntry?.length) stockOptionalOverridesPerEntry.addTags.textField.value = addTagsArrayPerEntry[ calIndexForLimited(addTagsArrayPerEntry, i)];
          if (stockOptionalOverridesPerEntry.useProvidedFileName.textField && providedFileNamePerEntry?.length) stockOptionalOverridesPerEntry.useProvidedFileName.textField.value = providedFileNamePerEntry[ calIndexForLimited(providedFileNamePerEntry, i)];
        }
        requestTracker.setStatus("Processing")
        const entry = await logic.ProcessInput(inputs[i], type, album, optionalOverrideParams ?? {}, stockOptionalOverridesPerEntry as IMediaSubmitFormStockOverrides, requestTracker);
        if (entry && entry.media?.length) {
          
          entry.tags = handleJoinOverrideValues(entry.tags, stockOptionalOverridesPerEntry?.addTags?.textField)
          
          if (stockOptionalOverridesPerEntry?.addId?.textField?.value) {
            const customIDOBJ = {customId: stockOptionalOverridesPerEntry.addId.textField.value}
            entry.ids = entry.ids ? Object.assign(entry.ids, customIDOBJ) : customIDOBJ
          }
          
          const dbEntry: IDBEntry = INewMediaItemToIDBEntry(entry, album, isHidden, {specifiedThumbnail: specifiedThumbnail})
          
          multipleIntoOne.media.push(...dbEntry.media)
        }
      }
      multipleIntoOne.hasNSFW = !!multipleIntoOne.media.filter(media=>media.isNSFW).length;
      multipleIntoOne.media = mediaItemsSetIndex(multipleIntoOne.media);
      
      if (!(newEntrySubmission.stockOptionalOverrides.addToExistingEntry.checkBox?.checkBoxValue && newEntrySubmission.stockOptionalOverrides.addToExistingEntry.textField?.value))
        {
          multipleIntoOne.thumbnailFile = specifiedThumbnail || multipleIntoOne.media[0]?.thumbnailFile;
        };
      return await database.addEntry(album, multipleIntoOne, type).catch(console.log)
    }
  }



  function handleParsingAndSplittingOfParamtextField(textField: IParam["textField"], replaceSpaceWith: string): string[]|undefined {
    if (textField && textField.value) {
      return textField.value.replaceAll(" ", replaceSpaceWith).split("\n").filter( (a:string) => a != "")
    }
  }
  function removeSpacesAndSplitByNewLine(value: string, replaceSpaceWith: string) {
    return value.replaceAll(" ", replaceSpaceWith).split("\n").filter( (a:string) => a != "")
  }

  function calIndexForLimited(val: string[], i: number) {
    return (i > val.length) ? (val.length - 1) : i
   }
   function handleJoinOverrideValues(entryProperty: string[] | undefined, textField: IParam["textField"] | undefined) {
    if (textField?.value) {
      return entryProperty?.length ? [...entryProperty, ...textField.value.split(',').map(tag=>tag.trim().replaceAll(' ', "_"))] : textField.value.split(',').map(tag=>tag.trim().replaceAll(' ', "_"));
    }
    else return entryProperty
  }