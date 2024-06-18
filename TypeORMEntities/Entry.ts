import { Entity, ObjectIdColumn, ObjectId, Column, EntitySchema, PrimaryColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm"

export interface ISize {
    width: number | undefined;
    height: number | undefined;
    orientation?: number;
    type?: string;
    length?: number;
}
export interface ISizeCalculationResult extends ISize {
    images?: ISize[];
}


export interface IImageDataArray  {
    file: string;
    isVideo: boolean;
    thumbnail_file?: string;
    imageSize?: ISizeCalculationResult;
}
export interface IDBEntry {
    id: string;
    indexer: number;
    name?: string;
    hasVideo: boolean;
    imagesDataArray: IImageDataArray[];
    alternative_names?: string[];
    oldImagesDataArray?: IImageDataArray[];
    album: string;
    //tags_pixiv?: string[];
    //tags_danbooru?: string[];
    artists?: string[];
    storedResult?: string;
    links?: IPostLinks;
    ids?: IPostIds;
    isHidden: boolean;
    isNSFW: boolean;
    hasResults?: boolean;
    //pixiv_post_id?: number;

    //compatability with INewAnimePic
    tags?: string[];
    date_added?: number;
    date_created?: number;
    //imageSize?: ISizeCalculationResult;
}
export interface IPostIds {
    [hostname:string]: string;
}

export interface IPostLinks {
    [hostname:string]: string;
}
@Entity({name:"IEntry"})
export class IEntry implements IDBEntry {

    @PrimaryColumn() 
    id: string;
    
    @Column()
    indexer: number;
    
    @Column({nullable: true})
    name?: string;

    @Column()
    hasVideo: boolean;

    @OneToMany((type) => IMedia, (media) => media.parentEntry, {cascade:true,eager:true})
    imagesDataArray: IMedia[];
    
    @Column({nullable:true,type:"simple-array"})
    alternative_names?: string[];
    
    /* 
    oldImagesDataArray?: IImageDataArray[]; */
    
    @Column()
    album: string;
    
    @Column("simple-array")
    artists?: string[];
    
    @Column()
    storedResult?: string;
    
    @Column("simple-json")
    links?: IPostLinks;
    
    @Column("simple-json")
    ids?: IPostIds;
    
    @Column()
    isHidden: boolean;
    
    @Column()
    isNSFW: boolean;
    
    @Column({nullable:true})
    hasResults?: boolean;
    
    @Column("simple-array")
    tags?: string[];

    @Column()
    date_added?: number;

    @Column()
    date_created?: number;
}    
@Entity({name:"IMedia"})
export class IMedia implements IImageDataArray {
    
    @PrimaryGeneratedColumn("uuid")
    id:string;
    /*  
    @Column()
    index:number;
    */
    @ManyToOne((type) => IEntry, (entry) => entry.imagesDataArray)
    parentEntry: IEntry;

    @Column()
    file: string;

    @Column()
    isVideo: boolean;

    @Column()
    thumbnail_file?: string;

    @Column("simple-json")
    imageSize?: ISize;

}


export function albumDBClass(albumName: string) {
    @Entity({name:albumName})
    class Entry implements IDBEntry {

        @PrimaryColumn() 
        id: string;
        
        @Column()
        indexer: number;
        
        @Column({nullable: true})
        name?: string;

        @Column()
        hasVideo: boolean;

        @OneToMany((type) => Media, (media) => media.parentEntry, {cascade:true,eager:true})
        imagesDataArray: Media[];
        
        @Column({nullable:true,type:"simple-array"})
        alternative_names?: string[];
        
        /* 
        oldImagesDataArray?: IImageDataArray[]; */
        
        @Column()
        album: string;
        
        @Column("simple-array")
        artists?: string[];
        
        @Column()
        storedResult?: string;
        
        @Column("simple-json")
        links?: IPostLinks;
        
        @Column("simple-json")
        ids?: IPostIds;
        
        @Column()
        isHidden: boolean;
        
        @Column()
        isNSFW: boolean;
        
        @Column({nullable:true})
        hasResults?: boolean;
        
        @Column("simple-array")
        tags?: string[];

        @Column()
        date_added?: number;

        @Column()
        date_created?: number;
    }    

    @Entity({name:"Media"})
    class Media implements IImageDataArray {
    
        @PrimaryGeneratedColumn("uuid")
        id:string;
        /*  
        @Column()
        index:number;
        */
        @ManyToOne((type) => Entry, (entry) => entry.imagesDataArray)
        parentEntry: Entry;
    
        @Column()
        file: string;
    
        @Column()
        isVideo: boolean;
    
        @Column()
        thumbnail_file?: string;
    
        @Column("simple-json")
        imageSize?: ISize;
    
    }
    return {Entry,Media}
}

