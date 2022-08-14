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

}

export type AlbumSchemaType = "Anime Pic";

export interface ITableOfContents {
    albumCoverImage: string | File;
    name: string;
    uuid: string;
    type: AlbumSchemaType;
    estimatedPicCount: number;
}


export interface IAnimePic extends mongoose.Document {
    id: string;
    file: string;
    alternative_names?: string[];
    old_file?: string;
    thumbnail_file: string;
    album: string;
    tags_pixiv?: string[];
    tags_danbooru?: string[];
    artist?: IArtist;
    links: IPostLinks;
    characters?: string[];
    has_results?: boolean;
    pixiv_post_id?: number;
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

export interface INewAnimePic {
    file?: string;
    url?: string;
    thumbnail_file?: string;
    storedResult?: "danbooru" | "pixiv" | 'yande';
    //parsed from results
    tags?: ITagsObject;
    artist?: IArtist;
    links?: IPostLinks;
    foundUrl?: string;
    imageSize?: ISizeCalculationResult ;
    characters?: string[];
    has_results?: boolean;
    //ids to add 
    pixiv_post_id?: number;
    danbooru_post_id?: number;
    //resulting data from parsing the sites
    data: {
        danbooru?: IDanbooruResponse;
        yande?:IDanbooruResponse;
        pixiv?: IPixivResponse;
    }
}


export interface IPostLinks {
    pixiv?: string;
    danbooru?: string;
    twitter?: string;
    other?: string[];
    discord?: string;
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
    urlsArray?: string[];
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
}
export interface IDanbooruResponse {
    imageUrl: string;
    image_width: number;
    image_height: number;
    createDate: string;
    updateDate: string;
    previewImageUrl: string;
    tags?: IDanbooruTags;
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
export interface ISettings {
    port: number;
    ip: string;
    initialSetup: boolean;
    hostname: string;
    database_url: string;
    saucenao_api_key: string;
    search_diff_sites: boolean;
    pixiv_download_first_image_only: boolean;
}

export type OutgoingHttpHeader = number | string | string[];
export interface OutgoingHttpHeaders extends NodeJS.Dict<OutgoingHttpHeader> {}