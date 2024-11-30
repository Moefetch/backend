import "reflect-metadata"
import { ArrayContains, DataSource, DataSourceOptions, Equal, Like, And } from "typeorm"
import { Album } from "../TypeORM/Entities/Albums";
import { albumDBClass, IDBEntry, IMedia } from "../TypeORM/Entities/Entry";
import { Tag } from "../TypeORM/Entities/Tags";
import { AlbumSchemaType, IAlbumDictionaryItem, IFilterObj, IMediaItem } from "types";
import { InitializeEmptyDB } from "../TypeORM/Migrations/InitializeEmptyDB";
import { createRequire } from 'node:module';
const requireFile = createRequire(__filename); 


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
    logging: boolean | string | string[];
    driver?: any;
    nativeBinding?: string;
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
        logging: "all",
        entities: [Album, Tag],
        migrations: [InitializeEmptyDB],
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
            this.entitiesMedia[a.name] = Media;
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
      if (process.env.NODE_ENV != "development" && typeORMOptions.nativeBinding && typeORMOptions.type == "better-sqlite3") this.dbConnectionOptions.nativeBinding = requireFile(typeORMOptions.nativeBinding)
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
    public entitiesMedia: {[albumName:string]:any} = {};
    

    /**
     * modify Album data (affects the album dictionary as well as the album Table itself and the Media entries in said album)
     */
    public async updateAlbum(album: IAlbumDictionaryItem) {
      //making instance
      const albumInstance = new Album();
      albumInstance.id = album.id;
      albumInstance.albumCoverImage = album.albumCoverImage as string;
      albumInstance.name = album.name;
      albumInstance.uuid = album.uuid;
      albumInstance.type = album.type;
      albumInstance.estimatedPicCount = album.estimatedPicCount;
      albumInstance.isHidden = album.isHidden;  
      
      const oldTableName = (await this.appDataSource.manager.findOne(Album, {where:{uuid:Equal(album.uuid)}})).name;
      if (oldTableName) {
        
        if (oldTableName != album.name) {
          const modelEntry = this.entities[oldTableName];
          await this.appDataSource.manager.update(modelEntry, {}, {album: album.name});
          await this.appDataSource.manager.update(this.entitiesMedia[oldTableName], {album: oldTableName}, {album: album.name});
          await this.appDataSource.createQueryRunner("master").renameTable(oldTableName, album.name).catch(console.log);

          this.entities[oldTableName] = undefined;
          this.entitiesMedia[oldTableName] = undefined;
    
          await this.appDataSource.manager.update(Album, {"uuid": album.uuid}, albumInstance);

          
          const {Entry, Media} = albumDBClass(album.name);
          this.entities[album.name] = Entry;
          this.entitiesMedia[album.name] = Media;

          this.dbConnectionOptions.entities = [Album, Tag];
          for (const albumName in this.entities) {
            if (Object.prototype.hasOwnProperty.call(this.entities, albumName)) {
              this.dbConnectionOptions.entities.push(this.entities[albumName]);
              this.dbConnectionOptions.entities.push(this.entitiesMedia[albumName]);
            }
          }
        }
        else await this.appDataSource.manager.update(Album, {"uuid": album.uuid}, albumInstance);

        await this.reloadAppDataSource();
      }
    }

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
    this.entitiesMedia[newAlbum.name] = Media;

    await this.appDataSource.query(`CREATE TABLE "${newAlbum.name}" ("id" varchar PRIMARY KEY NOT NULL, "indexer" integer NOT NULL, "name" varchar, "hasVideo" boolean, "thumbnailFile" varchar NOT NULL, "alternative_names" text, "album" varchar NOT NULL, "artists" text, "storedResult" varchar, "links" text, "ids" text, "isHidden" boolean NOT NULL, "hasNSFW" boolean NOT NULL, "hasResults" boolean, "tags" text, "date_added" integer NOT NULL, "date_created" integer)`);
    this.dbConnectionOptions.entities.push(this.entities[newAlbum.name]);
    this.dbConnectionOptions.entities.push(Media);

    //reloading
    await this.reloadAppDataSource();
  }


    private async reloadAppDataSource() {
      await this.appDataSource.destroy()
      this.appDataSource = new DataSource(this.dbConnectionOptions as DataSourceOptions);
      await this.appDataSource.initialize();
    }

  /**
   * deleteAlbum
   */
  public async deleteAlbumByName(albumName: string) {
    this.appDataSource.createQueryBuilder().delete().from("Media", "Media").select("*").where(`album='${albumName}'`).execute();
    
    await this.appDataSource.createQueryRunner().dropTable(albumName);
    this.appDataSource.manager.delete(Album, {name:albumName}).catch(err=>console.log("Error deleting Album: ", albumName, "\nwith error message: ", err));
    this.entities[albumName] = undefined;
    this.entitiesMedia[albumName] = undefined;
    
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
  public async getEntriesInAlbumByNameAndFilter(albumName: string, initialFilterObject: IFilterObj, sortBy?: any) {
    const filterObject: any = {
    }
    filterObject.media = {};
    if (initialFilterObject.nameIncludes) {
      filterObject.media.file = Like(`%${initialFilterObject.nameIncludes}%`);
    }
    if (initialFilterObject.tags?.length) {
      let tagsQuery:any = [];
      initialFilterObject.tags.forEach(tag=> tagsQuery.push(Like(`%${tag}%`)));
      filterObject.media.tags = And(...tagsQuery);
    };
    if (initialFilterObject.id) {
      filterObject.id = Equal(initialFilterObject.id);
    }
    initialFilterObject.artists ? filterObject.artists = ArrayContains(initialFilterObject.artists) : undefined;
    (initialFilterObject.showHidden) ? undefined : filterObject.isHidden = Equal(false);
    (initialFilterObject.showNSFW ) ? undefined : filterObject.hasNSFW = Equal(false);
    let sortObj: any = undefined;
    if (sortBy) {
      const sortDictionary = {"Newest First": {date_added: "DESC"},
       "Oldest First": {date_added: "ASC"}};
       sortObj = sortDictionary[sortBy]
       sortObj.media = {index:"ASC"}
      }
    return (await this.appDataSource.getRepository(this.entities[albumName]).find({relations: {
      media: true,
    }, where: filterObject, order: sortObj}))
    
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
  * handleHidingPicturesInAlbum
  */
  public handleHidingPicturesInAlbum(albumName: string, entriesIDs: string[], hide: boolean) {
    let ids = entriesIDs.join("', '");
    this.appDataSource.createQueryRunner().query(`UPDATE "${albumName}" SET isHidden = ${!!hide} WHERE "id" IN ('${ids}');`);
    }
  

  /**
  * handleHidingPicturesInAlbum
  */
  public handleHidingPictureInAlbum(albumName: string, entryID: string, hide: boolean) {
    this.appDataSource.createQueryRunner().query(`UPDATE "${albumName}" SET isHidden = ${!!hide} WHERE "id" = '${entryID}';`);
    }

  /**
  * deleteEntry
  */
  public async deleteEntries(albumName: string, entriesIDs: string[]) {
    const newModelEntry = this.entities[albumName];
    return entriesIDs.map(id=>this.appDataSource.manager.delete(newModelEntry, {id:id}))
    
  }
  
  /**
   * editMediaItem
   */
  public editMediaItem(item: IMediaItem, newThumbnailFile: string | undefined) {
    const newItem = item; // i know this doesnt create a new objcet, idrc rn
    const mediaModel = this.entitiesMedia[item.album];
    if (newThumbnailFile) {
      newItem.thumbnailFile = newThumbnailFile;
    }
    return this.appDataSource.manager.update(mediaModel, {id: item.id}, newItem);
    
  }

  public updateEntry(albumName: string, newEntryOBJ: IDBEntry) {
    const convertedEntry = this.convertINewPicToIEntry(newEntryOBJ);
    
    const newModelEntry = this.entities[albumName];
    
    
    const newEntry = new newModelEntry();
    
    for (const key in convertedEntry) {
      if (Object.prototype.hasOwnProperty.call(convertedEntry, key)) {
        newEntry[key] = convertedEntry[key];
      }
    }
    
    return this.appDataSource.manager.save(newEntry);
  }

  /**
  * addPicture
  */
  public addEntry(albumName: string, entryOBJ: IDBEntry, type: AlbumSchemaType) {
    const convertedEntry = this.convertINewPicToIEntry(entryOBJ);
    
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
  type ?? (searchObj.category = Equal(type));
  const ress = await this.appDataSource.manager.find(Tag, {where:searchObj})
  
  return ress
}  

}
