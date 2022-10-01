import mongoose from "mongoose";

export interface ISaucenaoResData{

    ext_urls:string[];      //pixiv result index_id 5 or 51
    title: string;
    pixiv_id?: number;
    member_name?:string;
    member_id?:number;

    bcy_id?:number;     //if bcy type result
    member_link_id?: number;
    bcy_type?:string;

    danbooru_id?:number;        //result booru and sankakucomplex index_id 9 
    gelbooru_id?:number;
    sankaku_id?:number;
    creator?:string | string[];
    material?:string;
    characters?:string;
    source?:string;

    eng_name?:string;       //other useless shit
    jp_name?:string;
}

export interface ISaucenaoResultObj {
    inputType: 'url' | 'file' | 'readable stream' | 'buffer';
    resultArray: ISaucenaoResult[]
}
export interface ISaucenaoResult {
    header: {
        similarity: string;
        thumbnail :string;
        index_id: number;
        index_name: string;
        dupes: number;
    };
    data: ISaucenaoResData;

}

export interface IFilteredSaucenaoResult  {
    reqItem?: ISaucenaoResult;
    animePic?: INewAnimePic;
    imageSize?: ISizeCalculationResult;
}

export interface IAlbumDictionaryItemMongo extends mongoose.Document {
    albumCoverImage: string;
    name: string;
    estimatedPicCount?: number;
    uuid: string;
    type: AlbumSchemaType;
    isHidden: boolean;

}

export type AlbumSchemaType = "Anime Pic";

export interface IAlbumDictionaryItem {
    _id?: string;
    albumCoverImage: string | File;
    name: string;
    uuid: string;
    type: AlbumSchemaType;
    estimatedPicCount: number;
    isHidden: boolean;
}

export interface IFilterObj {
    nameIncludes?: string;
    artists?: string[];
    tags?: string[];
    showHidden?: boolean;
    showNSFW?: boolean;
}

export interface INewPic {
    file?: string;
    url?: string;
    old_file?: string;
    thumbnail_file?: string;
    has_results?: boolean;
    type?: AlbumSchemaType;
}

export interface ITagsObject {
    pixiv?: IPixivTag[];
    danbooru?: IDanbooruTags;
    yande?: IYandeTags;
}

export interface IPixivTags {
    tags: string[];
    raw: IPixivTag[];
}
export interface IImageDataArray  {
    file: string;
    thumbnail_file: string;
    imageSize?: ISizeCalculationResult;
}
export interface IDBEntry {
    id: string;
    indexer: number;
    name?: string;
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

export interface IMongoDBEntry extends mongoose.Document {
    id: string;
    indexer: number;
    name?: string;
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


export interface INewAnimePic {
    //for mongo compatablity 
    id?: string;
    indexer: number;

    imagesDataArray: IImageDataArray[];
    
    
    album?: string;
    
    
    artists?: string[];
    storedResult?: "danbooru" | "pixiv" | 'yande';
    links?: IPostLinks;
    ids?: IPostIds;
    //parsed from results
    isNSFW?: boolean;
    has_results?: boolean;
    
    
    
    tags?: string[];
    date_added?: number;
    date_created?: number;
    //doesnt exist in end result
    urlsArray?: urlsArray[];
    requestOptions?: IRequestOptions;
    imageSize?: ISizeCalculationResult;

    //resulting data from parsing the sites
    data: {
        danbooru?: IDanbooruResponse;
        yande?:IDanbooruResponse;
        pixiv?: IPixivResponse;
    }
}

interface urlsArray {
    imageUrl: string;
    thumbnailUrl: string;
    width: number;
    height: number;
}

export interface IRequestOptions {
    referrer?: string;
    altUsed?: string;
    providedHeaders?: RequestInit;
}
export interface IPostIds {
    danbooru?: number;
    yande?: number;
    pixiv?: number;
}

export interface IPostLinks {
    pixiv?: string;
    danbooru?: string;
    yande?:string;
    twitter?: string;
    other?: string[];
}

export interface IArtist {
    pixiv?: {
        userId: string;
        userName: string; //japanese name i think
        userAccount: string; //english name usually
    };
    danbooru?: {

    }
}

export interface ISize {
    width: number | undefined;
    height: number | undefined;
    orientation?: number;
    type?: string;
}
export interface ISizeCalculationResult extends ISize {
    images?: ISize[];
}

export interface IImageProps {
    imageSize: ISizeCalculationResult;
    protocol: "http:" | "https:" | "local File";
}

export interface IErrorObject {
    backendUrlError: string;  
    databaseUrlError: string; 
    saucenaoApiKeyError: string
}



export interface IPixivResponse {
    originalImageUrl: string;
    //urlsArray?: string[];
    previewImageUrl: string;
    tags?: IPixivTag[];
    illustId: number;
    illustTitle: string;
    createDate: string;
    uploadDate: string;
    authorId: string;
    authorName: string;
    illustType: number;
    width: number;
    height: number;
    arrayIndexer?: number;
    urlsArrayBody: pixivUrlsArrayElement[];
    requestOptions?: IRequestOptions
}
interface pixivUrlsArrayElement {
    urls: {
        thumb_mini?: string;
        small: string;
        regular?: string;
        original: string;
    }
    width: number;
    height: number;
}
export interface IDanbooruResponse {
    id: number;
    imageUrl: string;
    image_width: number;
    image_height: number;
    createDate: number;
    rating: string;
    isNsfw: boolean;
    updateDate: number;
    previewImageUrl: string;
    tags?: IDanbooruTags;
    requestOptions?: IRequestOptions

}

export interface IYandeTags extends IDanbooruTags {}

export interface IDanbooruTags {
    artists?: string[];
    copyrights?: string[];
    characters?: string[];
    general?: string[];
}
export interface IPixivTag {
    tag: string;
    romaji?: string;
    enTranslation?: string;
}
import type {ISetting} from "settings";
export type ISettings = ISetting;

export type OutgoingHttpHeader = number | string | string[];
export interface OutgoingHttpHeaders extends NodeJS.Dict<OutgoingHttpHeader> {}