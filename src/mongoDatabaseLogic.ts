import type { 
    IMongoDBEntry,
    IAlbumDictionaryItem,
    IFilterObj,
    IAlbumDictionaryItemMongo,
    IDBEntry,
    AlbumSchemaType
} from "../types"
import AlbumsDictionaryDB from "../models/MongoDBAlbumsDictionary";

import CreateTagsAutocompleteDBModel from "../models/schemas/CreateTagsAutocompleteDBModel";

import CreateMongoDBEntryModel from "../models/schemas/CreateMongoDBEntryModel";
import mongoose from "mongoose";
const animePicTagsModel = CreateTagsAutocompleteDBModel("anime-pic-tags-db");
const tagsDBDictionary = {
  "Anime Pic": animePicTagsModel
}


let stroredModels: any = {

  };
  
  function modelsDictionary(name: string): mongoose.Model<IMongoDBEntry> {
    if (!stroredModels || !stroredModels[name]) { 
      const newModel = CreateMongoDBEntryModel(name);
      stroredModels[name] = newModel;
    }
    return stroredModels[name];
  }
  
function albumDeletionFunction(albumName: string) {
  mongoose.connection.dropCollection(albumName);
  stroredModels[albumName] = undefined;
}


export default class MongoDatabaseLogic {
  
   /**
    * createAlbum
    */
    public async createAlbum(newAlbum: IAlbumDictionaryItem) {
      const tableOfContentsEntry = new AlbumsDictionaryDB(newAlbum);
      tableOfContentsEntry.save();
  
      mongoose.connection.createCollection(newAlbum.name);
    }
/**
 * deleteAlbumByName
 */
public async deleteAlbumByName(albumName: string) {
  await AlbumsDictionaryDB.deleteOne({name: albumName});
  albumDeletionFunction(albumName);
  }

  /**
 * deleteAlbumByUUID
 */
public async deleteAlbumByUUID(albumUUID: string) {
  const album = await AlbumsDictionaryDB.findOne({uuid: albumUUID})
  if (album) {
    albumDeletionFunction(album.name);
    album.deleteOne()
  }
}  

/**
 * getAlbums
 */
public async getAlbums() {
    return await AlbumsDictionaryDB.find();
}

   /**
    * get Entries and filter
    */
   public async getEntriesInAlbumByUUIDAndFilter(albumUUID: string, initialFilterObject: IFilterObj) {
    const filterObject: any = {
    }
    
    initialFilterObject.nameIncludes ? (filterObject.name = {$in: initialFilterObject.nameIncludes}) : {},
    initialFilterObject.tags ? (filterObject.tags = {$in: initialFilterObject.tags}) : {},
    initialFilterObject.artists ? (filterObject.artists = {$in: initialFilterObject.artists}) : {},
    initialFilterObject.showHidden ? {} : (filterObject.isHidden = false)
    initialFilterObject.showNSFW ? {} : (filterObject.isNSFW = false)
    
    const album = (await AlbumsDictionaryDB.findOne({
      uuid: albumUUID,
    }));
    if (album) {
      console.log(filterObject);
      
      return await modelsDictionary(album.name).find(filterObject);
    }
    
   }

   /**
    * updateEntry
    */
   public updateEntry(albumName: string, entryOBJ: IMongoDBEntry) {
    
    const newModelEntry = modelsDictionary(albumName);
    return newModelEntry.updateOne({id: entryOBJ.id }, entryOBJ);
   }


  /**
  * handleHiding
  */
   public handleHiding(albumName: string, entriesIDs: string[], hide: boolean) {
    const newModelEntry = modelsDictionary(albumName);
    return newModelEntry.updateMany({id: {$in: entriesIDs} }, {$set: {isHidden: hide}})
  }
  

   /**
    * deleteEntries
    */
   public deleteEntries(albumName: string, entriesIDs: string[]) {
    const newModelEntry = modelsDictionary(albumName);
    return newModelEntry.deleteMany({id: { $in: entriesIDs} })
   }

   /**
    * addPicture
    */
   public addEntry(album: string, entryOBJ: IDBEntry, type: AlbumSchemaType) {
    const newModelEntry = modelsDictionary(album);
    const newEntry = new newModelEntry(entryOBJ);
    newEntry.save();
    this.updateCountEntriesInAlbumByName(album);
    entryOBJ.tags?.forEach(tag => this.addTagEntry(tag, type))
   }

  /**
   * updateCountEntriesInAllAlbums
   */
  public async updateCountEntriesInAllAlbums() {
    const albums = await AlbumsDictionaryDB.find()
    albums.forEach(async (album) => {
    const newModelEntry = modelsDictionary(album.name);  
    const newNumOfPic = await newModelEntry.countDocuments();
    album.estimatedPicCount = newNumOfPic;
    album.update()
    })
  }

  /**
   * updateCountEntriesInAlbumByUUID
   */
  public async updateCountEntriesInAlbumByUUID(albumUUID: string) {
    const album = (await AlbumsDictionaryDB.findOne({
      uuid: albumUUID,
    }));

    if (album) {
      this.countEntriesInAlbum(album)
    }
    
  }


  /**
   * updateCountEntriesInAlbumByName
   */
   public async updateCountEntriesInAlbumByName(albumName: string) {
    const album = (await AlbumsDictionaryDB.findOne({
      name: albumName,
    }));

    if (album) {
      this.countEntriesInAlbum(album)
    }
    
  }


 /**
  * countEntriesInAlbum
  */
 public async countEntriesInAlbum(album: IAlbumDictionaryItemMongo) {
  
  const model = modelsDictionary(album.name);  
  const numberOfEntries = (await model.countDocuments()).valueOf()
  album.estimatedPicCount = numberOfEntries;
  album.updateOne()
 }

  /**
   * testMongoDBConnection
   */
  static async testMongoDBConnection(database_url: string) {
    if (database_url != '') {
      return await mongoose
      .createConnection(database_url)
      .asPromise()
      .then((connection) => {
        return true;
      })
      .catch(() => {
        return false;
      });
    }
    else return false;
  }
  
  /**
   * addTagEntry
   */
   public addTagEntry(tag: string, type: AlbumSchemaType, tagToUpdateTo?: string) {
    const TagsAutocompleteDB = tagsDBDictionary[type];
    TagsAutocompleteDB.updateOne({_id: tag}, {_id: tagToUpdateTo ?? tag}, {upsert: true})
  }

 /**
  * getTagsForAutocomplete
  */
 public getTagsForAutocomplete(search: string, type: AlbumSchemaType) {
  const searchRegex = RegExp(search)
  const TagsAutocompleteDB = tagsDBDictionary[type];
  return TagsAutocompleteDB.find({_id: {$regex: searchRegex}}).then(results => results.map(tag => tag._id))
 }


  constructor(mongoDBURL: string) {
    mongoose.connect(mongoDBURL);
          
    mongoose.connection.on("error", function (error) {
      console.log("error: ", error);
    });
    mongoose.connection.on("open", function (ref) {
      console.log("Connected to Mongo server...");
    });

  }

}