import type { 
  IDBEntry,
  IAlbumDictionaryItem,
  IFilterObj
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
    public async getEntriesInAlbumByUUIDAndFilter(albumUUID: string, initialFilterObject: IFilterObj): Promise<IDBEntry[]> {
      const filterObject: any = {
      }
      initialFilterObject.nameIncludes? filterObject.name = {$in: initialFilterObject.nameIncludes} : {},
      initialFilterObject.tags? filterObject.tags = {$in: initialFilterObject.tags} : {},
      initialFilterObject.artists ? filterObject.artists = {$in: initialFilterObject.artists} : {},
      initialFilterObject.showHidden ? {} : (filterObject.isHidden = false)
      initialFilterObject.showNSFW ? {} : (filterObject.isNSFW = false)
  
       return new Promise<IDBEntry[]>((resolve, reject) => {
          AlbumsDictionaryDB.findOne({
            uuid: albumUUID,
          }, (err, doc) => {
            if (!err) albumsDictionaryMap(doc.name).find(filterObject).exec( (err, docs) => {
              if (!err) resolve(docs)
              else console.log(err);
            });
          });
       })
      
    }
     
  
  /**
  * updateEntry
  */
  public updateEntry(albumName: string, entryOBJ: IDBEntry) {
  
  const newModelEntry = albumsDictionaryMap(albumName);
  newModelEntry.update({id: entryOBJ.id }, entryOBJ);
  }


  /**
  * deleteEntry
  */
  public deleteEntry(album: string, entryID: string) {
    const newModelEntry = albumsDictionaryMap(album);
    newModelEntry.remove({id: entryID });
  }
  

  /**
  * addPicture
  */
  public addEntry(album: string, entryOBJ: IDBEntry) {
    const newModelEntry = albumsDictionaryMap(album);
    newModelEntry.insert(entryOBJ);
  }
  

  /**
   * updateCountEntriesInAllAlbums
   */
   public async updateCountEntriesInAllAlbums() {
    
    AlbumsDictionaryDB.find({}).exec((err, docs) => {
      if (!err) {
        docs.forEach(async (doc) => {
          const newDoc = doc;
        const newModelEntry = albumsDictionaryMap(doc.name);  
        newModelEntry.count({}, (err, n) => {
          if (!err) newDoc.estimatedPicCount = n;
          else console.log(err);
        })
        AlbumsDictionaryDB.update( doc, newDoc)
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
        const newDoc = albumDoc;
        newDoc.estimatedPicCount = entryNumber;
        AlbumsDictionaryDB.update(albumDoc, newDoc)
      }
      else console.log(err);
      
    })
  }

constructor(){
    
}

}
