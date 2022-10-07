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

const AnimePicTagsDB = new nedb<ITagEntry>(`${baseDBURL}/Tags/AnimePicsTags.db`);
AnimePicTagsDB.loadDatabase()

const tagsDBDictionary = {
  "Anime Pic": AnimePicTagsDB
}


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
 * deleteAlbum
 */
public deleteAlbumByUUID(albumUUID: string) {
  AlbumsDictionaryDB.findOne({uuid: albumUUID}, (err, doc) => {
    this.deleteAlbumByName(doc.name);
  })
}  


/**
 * getAlbums
 */
public async getAlbums() {
 return new Promise<IAlbumDictionaryItem[]>((resolve, reject) => {
    AlbumsDictionaryDB.find({}).exec(( err, docs ) => {
      if (!err) resolve(docs);
      else console.log(err);
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
            
            
            if (!err) albumsDictionaryMap(doc.name).find(filterObject).sort(sortObj).exec( (err, docs) => {
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
  * handleHiding
  */
   public handleHiding(albumName: string, entriesIDs: string[], hide: boolean) {
  
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
    const convertedEntry = this.convertIAnimePicToIEntry(entryOBJ)
    const newModelEntry = albumsDictionaryMap(album);
    newModelEntry.insert(convertedEntry);
    this.updateCountEntriesInAlbumByName(album);

    convertedEntry.tags?.forEach(tag => this.addTagEntry(tag, type))
  }
  
 /**
  * convertIAnimePicToIEntry
  */
 public convertIAnimePicToIEntry(entryOBJ: any) {
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

        AlbumsDictionaryDB.update({_id: albumDoc._id}, {$set: {estimatedPicCount: entryNumber}})
      }
      else console.log(err);
      
    })
  }

  /**
   * addTagEntry
   */
  public addTagEntry(tag: string, type: AlbumSchemaType, tagToUpdateTo?: string) {
    const AnimePicTagsDB = tagsDBDictionary[type];
    AnimePicTagsDB.update({_id: tag}, {_id: tagToUpdateTo ?? tag}, {upsert: true})
  }

 /**
  * getTagsForAutocomplete
  */
 public getTagsForAutocomplete(search: string, type: AlbumSchemaType) {
  const AnimePicTagsDB = tagsDBDictionary[type];
  const searchRegex = RegExp(search)
  return new Promise<string[] | Error>((resolve, reject) => {
    AnimePicTagsDB.find({_id: {$regex: searchRegex}}).exec((err, docs) => {
    err ? reject(err) : resolve(docs.map(tag => tag._id))
    })
  })
 }

constructor(){
    
}

}
