import { v4 as uuidv4 } from "uuid";
import express from "express";
import { AlbumSchemaType, IAlbumDictionaryItem, IDBEntry, IErrorObject, IFilterObj, ILogicCategorySpecialSettingsDictionary, ILogicSpecialParamsDictionary, ILogicSpecialSettingsDictionary, INewPicture, IParam, IPicFormStockOverrides } from "types";
import fs from "fs";
import MongoDatabaseLogic from "./mongoDatabaseLogic";
import {Logic} from "./Logic/Logic"
import NeDBDatabaseLogic from "./nedbDatabaseLogic";
import settings from "../settings";
import { upload } from "../middlewares/upload";
import { isDeepStrictEqual } from "util";
let logic = new Logic(settings);

function compareSpecialSettingsToDefault(initialSettings: typeof settings, divisionType: "special_settings" | "special_params", 
defaultSpecialSettingsOrParams: {[key: string]: any}
) { //the flow is get settings from default and if they dont exuist in settings object add (the else part is adding)

  let internalSettingVar = (JSON.parse(JSON.stringify({...initialSettings})));
  if (!internalSettingVar[divisionType] || internalSettingVar[divisionType] == {}) {
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

compareSpecialSettingsToDefault(settings, "special_params", logic.specialParamsDictionary ?? {})
compareSpecialSettingsToDefault(settings, "special_settings", logic.specialSettingsDictionary ?? {});

const database = (settings.database_url.checkBoxValue && settings.database_url.stringValue?.value) ? (new MongoDatabaseLogic(settings.database_url.stringValue.value, logic.supportedTypes)) : (new NeDBDatabaseLogic(logic.supportedTypes)) ;
database.updateCountEntriesInAllAlbums()
 
const router = express.Router();

function saveSettings() {
  fs.writeFileSync("./settings.json", JSON.stringify(settings, null, 2));
  console.log('New settings: ', settings);
  logic = new Logic(settings);
}

router.use((req, res, next) => {
    console.log('Time: ', Date.now())
    next()
})

router.post(
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
  router.post("/force-save", async (req, res) => {
    console.log(req);
    return res.status(200).json({ sex: "sex" });
  });
  router.post("/check-status", async (req, res) => {
    return res.status(200).json({ sex: "sex" });
  });

  router.post("/add-picture", async (req, res) => {
    const { url, album, type, isHidden, optionalOverrideParams, stockOptionalOverrides } = req.body; //remember to do .split('\n') and for each to get the stuff bla bla
    
    let urlsArray: string[] = url.replaceAll(" ", "").split("\n").filter( (a:string) => a != "");
    let addTagsArrayPerEntry: string[] | undefined = undefined;
    if (stockOptionalOverrides.addTags.stringValue && stockOptionalOverrides.addTags.stringValue.value)
    addTagsArrayPerEntry = stockOptionalOverrides.addTags.stringValue.value.replaceAll(" ", "").split("\n").filter( (a:string) => a != "");
    let addidsArrayPerEntry: string[] | undefined = undefined;
    if (stockOptionalOverrides.addId.stringValue && stockOptionalOverrides.addId.stringValue.value)
    addidsArrayPerEntry = stockOptionalOverrides.addId.stringValue.value.replaceAll(" ", "").split("\n").filter( (a:string) => a != "");
    let providedFileNamePerEntry: string[] | undefined = undefined;
    
    if (stockOptionalOverrides.useProvidedFileName.stringValue && stockOptionalOverrides.useProvidedFileName.stringValue.value)
    providedFileNamePerEntry = stockOptionalOverrides.addId.stringValue.value.replaceAll(" ", "").split("\n").filter( (a:string) => a != "");
    
    let stockOptionalOverridesPerEntry: IPicFormStockOverrides = {
      thumbnailFile: JSON.parse(JSON.stringify(stockOptionalOverrides.thumbnailFile)),
      addId: JSON.parse(JSON.stringify(stockOptionalOverrides.addId)),
      addTags: JSON.parse(JSON.stringify(stockOptionalOverrides.addTags)),
      compileAllLinksIntoOneEntry: JSON.parse(JSON.stringify(stockOptionalOverrides.compileAllLinksIntoOneEntry)),
      useProvidedFileName: JSON.parse(JSON.stringify(stockOptionalOverrides.useProvidedFileName)),
    }
    
    let addedPicsArray: IDBEntry[] = [];
    let compiledEntry: INewPicture = {
          data:{},
          imagesDataArray:[],
          indexer:0,
          ids: {},
          links: {},
          isMultiSource: stockOptionalOverrides.compileAllLinksIntoOneEntry.checkBoxValue,
        };
        
    const forLoopPromise = new Promise<IDBEntry[]>(async (resolve, reject) => {
      for (let i = 0; i < urlsArray.length; i++) {
        const value = urlsArray[i];
       setTimeout(() => {}, 10); //just wait a bit
       if (stockOptionalOverridesPerEntry.addId.stringValue && addidsArrayPerEntry?.length) stockOptionalOverridesPerEntry.addId.stringValue.value = addidsArrayPerEntry[ (i > addidsArrayPerEntry.length) ? (addidsArrayPerEntry.length - 1) : i];
       if (stockOptionalOverridesPerEntry.addTags.stringValue && addTagsArrayPerEntry?.length) stockOptionalOverridesPerEntry.addTags.stringValue.value = addTagsArrayPerEntry[ (i > addTagsArrayPerEntry.length) ? (addTagsArrayPerEntry.length - 1) : i];
       if (stockOptionalOverridesPerEntry.useProvidedFileName.stringValue && providedFileNamePerEntry?.length) stockOptionalOverridesPerEntry.useProvidedFileName.stringValue.value = providedFileNamePerEntry[ (i > providedFileNamePerEntry.length) ? (providedFileNamePerEntry.length - 1) : i];

        const entry = await logic.ProcessInput(value, type, album, optionalOverrideParams, stockOptionalOverridesPerEntry);
        console.log(`${i} / ${urlsArray.length}`);
        
        if (entry && entry.imagesDataArray?.length) {
          if (stockOptionalOverridesPerEntry.addTags.stringValue?.value) {
            entry.tags = entry.tags ? [...entry.tags, ...(stockOptionalOverridesPerEntry.addTags.stringValue.value as any).replaceAll(' ', "").split(',')] : (stockOptionalOverridesPerEntry.addTags.stringValue.value as any).replaceAll(' ', "").split(',');
          }

          if (stockOptionalOverrides.compileAllLinksIntoOneEntry.checkBoxValue) {
            compiledEntry.imagesDataArray = compiledEntry.imagesDataArray.concat(entry.imagesDataArray);
            compiledEntry.urlsArray = entry.urlsArray ? compiledEntry.urlsArray?.concat(entry.urlsArray) : compiledEntry.urlsArray;
            entry.ids ? Object.assign(compiledEntry.ids, {[i]:  entry.ids})      : {};
            entry.links ? Object.assign(compiledEntry.links, {[i]:  entry.links}) : {};

            if (entry.tags) {
              compiledEntry.tags = compiledEntry.tags ? compiledEntry.tags.concat(entry.tags) : entry.tags;
            }
     
            if (entry.artists) {
              compiledEntry.artists = compiledEntry.artists ? compiledEntry.artists.concat(entry.artists) : entry.artists
            }
            
          } else {
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
        }
        if (i == urlsArray.length - 1) {
          if (stockOptionalOverrides.compileAllLinksIntoOneEntry.checkBoxValue) {
            console.log(compiledEntry);
            
            await database.addEntry(album, {
              ...compiledEntry,
              isNSFW: compiledEntry.isNSFW ?? false,
              id: uuidv4(),
              album: album,
              date_added: (new Date()).getTime(),
              isHidden: isHidden
            }, type)
            .then(res => addedPicsArray.push(res))
            .catch(console.log)
          }
          resolve(addedPicsArray)
        } 
      }
    });
    const resPromise = await forLoopPromise;
    database.updateCountEntriesInAlbumByName(album)
    res.status(200).json(resPromise)
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
    
    const albums = await database.getAlbums(settings.stock_settings.show_hidden.checkBoxValue)
    return res.status(200).json(albums);
  });

  router.post("/connection-test", async (req, res) => {
    const {
      database_url,
      stock_settings,
      special_settings,
      special_params
      } = req.body;

      const responseSettings = {
        database_url,
        stock_settings,
        special_settings,
        special_params
      }
      

    const errorsObject: IErrorObject = {
      hasError: false,
      responseSettings: responseSettings,
    }  
    
    if (responseSettings.database_url.checkBoxValue) {
      const canConnect = await MongoDatabaseLogic.testMongoDBConnection(responseSettings.database_url.stringValue.value);
      if (canConnect) {  
        settings.database_url = responseSettings.database_url;
        responseSettings.database_url.errorMessage = "";
      }
      else responseSettings.database_url.errorMessage = "Unable to connect to database";
    }
    
      settings.stock_settings = responseSettings.stock_settings;
      const arrayLength = logic.specialSettingValidityCheck.length
      const validityCheckLoop = new Promise(async (resolve, reject) => {
        logic.specialSettingValidityCheck.forEach(async (checkFunc, index) => {
          const param = recursiveObjectIndex<IParam>(errorsObject.responseSettings, checkFunc.indexer);
          if (param) {
            param.errorMessage = await checkFunc.checkValid(param.checkBoxValue, param.stringValue?.value);
            errorsObject.hasError = errorsObject.hasError || !!param.errorMessage
            
          }
          if ((index + 1) == arrayLength) {
            resolve(true)
          }
        })
      })
      await validityCheckLoop;

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
    const { album, entriesIDs } = req.body      
    database.deleteEntries(album, entriesIDs);
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


  export default router;

  function recursiveObjectIndex<T>(objectToIndex:any, arrayOfIndexes: string[]): T | undefined {
    
    while (arrayOfIndexes.length) {
      if (objectToIndex && Object.prototype.hasOwnProperty.call(objectToIndex, arrayOfIndexes[0])) {
        return (recursiveObjectIndex(objectToIndex[arrayOfIndexes[0]], arrayOfIndexes.slice(1)) as T)
      } else return undefined
    } return objectToIndex
  }

  
  