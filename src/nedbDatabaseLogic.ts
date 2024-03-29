import type { 
  IDBEntry,
  IAlbumDictionaryItem,
  IFilterObj,
  ITagEntry,
  AlbumSchemaType
} from "../types";

import nedb from "nedb";
import settings from "../settings";

import fs from 'fs';

const baseDBURL = `${settings.downloadFolder}/database`;
const AlbumsDictionaryDB = new nedb<IAlbumDictionaryItem>(`${baseDBURL}/AlbumsDictionary/AlbumsDictionary.db`)
AlbumsDictionaryDB.loadDatabase()

let stroredAlbumDBs: any = {

};

function albumsDictionaryMap(name: string): nedb<IDBEntry> {
  if (!stroredAlbumDBs[name]) {
    const album = new nedb<IDBEntry>(`${baseDBURL}/AlbumFolder/${name}.db`);
    album.loadDatabase()
    stroredAlbumDBs[name] = album;
  }
  return stroredAlbumDBs[name]
}

export default class MongoDatabaseLogic {

/**
 * createAlbum
 * @param newAlbum an instance of IAlbumDictionaryItem to create an album of
 */
public async createAlbum(newAlbum: IAlbumDictionaryItem) {
  AlbumsDictionaryDB.insert(newAlbum)
  albumsDictionaryMap(newAlbum.name)

}
    
/**
 * deleteAlbum
 */
public async deleteAlbumByName(albumName: string) {
  fs.unlink(`${baseDBURL}/AlbumFolder/${albumName}.db`, (err) => console.log(err))
  AlbumsDictionaryDB.remove({name: albumName})
  stroredAlbumDBs[albumName] = undefined;
}


/**
 * deleteAlbumsByUUIDS
 */
public deleteAlbumsByUUIDS(albumUUIDs: string[]) {
  AlbumsDictionaryDB.find({uuid: {$in: albumUUIDs}}).exec((err, docs) => {
    docs.forEach( album => this.deleteAlbumByName(album.name))
    
  })
}  

/**
 * hideAlbumsByUUIDs
 */
public handleHidingAlbumsByUUIDs(albumUUIDs: string[], hide: boolean) {
  AlbumsDictionaryDB.update({uuid: {$in: albumUUIDs}}, {$set: {isHidden: hide}}, {multi: true}, (err, numberOfUpdated, upsert) => {
    err ? console.log(err) : '';
  })
}

/**
 * getAlbums
 */
public async getAlbums(showHidden: boolean) {
const filter = showHidden ? {} : {isHidden: false};
 return new Promise<IAlbumDictionaryItem[]>((resolve, reject) => {
    AlbumsDictionaryDB.find(filter).exec(( err, docs ) => {
      if (!err) resolve(docs);
      else reject(err);
    })
  })
}


   /**
    * get Entries and filter
    */
    public async getEntriesInAlbumByUUIDAndFilter(albumUUID: string, initialFilterObject: IFilterObj, sortObj?: any): Promise<IDBEntry[]> {
      const filterObject: any = {
      }
      initialFilterObject.nameIncludes? filterObject.name = {$in: initialFilterObject.nameIncludes} : {};
      initialFilterObject.tags? filterObject.tags = {$in: initialFilterObject.tags} : {};
      initialFilterObject.artists ? filterObject.artists = {$in: initialFilterObject.artists} : {};
      (initialFilterObject.showHidden) ? {} : (filterObject.isHidden = false);
      (initialFilterObject.showNSFW ) ? {} : (filterObject.isNSFW = false);
  
       return new Promise<IDBEntry[]>((resolve, reject) => {
          AlbumsDictionaryDB.findOne({
            uuid: albumUUID,
          }, (err, doc) => {
            
            
            if (!err && doc) albumsDictionaryMap(doc.name).find(filterObject).sort(sortObj).exec( (err, docs) => {
              if (!err) resolve(docs)
              else reject(err);
            });
          });
       })
      
    }
     
  
  /**
  * updateEntry
  */
  public updateEntry(albumName: string, entryOBJ: IDBEntry) {
  
  const newModelEntry = albumsDictionaryMap(albumName);
  return new Promise((resolve, reject) => {
    newModelEntry.update({id: entryOBJ.id }, entryOBJ);
  })
  }

  
  /**
  * handleHidingPicturesInAlbum
  */
   public handleHidingPicturesInAlbum(albumName: string, entriesIDs: string[], hide: boolean) {
  
    const newModelEntry = albumsDictionaryMap(albumName);
    return new Promise((resolve, reject) => {
      newModelEntry.update({id: {$in: entriesIDs} }, {$set: {isHidden: hide}}, {multi: true}, (err, numOfUpdated) => {
        err ? reject(err) : resolve(numOfUpdated)
      })
    })
    }
  



  /**
  * deleteEntry
  */
  public deleteEntries(album: string, entriesIDs: string[]) {
    const newModelEntry = albumsDictionaryMap(album);
    return new Promise((resolve, reject)=>{
      newModelEntry.remove({id: {$in: entriesIDs} }, {multi: true}, (err, n) =>{
        err ? reject(err) : resolve(n)
      });
    })
  }
  

  /**
  * addPicture
  */
  public addEntry(album: string, entryOBJ: IDBEntry, type: AlbumSchemaType) {
    const convertedEntry = this.convertINewPicToIEntry(entryOBJ)
    const newModelEntry = albumsDictionaryMap(album);
    if (convertedEntry.tags) {
      convertedEntry.tags.forEach(tag => this.addTagEntry(tag, type))
    }
    return new Promise<IDBEntry>((resolve, reject) => newModelEntry.insert(convertedEntry, (err, doc) => {
      err ? reject(err) : resolve(doc) 
      })
    );
  }
  
 /**
  * convertIAnimePicToIEntry
  */
 public convertINewPicToIEntry(entryOBJ: any) {
  const exportEntry = entryOBJ;
  delete exportEntry.data;
  delete exportEntry.urlsArray;
  delete exportEntry.requestOptions;
  delete exportEntry.imageSize;
  return exportEntry as IDBEntry;
 }

  /**
   * updateCountEntriesInAllAlbums
   */
   public async updateCountEntriesInAllAlbums() {
    
    AlbumsDictionaryDB.find({}).exec((err, docs) => {
      if (!err) {
        docs.forEach(async (doc) => {
          this.updateCountEntriesInAlbum(doc);
        })
      }
    })
  }


  /**
   * updateCountEntriesInAlbumByUUID
   */
   public async updateCountEntriesInAlbumByUUID(albumUUID: string) {
    AlbumsDictionaryDB.findOne({
      uuid: albumUUID,
    }, (err, doc) => {
      if (!err) this.updateCountEntriesInAlbum(doc)
      else console.log(err);
    });
  }

  

  /**
   * updateCountEntriesInAlbumByName 
   */
   public async updateCountEntriesInAlbumByName(albumName: string) {
    AlbumsDictionaryDB.findOne({
      name: albumName,
    }, (err, doc) => {
      if (!err) this.updateCountEntriesInAlbum(doc)
      else console.log(err);
    });
  }

  public async updateCountEntriesInAlbum(albumDoc: IAlbumDictionaryItem){
    const album = albumsDictionaryMap(albumDoc.name);
    album.count({}, (err, entryNumber) => {
      if (!err) {

        AlbumsDictionaryDB.update({_id: albumDoc._id},{$set:  {estimatedPicCount: entryNumber}})
      }
      else console.log(err);
      
    })
  }

  /**
   * addTagEntry
   */
  public addTagEntry(tag: string, type: AlbumSchemaType, tagToUpdateTo?: string) {
    const tagDB = this.tagsDBDictionary[type];
    const masterTagDB = this.tagsDBDictionary["All Categories"];
    tagDB.update({_id: tag.toLocaleLowerCase()}, {_id: tagToUpdateTo?.toLowerCase() ?? tag, tag: tagToUpdateTo?.toLowerCase() ?? tag.toLowerCase()}, {upsert: true})
    masterTagDB.update({_id: tag.toLocaleLowerCase()}, {_id: tagToUpdateTo?.toLowerCase() ?? tag, tag: tagToUpdateTo?.toLowerCase() ?? tag.toLowerCase()}, {upsert: true})
  }

 /**
  * getTagsForAutocomplete
  */
 public getTagsForAutocomplete(search: string, type: AlbumSchemaType) {
  const tagDB = this.tagsDBDictionary[type];

  const searchRegex = RegExp(search.toLowerCase());
  return new Promise<string[] | Error>((resolve, reject) => {
    tagDB.find({tag: {$regex: searchRegex}}, function (err: any, docs: any[]) {
    err ? reject(err) : resolve(docs.map(tag => tag._id))
    })
  })
 }
  public tagsDBDictionary: {[x:string]: nedb<ITagEntry>}
  constructor(logicCategories: string[]){
    this.tagsDBDictionary = this.loadTagDictionary(logicCategories);
    this.loadAllCategoryTagsCombinedTagDB()
  }
  private loadTagDictionary(logicCategories: string[]) {
    return Object.fromEntries(logicCategories.map(category => {
      const categoryTagDB = new nedb<ITagEntry>(`${baseDBURL}/Tags/${category.replace(' ',"-").toLowerCase()}.db`);
      categoryTagDB.loadDatabase()
      return [category, categoryTagDB]
    }))
  }
  private loadAllCategoryTagsCombinedTagDB() {
    const tagDB = new nedb<ITagEntry>(`${baseDBURL}/Tags/all-categories.db`);
    tagDB.loadDatabase();
    this.tagsDBDictionary["All Categories"] = tagDB;

  }
}
