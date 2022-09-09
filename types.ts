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

export interface ITableOfContentsMongo extends mongoose.Document {
    albumCoverImage: string;
    name: string;
    estimatedPicCount?: number;
    uuid: string;
    type: AlbumSchemaType;
    isHidden: boolean;

}

export type AlbumSchemaType = "Anime Pic";

export interface ITableOfContents {
    albumCoverImage: string | File;
    name: string;
    uuid: string;
    type: AlbumSchemaType;
    estimatedPicCount: number;
    isHidden: boolean;
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
export interface IImageDataArray  {
    file: string;
    thumbnail_file: string;
    imageSize?: ISizeCalculationResult;
}
export interface IAnimePic extends mongoose.Document {
    id: string;
    indexer: number;
    imagesDataArray: IImageDataArray[];
    alternative_names?: string[];
    oldFile?: string;
    album: string;
    //tags_pixiv?: string[];
    //tags_danbooru?: string[];
    artist?: IArtist;
    storedResult?: string;
    links: IPostLinks;
    ids: IPostIds;
    isHidden: boolean;
    isNSFW: boolean;
    hasResults?: boolean;
    //pixiv_post_id?: number;

    //compatability with INewAnimePic
    tags?: ITagsObject;
    //imageSize?: ISizeCalculationResult;
}


export interface INewAnimePic {
    indexer: number;
    
    imagesDataArray?: IImageDataArray[];
    
    storedResult?: "danbooru" | "pixiv" | 'yande';
    //parsed from results
    urlsArray?: urlsArray[];
    tags?: ITagsObject;
    artist?: {
        artistName: string;
        link: string;
    };
    links?: IPostLinks;
    ids?: IPostIds;
    requestOptions?: IRequestOptions;
    imageSize?: ISizeCalculationResult;
    has_results?: boolean;
    isNSFW?: boolean;
    //resulting data from parsing the sites
    data: {
        danbooru?: IDanbooruResponse;
        yande?:IDanbooruResponse;
        pixiv?: IPixivResponse;
    }

    //for mongo compatablity 
    id?: string;
    album?: string;
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
    createDate: string;
    rating: string;
    isNsfw: boolean;
    updateDate: string;
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