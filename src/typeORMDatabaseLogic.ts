import "reflect-metadata"
import { ArrayContains, DataSource, DataSourceOptions, Equal, Like } from "typeorm"
import { Album } from "../TypeORMEntities/Albums";
import { albumDBClass, IDBEntry } from "../TypeORMEntities/Entry";
import { Tag } from "../TypeORMEntities/Tags";
import { AlbumSchemaType, IAlbumDictionaryItem, IFilterObj } from "types";


const doc1 = {
    
    "indexer": 0,
    "hasVideo": false,
    "imagesDataArray": [
      {
        "file": "/saved_pictures/Album 1 /pixiv - 107301212 - 0 - 1718475726291.png",
        "thumbnail_file": "/saved_pictures_thumbnails/Album 1 /thumbnail - pixiv - 107301212 - 0 - 1718475749878.jpg",
        "isVideo": false,
        "imageSize": {
          "height": 3650,
          "width": 2000
        }
      },
      {
        "file": "/saved_pictures/Album 1 /pixiv - 107301212 - 1 - 1718475750279.png",
        "thumbnail_file": "/saved_pictures_thumbnails/Album 1 /thumbnail - pixiv - 107301212 - 1 - 1718475766221.jpg",
        "isVideo": false,
        "imageSize": {
          "height": 3046,
          "width": 1500
        }
      }
    ],
    "alternative_names": [],
    "oldImagesDataArray": [],
    "album": "Album 1",
    "artists": [
      "JinOne"
    ],
    "storedResult": "pixiv",
    "links": {
      "pixiv": "https://www.pixiv.net/en/artworks/107301212"
    },
    "ids": {
      "pixiv": "107301212"
    },
    "isHidden": false,
    "isNSFW": false,
    "tags": [
      "GenshinImpact",
      "Genshin Impact",
      "ayaka",
      "Ayaka Kamisato",
      "Genshin Impact 10000+ bookmarks",
      "Genshin Impact scenery"
    ]
  }

interface typeORMOptions {
    type: string;
    host?: string;
    port?: number;
    database: string;
    username?: string;
    password?:string;
    synchronize: boolean;
    logging: boolean;
}
interface IDBConnectionOptions extends typeORMOptions {
    entities: any[];
    migrations: any[];
    subscribers: any[];
}

export class TypeORMInterface {
    public dbConnectionOptions: IDBConnectionOptions = {
        type: "",
        database: "",
        synchronize: true, //change this to false for production?
        logging: false,
        entities: [Album, Tag],
        migrations: [],
        subscribers: [],
    }
    /**
     * name
     */
    public async connectToDB() {
      this.appDataSource = new DataSource(this.dbConnectionOptions as DataSourceOptions);
    
      await this.appDataSource.initialize().then(async (DataSource)=>{
        
        const Albums = await DataSource.manager.find(Album);
        
        Albums.forEach(a=>{
            const {Entry, Media} = albumDBClass(a.name);
            this.entities[a.name] = Entry;
            this.dbConnectionOptions.entities.push(Entry);
            this.dbConnectionOptions.entities.push(Media);
        })
            await DataSource.destroy()
        })
        
        this.appDataSource = new DataSource(this.dbConnectionOptions as DataSourceOptions);
        
        await this.appDataSource.initialize();   
    }
    public appDataSource: DataSource;

    constructor(typeORMOptions: typeORMOptions) {
        this.dbConnectionOptions.type = typeORMOptions.type;
        this.dbConnectionOptions.database = typeORMOptions.database;
        typeORMOptions.host ?? (this.dbConnectionOptions.host = typeORMOptions.host)
        typeORMOptions.port ?? (this.dbConnectionOptions.port = typeORMOptions.port)
        typeORMOptions.username ?? (this.dbConnectionOptions.username = typeORMOptions.username)
        typeORMOptions.password ?? (this.dbConnectionOptions.password = typeORMOptions.password)
        this.dbConnectionOptions.synchronize = typeORMOptions.synchronize;
        this.dbConnectionOptions.logging = typeORMOptions.logging;
    }

    /**
     * initialize
     */
    static async init(typeORMOptions: typeORMOptions) {
        const instance = new TypeORMInterface(typeORMOptions);
        await instance.connectToDB();
        return instance;
    }

    public entities: {[albumName:string]:any} = {};
    

    /**
   * createAlbum
   * @param newAlbum an instance of IAlbumDictionaryItem to create an album of
   */
  public async createAlbum(newAlbum: IAlbumDictionaryItem) {
    //making instance
    const album = new Album();
    album.id = newAlbum.id;
    album.albumCoverImage = newAlbum.albumCoverImage as string;
    album.name = newAlbum.name;
    album.uuid = newAlbum.uuid;
    album.type = newAlbum.type;
    album.estimatedPicCount = newAlbum.estimatedPicCount;
    album.isHidden = newAlbum.isHidden;

    await this.appDataSource.manager.save(album).catch(err => console.log("Error creating album with data: ", album , '\nwith error message', err))
    //generating entity for entries in album
    const {Entry, Media} = albumDBClass(newAlbum.name);
    this.entities[newAlbum.name] = Entry;
    this.dbConnectionOptions.entities.push(this.entities[newAlbum.name]);
    this.dbConnectionOptions.entities.push(Media);

    //reloading
    await this.appDataSource.destroy()
    this.appDataSource = new DataSource(this.dbConnectionOptions as DataSourceOptions);
    await this.appDataSource.initialize();
  }
    

  /**
   * deleteAlbum
   */
  public async deleteAlbumByName(albumName: string) {
    this.appDataSource.manager.delete(Album, {name:albumName}).catch(err=>console.log("Error deleting Album: ", albumName, "\nwith error message: ", err));
    const {Entry, Media} = albumDBClass(albumName);
    this.appDataSource.getRepository(Entry).clear();
    this.appDataSource.getRepository(Media).clear();
    this.entities[albumName] = undefined;
  }



  /**
   * deleteAlbumsByUUIDS
   */
  public deleteAlbumsByUUIDS(albumUUIDs: string[]) {
    const queryUUIDs = albumUUIDs.map(uuid => ({"uuid":uuid}))
    this.appDataSource.manager.find(Album, {where:queryUUIDs}).then((albums)=>{
        albums.forEach(album=>this.deleteAlbumByName(album.name))
    })
  }  


  /**
   * hideAlbumsByUUIDs
   */
  public handleHidingAlbumsByUUIDs(albumUUIDs: string[], hide: boolean) {
    const queryUUIDs = albumUUIDs.map(uuid => ({"uuid":uuid}))
    this.appDataSource.manager.update(Album, {where:queryUUIDs},{isHidden: hide})
  }


  /**
   * getAlbums
   */
  public async getAlbums(showHidden: boolean) {
    const filter = showHidden ? undefined : {where:[{isHidden: false}]};
    return await this.appDataSource.manager.find(Album, filter).catch(err => console.log("Error getting albums, error message: ", err));
    }
  


  /**
  * get Entries and filter
  */
  public async getEntriesInAlbumByNameAndFilter(albumName: string, initialFilterObject: IFilterObj, sortObj?: any) {
    const filterObject: any = {
    }
    initialFilterObject.nameIncludes ? filterObject.name = Like(`%${initialFilterObject.nameIncludes}%`) : undefined;
    initialFilterObject.tags ? filterObject.tags = ArrayContains(initialFilterObject.tags) : {};
    initialFilterObject.artists ? filterObject.artists = ArrayContains(initialFilterObject.artists) : undefined;
    (initialFilterObject.showHidden) ? undefined : filterObject.isHidden = Equal(false);
    (initialFilterObject.showNSFW ) ? undefined : filterObject.isNSFW = Equal(false);
    sortObj ? filterObject.order = sortObj : undefined;
    return (await this.appDataSource.manager.find(this.entities[albumName], filterObject))
    
  }
    



  /**
  * get Entries and filter
  */
  public async getEntriesInAlbumByUUIDAndFilter(albumUUID: string, initialFilterObject: IFilterObj, sortObj?: any) {
    return await this.getEntriesInAlbumByNameAndFilter(
      (await this.appDataSource.manager.findOne(Album, {where:{uuid:Equal(albumUUID)}})).name,
      initialFilterObject,
      sortObj
    )    
  }
    

  /**
  * updateEntry
  */
  public updateEntry(albumName: string, entryOBJ: IDBEntry) {
  
    const newModelEntry = this.entities[albumName];
    return this.appDataSource.manager.update(newModelEntry, {id:entryOBJ.id}, entryOBJ);
    }
  
  
  /**
  * handleHidingPicturesInAlbum
  */
  public handleHidingPicturesInAlbum(albumName: string, entriesIDs: string[], hide: boolean) {
    const newModelEntry = this.entities[albumName];
    const queryIDs = entriesIDs.map(id => ({"id":id}));
    return this.appDataSource.manager.update(newModelEntry, {where:queryIDs}, {isHidden: hide})
    }
  

  /**
  * handleHidingPicturesInAlbum
  */
  public handleHidingPictureInAlbum(albumName: string, entryID: string, hide: boolean) {
  
    const newModelEntry = this.entities[albumName];
    return this.appDataSource.manager.update(newModelEntry, {id:entryID}, {isHidden: hide})
    }
  



  /**
  * deleteEntry
  */
  public async deleteEntries(albumName: string, entriesIDs: string[]) {
    const newModelEntry = this.entities[albumName];
    return entriesIDs.map(id=>this.appDataSource.manager.delete(newModelEntry, {id:id}))
    
  }
  

  /**
  * addPicture
  */
  public addEntry(albumName: string, entryOBJ: IDBEntry, type: AlbumSchemaType) {
    const convertedEntry = this.convertINewPicToIEntry(entryOBJ)
    const newModelEntry = this.entities[albumName];
    convertedEntry.media.forEach(m=>{

      if (m.tags) {
        m.tags.forEach(tag => this.addTagEntry(tag, type))
      }
    })
    
    const newEntry = new newModelEntry();
    
    for (const key in convertedEntry) {
      if (Object.prototype.hasOwnProperty.call(convertedEntry, key)) {
        newEntry[key] = convertedEntry[key];
      }
    }

    return this.appDataSource.manager.save(newEntry);
  }/* 
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.commitTransaction();
    await queryRunner.query(`PRAGMA foreign_keys = OFF`);
    await queryRunner.startTransaction();

    // --- Original migration starts here
    await queryRunner.query(`CREATE TABLE "temporary_photo" (...)`);
    await queryRunner.query(`INSERT INTO "temporary_photo" (...) SELECT ... FROM "photo"`);
    await queryRunner.query(`DROP TABLE "photo"`);
    await queryRunner.query(`ALTER TABLE "temporary_photo" RENAME TO "photo"`);
    // --- Original migration ends here

    await queryRunner.commitTransaction();
    await queryRunner.query(`PRAGMA foreign_keys = ON`);
    await queryRunner.startTransaction();
  } */
  /**
   * addTagEntry
   */
  public addTagEntry(tag: string, type: AlbumSchemaType) {
    const newTag = new Tag();
    newTag.tag = tag;
    newTag.category = type;
    return this.appDataSource.manager.upsert(Tag,newTag,{skipUpdateIfNoValuesChanged:true,conflictPaths:{tag:true}})
    //return this.appDataSource.manager.save(newTag);
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
    const albums = await this.appDataSource.manager.find(Album).catch((err)=>console.log("Error Updating album counts"));
    if (albums) {
      albums.forEach(albumObj => {
        this.updateCountEntriesInAlbum(albumObj);
      })
    }
  }


  /**
   * updateCountEntriesInAlbumByUUID
   */
   public async updateCountEntriesInAlbumByUUID(albumUUID: string) {
    const albumObj = await this.appDataSource.manager.findOne(Album,{where:{uuid:albumUUID}})
    const album = this.entities[albumObj.name];
    const entryNumber = await this.appDataSource.manager.count(album)
    return await this.appDataSource.manager.update(Album, {uuid: albumObj.uuid}, {estimatedPicCount: entryNumber});
  }

  

  /**
   * updateCountEntriesInAlbumByName 
   */
   public async updateCountEntriesInAlbumByName(albumName: string) {
    const album = this.entities[albumName];
    const entryNumber = await this.appDataSource.manager.count(album)
    return await this.appDataSource.manager.update(Album, {name: albumName}, {estimatedPicCount: entryNumber});
  }

  public async updateCountEntriesInAlbum(albumObj: IAlbumDictionaryItem){
    const album = this.entities[albumObj.name];
    const entryNumber = await this.appDataSource.manager.count(album)
    return await this.appDataSource.manager.update(Album, {uuid: albumObj.uuid}, {estimatedPicCount: entryNumber});
  }


 /**
  * getTagsForAutocomplete
  */
 public async getTagsForAutocomplete(search: string, type?: AlbumSchemaType) {
  const searchObj:any = {tag: Like(`%${search}%`)};
  type ?? (searchObj.category = Equal(type))
  const ress = await this.appDataSource.manager.find(Tag, {where:searchObj})
  
  return ress
}  

}
