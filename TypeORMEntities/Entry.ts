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


export interface IMediaItem  {
    file: string;
    thumbnailFile?: string;
    isVideo: boolean;
    alternative_names?: string[];
    imageSize?: ISizeCalculationResult;
    index: number;
	tags?: string[];
	artists?: string[];
	isNSFW?: boolean;
	links?: IPostLinks;
	ids?: IPostIds;
	date_created?: number;
	text?: string;
}

export interface IOldMedia  {
    file: string;
    isVideo: boolean;
    thumbnailFile?: string;
    imageSize?: ISizeCalculationResult;
}

export interface IDBEntry {
    id: string;
    indexer: number;
    //name?: string;
    //hasVideo?: boolean;
    media: IMediaItem[];
    thumbnailFile: string;
    //alternative_names?: string[];
    oldMedia?: IOldMedia[];
    album: string;
    //tags_pixiv?: string[];
    //tags_danbooru?: string[];
    //artists?: string[];
    //storedResult?: string;
    //links?: IPostLinks;
    //ids?: IPostIds;
    isHidden: boolean;
    hasNSFW: boolean;
    //hasResults?: boolean;
    //pixiv_post_id?: number;

    //compatability with INewAnimePic
    //tags?: string[];
    date_added?: number;
    //date_created?: number;
    //imageSize?: ISizeCalculationResult;
}

export interface IPostIds {
    [hostname:string]: string;
}

export interface IPostLinks {
    [hostname:string]: string;
}
@Entity({name:"Entry"})
export class Entry implements IDBEntry {

    @PrimaryColumn() 
    id: string;
    
    @Column()
    indexer: number;
    
    @Column({nullable: true})
    name?: string;

    @Column({nullable: true})
    hasVideo: boolean;

    @OneToMany((type) => IMedia, (media) => media.parentEntry, {cascade: true ,eager:true, createForeignKeyConstraints:false})
    media: IMedia[];
    
    @Column()
    thumbnailFile: string;

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
    hasNSFW: boolean;
    
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
export class IMedia implements IMediaItem {
    
    @PrimaryGeneratedColumn("uuid")
    id:string;
    /*  
    @Column()
    index:number;
    */
    @ManyToOne((type) => Entry, (entry) => entry.media, { onDelete: 'CASCADE' ,createForeignKeyConstraints:false})
    parentEntry: Entry;

    @Column()
    file: string;
    
    @Column({nullable: true})
    thumbnailFile?: string;

    @Column()
    isVideo: boolean;

    @Column({type:"simple-array", nullable: true})
    alternative_names: string[];

    @Column({nullable: true, type:"simple-json"})
    imageSize?: ISize;

    @Column()
    index: number;

    @Column({nullable:true, type:"simple-array"})
	tags?: string[];

    @Column({nullable:true, type:"simple-array"})
	artists?: string[];

    @Column({nullable:true})
	isNSFW?: boolean;

    @Column({nullable:true, type:"simple-json"})
	links?: {[hostName:string]: string};

    @Column({nullable:true, type:"simple-json"})
	ids?: {[platfrom:string]: string};

    @Column({nullable:true})
	date_created?: number;

    @Column({nullable:true})
	text?: string;

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

        @OneToMany((type) => Media, (media) => media.parentEntry, {cascade:true ,eager:true, createForeignKeyConstraints:false})
        media: Media[];
        
        @Column()
        thumbnailFile: string;

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
        hasNSFW: boolean;
        
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
    class Media implements IMediaItem {
    
        @PrimaryGeneratedColumn("uuid")
        id:string;
        /*  
        @Column()
        index:number;
        */
        @ManyToOne((type) => Entry, (entry) => entry.media, { onDelete: 'CASCADE' , createForeignKeyConstraints:false})
        parentEntry: Entry;
    
        @Column()
        file: string;
        
        @Column({nullable: true})
        thumbnailFile?: string;
    
        @Column()
        isVideo: boolean;
    
        @Column({type:"simple-array", nullable: true})
        alternative_names: string[];
    
        @Column({nullable: true, type:"simple-json"})
        imageSize?: ISize;
    
        @Column()
        index: number;
    
        @Column({nullable:true, type:"simple-array"})
        tags?: string[];
    
        @Column({nullable:true, type:"simple-array"})
        artists?: string[];
    
        @Column({nullable:true})
        isNSFW?: boolean;
    
        @Column({nullable:true, type:"simple-json"})
        links?: {[hostName:string]: string};
    
        @Column({nullable:true, type:"simple-json"})
        ids?: {[platfrom:string]: string};
    
        @Column({nullable:true})
        date_created?: number;
    
        @Column({nullable:true})
        text?: string;
    
    }
    
    return {Entry,Media}
}

