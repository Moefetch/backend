import mongoose from "mongoose";
import Utility from './src/Utility'

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

export type AlbumSchemaType = string;

export interface IAlbumDictionaryItem {
    id?: string;
    albumCoverImage: string | File;
    name: string;
    uuid: string;
    type: AlbumSchemaType;
    estimatedPicCount: number;
    isHidden: boolean;
}

export interface ITagEntry {
    _id: string;
    tag: string;
}
export interface ITagEntryMongo extends mongoose.Document {
    _id: string;
    tag: string;
}


export interface IFilterObj {
    nameIncludes?: string;
    artists?: string[];
    tags?: string[];
    showHidden?: boolean;
    showNSFW?: boolean;
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

export interface IMongoDBEntry extends mongoose.Document {
    id: string;
    indexer: number;
    hasVideo: boolean;

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
/* 
export interface IModelSpecialParam {
    name: string; //name of setting . variable
    value: boolean | string; // default value or something 
    supportedHostName:string; 
    description: string; 
}
 */
/* export interface IParam {
    containsString: boolean;
    checkBoxValue: boolean;
    checkBoxDescription: string;
    errorMessage?: string;
    textField?: {
        value: string,
        fieldPlaceholder: string,
    }
};
 */

export interface IReqFile {
    fieldname: string
    originalname: string
    encoding: string
    mimetype: string
    destination: string
    filename: string
    path: string
    size: number
  }

  
export interface IParam {
    category?: string; //if undefined it's a global setting for all categories
    hostname?: string; //if undefined it's a category specific setting
    type: string; //cookie, setting, default parameter etc, use case would to to group settings later
    valueType: "checkBox" | "textField" | "both"
    useTextArea?: boolean;
    checkBox?: {
        checkBoxValue: boolean;
        checkBoxDescription: string;
        defaultValue: boolean;
    }
    textField?: {
        value: string;
        fieldPlaceholder: string;
        defaultValue: string;
    }
    errorMessage?: string;
}

export interface IParamValidityCheck {
    indexer: string[];
    checkValid: (
        enabledBool: boolean,
        stringValue?: string
      ) => string | Promise<string | undefined> | undefined;
}

export interface IModelSpecialParam {
    [name:string]: IParam
}
export interface IProcessDictionary {
        [category: string]: { //undefined is for wildcard functions, gets access to other processing functions within same category
            [hostname: string]: undefined | ((inputUrl: string, album: string, optionalOverrideParams: IModelSpecialParam, stockOptionalOverrides: IPicFormStockOverrides) => Promise<INewPicture | undefined>);
            undefined?: (inputUrl: string | Express.Multer.File, album: string, optionalOverrideParams: IModelSpecialParam, stockOptionalOverrides: IPicFormStockOverrides, processDictionary?: IProcessDictionary[string]) => Promise<INewPicture | undefined>;
        }
    }

export interface ILogicModels {
    processDictionary: IProcessDictionary
    newEntryParams?: IModelSpecialParam;
    specialSettings?: IModelSpecialParam;
    specialSettingValidityCheckArray?: IParamValidityCheck[];
}
export interface ILogicModel {
    supportedHostName:string;
    category: string;
    process: (inputUrl: string, album: string, optionalOverrideParams: ILogicCategorySpecialParamsDictionary, stockOptionalOverrides: IPicFormStockOverrides) => Promise<INewPicture>;
    newEntryParams?: IModelSpecialParam;
    specialSettings?: IModelSpecialParam;
    specialSettingValidityCheckArray?: IParamValidityCheck[];
}

export interface IModelDictionary {
    [key:string]: ILogicModel['process'];
}

export interface ILogicSpecialSettingsDictionary {
    [logicCategory: string]: ILogicCategorySpecialSettingsDictionary
}
export interface ILogicSpecialParamsDictionary {
    [logicCategory: string]: ILogicCategorySpecialParamsDictionary
}

export interface ICategoryDictionary {
    [key:string]: ILogicCategory['ProcessInput']
}

export interface ILogicModelConstructor {
    default: {new (settings: ISettings):ILogicModel}
}
export interface ILogicCategorySpecialParamsDictionary {
    specialCategoryParams?: IModelSpecialParam;
    specialHostnameSpecificParams?: {
        [hostname: string]: IModelSpecialParam;
    }
}

export interface ILogicCategorySpecialSettingsDictionary {
    specialCategorySettings?: IModelSpecialParam;
    specialHostnameSpecificSettings?: {
        [hostname: string]: IModelSpecialParam;
    }
}
export interface IPicFormStockOverrides {
    thumbnailFile: IParam;
    compileAllLinksIntoOneEntry: IParam;
    addId: IParam;
    addTags: IParam;
    useProvidedFileName: IParam;
}

export interface ILogicCategory {
    logicCategory: string;
    categoryFolder?: string;
    processDictionary: IModelDictionary;
    specialParamsDictionary?: IModelSpecialParam;
    specialSettingsDictionary?: IModelSpecialParam;
    specialSettingValidityCheck?: IParamValidityCheck[];
    ProcessInput: (input: string | File, album: string, optionalOverrideParams: ILogicCategorySpecialParamsDictionary, stockOptionalOverrides: IPicFormStockOverrides) => Promise<INewPicture | undefined>

}

export interface INewPic {
    files?: string[];
    old_file?: string;
    thumbnail_file?: string;
    url: string;
    optionalOverrideParams?: IModelSpecialParam;
    stockOptionalOverrides?: IPicFormStockOverrides;
    has_results?: boolean;
    type: AlbumSchemaType;
    album: string;
    isHidden?: boolean;
  }
  

export interface INewPicture {
    //for mongo compatablity 
    id?: string;
    indexer: number;
    imagesDataArray: IImageDataArray[];
    
    hasVideo?: boolean;
    album?: string;
    
    
    artists?: string[];
    storedResult?: string;
    links?: any;
    ids?: any;
    //parsed from results
    isNSFW?: boolean;
    has_results?: boolean;
    
    thumbnailURL?: string;
    thumbnailFile?: string;
    
    tags?: string[];
    date_added?: number;
    date_created?: number;
    //doesnt exist in end result
    urlsArray?: IUrlsArray[];
    requestOptions?: IRequestOptions;
    imageSize?: ISizeCalculationResult;

    //resulting data from parsing the sites
    data: any;
    isMultiSource?: boolean;
}

export interface INewAnimePic {
    //for mongo compatablity 
    id?: string;
    indexer: number;

    imagesDataArray: IImageDataArray[];

    
    
    album?: string;
    
    
    artists?: string[];
    storedResult?: "danbooru" | "pixiv" | 'yande' | 'line';
    links?: IPostLinks;
    ids?: IPostIds;
    //parsed from results
    isNSFW?: boolean;
    has_results?: boolean;
    
    thumbnailURL?: string;
    thumbnailFile?: string;
    
    tags?: string[];
    date_added?: number;
    date_created?: number;
    //doesnt exist in end result
    urlsArray?: IUrlsArray[];
    requestOptions?: IRequestOptions;
    imageSize?: ISizeCalculationResult;

    //resulting data from parsing the sites
    data: {
        danbooru?: IDanbooruResponse;
        yande?:IDanbooruResponse;
        pixiv?: IPixivResponse;
        line?: ILinePageResponse;
    }
    
}

export interface IUrlsArray {
    imageUrl: string;
    isVideo: boolean;
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
    line?: number;
}

export interface IPostLinks {
    pixiv?: string;
    danbooru?: string;
    yande?:string;
    twitter?: string;
    line?: string;
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
    hasError: boolean;  
    responseSettings: IResponseSettings;
}

export interface IResponseSettings {
    legacyMongoDB: IParam;
    stock_settings: ISettings['stock_settings'];
    special_settings: ISettings['special_settings'];
    special_params: ISettings['special_params'];
}

export interface IInstagramQueryResponse {
    id: string;
    shortcode: string;
    dimensions: {
        width: number;
        height: number;
    };
    video_url: string;
    is_video?: boolean;
    owner: IInstagramResponse_owner;
    edge_sidecar_to_children?: IInstagramResponse_edge_sidecar_to_children;
    edge_media_to_caption: {
        edges:{
            node: {
                created_at: number;
                text: string;
            };
        }[];
    };
    display_resources: {
        src: string;
        config_width : number;
        config_height : number;
    }[];
    thumbnail_src?: string;
    display_url?: string;

}
export interface IInstagramResponse_owner {
    id: string;
    username: string;
    full_name: string;
    
}
export interface IInstagramResponse_edge_sidecar_to_children {
    edges: IInstagramResponse_edges[]
    
}
export interface IInstagramResponse_edges {
    node: {
        is_video : boolean;
        video_url?: string;
        display_url?: string;
        dimensions: {
            width: number;
            height: number;
        };
        display_resources: {
            src: string;
            config_width: number;
            config_height: number;
        }[]
    }
}

export interface IInstagramCookieOBJ {
    csrf_token: string;
    datr: string;
    ig_did: string;
    ig_nrcb: string;
    mid: string;
    app_id: string;
    ASBD_ID: string;
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
    isVideo: boolean;
    isNsfw: boolean;
    updateDate: number;
    previewImageUrl: string;
    tags?: IDanbooruTags;
    requestOptions?: IRequestOptions

}

export interface ILinePageResponse {
    previewImageUrl: string;
    postTitle: string;
    authorId: string;
    authorName: string;
    urlsArray: string[];
    requestOptions?: IRequestOptions
}

export interface IYandeTags extends IDanbooruTags {}

export interface IDanbooruTags {
    artists?: string[];
    copyrights?: string[];
    characters?: string[];
    general?: string[];
    meta?: string[];
}
export interface IPixivTag {
    tag: string;
    romaji?: string;
    enTranslation?: string;
}
import type {ISetting} from "./settings";
import { ReadStream } from "fs";
export type ISettings = ISetting;

export type OutgoingHttpHeader = number | string | string[];
export interface OutgoingHttpHeaders extends NodeJS.Dict<OutgoingHttpHeader> {}