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
    hasVideo?: boolean;
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

    @Column({nullable: true})
    hasVideo: boolean;

    @OneToMany((type) => IMedia, (media) => media.parentEntry, {cascade:['insert','recover','remove','update',"soft-remove"],eager:true})
    imagesDataArray: IMedia[];
    
    @Column({nullable:true,type:"simple-array"})
    alternative_names?: string[];
    
    /* 
    oldImagesDataArray?: IImageDataArray[]; */
    
    @Column()
    album: string;
    
    @Column({type:"simple-array",nullable:true})
    artists?: string[];
    
    @Column({nullable:true})
    storedResult?: string;
    
    @Column({type:"simple-json",nullable:true})
    links?: IPostLinks;
    
    @Column({type:"simple-json",nullable:true})
    ids?: IPostIds;
    
    @Column()
    isHidden: boolean;
    
    @Column()
    isNSFW: boolean;
    
    @Column({nullable:true})
    hasResults?: boolean;
    
    @Column({type:"simple-array",nullable:true})
    tags?: string[];

    @Column()
    date_added?: number;

    @Column({nullable:true})
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
    @ManyToOne((type) => IEntry, (entry) => entry.imagesDataArray, { onDelete: 'CASCADE' })
    parentEntry: IEntry;

    @Column()
    file: string;

    @Column()
    isVideo: boolean;

    @Column({nullable: true})
    thumbnail_file?: string;

    @Column({nullable: true, type:"simple-json"})
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

        @Column({nullable: true})
        hasVideo: boolean;

        @OneToMany((type) => Media, (media) => media.parentEntry, {cascade:['insert','recover','remove','update',"soft-remove"],eager:true})
        imagesDataArray: Media[];
        
        @Column({nullable:true,type:"simple-array"})
        alternative_names?: string[];
        
        /* 
        oldImagesDataArray?: IImageDataArray[]; */
        
        @Column()
        album: string;
        
        @Column({type:"simple-array",nullable:true})
    artists?: string[];
    
    @Column({nullable:true})
    storedResult?: string;
    
    @Column({type:"simple-json",nullable:true})
    links?: IPostLinks;
    
    @Column({type:"simple-json",nullable:true})
    ids?: IPostIds;
    
    @Column()
    isHidden: boolean;
    
    @Column()
    isNSFW: boolean;
    
    @Column({nullable:true})
    hasResults?: boolean;
    
    @Column({type:"simple-array",nullable:true})
    tags?: string[];

    @Column()
    date_added?: number;

    @Column({nullable:true})
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
        @ManyToOne((type) => Entry, (entry) => entry.imagesDataArray, { onDelete: 'CASCADE',createForeignKeyConstraints:false})
        parentEntry: Entry;
    
        @Column()
        file: string;
    
        @Column()
        isVideo: boolean;
    
        @Column({nullable: true})
        thumbnail_file?: string;
    
        @Column({nullable: true, type:"simple-json"})
        imageSize?: ISize;
    
    }
    return {Entry,Media}
}

