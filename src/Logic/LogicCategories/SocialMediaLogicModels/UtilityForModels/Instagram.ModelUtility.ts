import cheerio from "cheerio";

import Utility from "../../../../Utility";
import { IInstagramCookieOBJ, IInstagramQueryResponse, ILinePageResponse, ILogicCategorySpecialParamsDictionary, IModelSpecialParam, INewPicture, IPicFormStockOverrides, IPostIds, IPostLinks, IRequestOptions, ISettings, ITagsObject } from "types";

export class InstagramModelUtility {
  public settings: ISettings;
  public utility: Utility;
  constructor(settings: ISettings, utility: Utility) {
      this.settings = settings;
      this.utility = utility;
      const defaultInstagramQueryHash = "b3055c01b4b222b8a47dc12b090e4e64";
      if (settings.special_settings && settings.special_settings["Social Media"] && settings.special_settings["Social Media"].specialCategorySettings && settings.special_settings["Social Media"].specialCategorySettings.pixiv_cookie) 
        this.instagramQueryHash = settings.special_settings["Social Media"].specialCategorySettings.pixiv_cookie.stringValue?.value ?? defaultInstagramQueryHash;
      else this.instagramQueryHash = defaultInstagramQueryHash
    this.getInstagramCookies().then(c => this.instagramCookie = c);
    
  }

  public instagramQueryHash: string;
  public instagramCookie: string = "";
  public instagramCookieOBJ: IInstagramCookieOBJ = {
    app_id: '',
    csrf_token: '',
    device_id: '',
    ASBD_ID: '',
  }
  public specialSettingsParam:IModelSpecialParam = {
    "instagram_query_hash" : {
      containsString: true,
      checkBoxValue: false,
      checkBoxDescription: "add an Instagram query hash in case they change default",
      stringValue: {
        value: "",
        stringPlaceholder: "instagram query hash (for the option above)"
      }
    }
  };
  
  
/**
 * processLineStickerPage
 */

public async processInstagramPost(inputUrl: string, album: string, optionalOverrideParams: ILogicCategorySpecialParamsDictionary, stockOptionalOverrides: IPicFormStockOverrides) {
  const instaPageData = await this.getInstagramPostData(inputUrl);
  if (instaPageData) {
    let resultantData: INewPicture = {
    data: {},
    isNSFW: false,
    indexer: 0,
    tags: [],
    imagesDataArray: []
  };
  //here im attempting to differenciate between single imape/video post and mutli image posts, bigger sample size needed to test  
  if (instaPageData.edge_sidecar_to_children) resultantData.urlsArray = instaPageData.edge_sidecar_to_children.edges.map(edge => ({
    imageUrl: edge.node.video_url ?? edge.node.display_resources[edge.node.display_resources.length - 1].src,
    isVideo: edge.node.is_video,
    height: edge.node.display_resources[edge.node.display_resources.length - 1].config_height,
    width: edge.node.display_resources[edge.node.display_resources.length - 1].config_width,
    thumbnailUrl: edge.node?.display_resources[0]?.src ?? edge.node.display_url,
  }))
  const instaURL_REGEX = new RegExp(String.raw `/.*/(?<fileName>.*)\.(?<fileExtension>.*)\?`)

  let providedFileNames: string[] | undefined = [];
  let providedFileExtensions: string[] | undefined = [];

  resultantData.urlsArray?.map((url, i) => {
    const regexRes = url.imageUrl.match(instaURL_REGEX)?.groups
    if (regexRes && providedFileExtensions && providedFileNames) {
      providedFileExtensions[i] = regexRes.fileExtension;
      providedFileNames[i] = regexRes.fileName;
    }
  })
  if (!providedFileNames.length) providedFileNames = undefined;
  if (!providedFileExtensions.length) providedFileExtensions = undefined;
  const res = await this.utility.downloadAndGetFilePaths(resultantData, 
    album, 
    this.settings.downloadFolder, 
    {providedFileNames: stockOptionalOverrides.useProvidedFileName.stringValue?.value.split('\n') ?? providedFileNames,
  providedFileExtensions: providedFileExtensions})
  if ( res ) resultantData.imagesDataArray = res;

  else if (instaPageData.is_video && instaPageData.video_url) resultantData.urlsArray = [ {
    imageUrl: instaPageData.video_url,
    isVideo: true,
    thumbnailUrl: instaPageData.thumbnail_src ?? instaPageData.display_url ?? instaPageData.video_url,
    height: instaPageData.dimensions.height,
    width: instaPageData.dimensions.width,
  }]

  resultantData.data.instagram = instaPageData
  resultantData.links = {instagram: inputUrl}
  resultantData.storedResult = 'instagram'
  resultantData.artists = [instaPageData.owner.username]
  resultantData.ids = {instagram: instaPageData.shortcode};
    
  resultantData.thumbnailURL = instaPageData.thumbnail_src ?? instaPageData.display_url ?? instaPageData.edge_sidecar_to_children?.edges[0].node.display_resources[0].src ?? instaPageData.edge_sidecar_to_children?.edges[0].node.display_url;

  return resultantData
  }
  else return { data: {}, indexer: 0, imagesDataArray: []}
}

/**
 * getInstagramPostData
 */
public async getInstagramPostData(inputUrl: string) {
  const SHORTCODE_REGEX = new RegExp(String.raw `www.instagram.com\/.*\/(?<shortCode>\w+)`)
  const postShortCode = inputUrl.match(SHORTCODE_REGEX)?.groups
  
  if (postShortCode && postShortCode.shortCode) {
    

    let headersObj: RequestInit = {
      credentials: "include",
      headers: new Headers({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "X-CSRFToken": this.instagramCookieOBJ.csrf_token,
        "X-IG-App-ID": this.instagramCookieOBJ.app_id,
        "X-ASBD-ID": this.instagramCookieOBJ.ASBD_ID,
        "X-IG-WWW-Claim": "0",
        "referrer": inputUrl,
        "Cookie": this.instagramCookie,
        "X-Requested-With": "XMLHttpRequest",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "Sec-GPC": "1"
      }),
      referrer: inputUrl,
      method: "GET",
      mode: "cors",
    };
    
    const response = await this.utility.request(
      `https://www.instagram.com/graphql/query/?query_hash=${this.instagramQueryHash}&variables=%7B%22shortcode%22%3A%22${postShortCode.shortCode}%22%2C%22child_comment_count%22%3A3%2C%22fetch_comment_count%22%3A40%2C%22parent_comment_count%22%3A24%2C%22has_threaded_comments%22%3Atrue%7D`,
      "GET",
      {providedHeaders: headersObj}
    );      
  
    const responseText = await response.text()
    
    try {
      const dataJson = JSON.parse(responseText);
      if (dataJson.status == "ok") {
        
        return {
          id: dataJson.data.shortcode_media.id,
          shortcode: dataJson.data.shortcode_media.shortcode,
          is_video: dataJson.data.shortcode_media.is_video,
          video_url: dataJson.data.shortcode_media.video_url,
          thumbnail_src: dataJson.data.shortcode_media.thumbnail_src,
          dimensions: dataJson.data.shortcode_media.dimensions,
          edge_sidecar_to_children: dataJson.data.shortcode_media.edge_sidecar_to_children,
          owner: dataJson.data.shortcode_media.owner,
          edge_media_to_caption: dataJson.data.shortcode_media.edge_media_to_caption,
        } as IInstagramQueryResponse
        //console.log(responseText);
      }
      
    } catch (error) {
      console.log("error parsing instagram sticker page link : ", inputUrl);
      console.log('error : ', error)
      
    }

  }  

  }

  
  public async getInstagramCookies() {
    let ASBD_ID = '129477'
    try {
    const response_1 = (await this.utility.request(
      'https://www.instagram.com/',
      "GET"
    ))
    const $ = cheerio.load(await response_1.text())
    const asbdScriptUrl = $($('link[rel="preload"]').toArray()[3]).attr()?.href
      
    if (asbdScriptUrl) {
        const asbdReq = (await this.utility.request(
          asbdScriptUrl,
          "GET"
          ).then(res => res.text()))
          ASBD_ID = asbdReq.substring(asbdReq.indexOf('__d("BDHeaderConfig",[],(function(a,b,c,d,e,f){"use strict";a="') + 63)
          ASBD_ID = ASBD_ID.substring(0, ASBD_ID.indexOf('"'))
        }
    
    const mainDataFromScript = $($('body').children().toArray()[17]).text() //starts with requireLazy(["JSScheduler","ServerJS","ScheduledApplyEach"]
    let datrHeaderScriptTextContent = $($('body').children().toArray()[31]).text() // starts with requireLazy(["HasteSupportData"]
    
    const dataJson = JSON.parse(mainDataFromScript.substring(mainDataFromScript.lastIndexOf("{\"define\":"), mainDataFromScript.indexOf('})') + 1));
    datrHeaderScriptTextContent = datrHeaderScriptTextContent.substring(datrHeaderScriptTextContent.lastIndexOf("{\"define\":"))
    datrHeaderScriptTextContent = datrHeaderScriptTextContent.substring(0, datrHeaderScriptTextContent.indexOf('})') + 1);
    
    const dataJson2 = JSON.parse(datrHeaderScriptTextContent);
  
    let datr = ''
    let csrfRaw:any = "";
    //const XIGSharedDataIndex = 64;
    const AnalyticsCoreDataIndex = 60;
    const datrElement = dataJson2['require'].filter( (a: any) => a[0] == "CometPlatformRootClient")[0]
    const XIGSharedDataElement = dataJson['define'].filter( (a: any) => a[0] == "XIGSharedData")[0]
    try {
      
      csrfRaw = JSON.parse(XIGSharedDataElement[2]["raw"]);  
      datr = datrElement[3][1]["deferredCookies"]['_js_datr']["value"]
    
    } catch (error) {
      setTimeout(() => {
       // this.getInstagramCookies().then(c => this.instagramCookie = c);
        
      }, 300);
    }

    const device_id = XIGSharedDataElement[2]["native"]["device_id"]
    const analyticsCoreDataElement = dataJson['define'].filter( (a: any) => a[0] == "AnalyticsCoreData")[0]
    
    const app_id = analyticsCoreDataElement[2]["app_id"];
    const csrf_token = csrfRaw['config']["csrf_token"];
    
    const headers = new Headers(this.utility.defaultHeaders);
    headers.set("X-CSRFToken", csrf_token);
    headers.set("X-IG-App-ID", app_id);
    headers.set("X-ASBD-ID", ASBD_ID);
    headers.set("X-IG-WWW-Claim", "0");
    headers.set("X-Web-Device-Id", device_id);
    headers.set("X-Requested-With", "XMLHttpRequest");
  
    const response_2 = (await this.utility.request(
      'https://www.instagram.com/api/v1/public/landing_info/',
      "GET",
      {providedHeaders:{
        headers: headers,
        referrer: "https://www.instagram.com/",
        mode: "cors",
        method: "GET"
      }}
    ))
      
    const COOKIES_REGEX = new RegExp(String.raw `csrftoken\=(?<csrftoken>.*?)\; .*? mid\=(?<mid>.*?)\; .*? ig\_did\=(?<ig_did>.*?)\; .*? ig\_nrcb\=(?<ig_nrcb>.*?)\;`)
    const cookiesStr = response_2.headers.get('set-cookie')
      
    this.instagramCookieOBJ.app_id = app_id;
    this.instagramCookieOBJ.csrf_token = csrf_token;
    this.instagramCookieOBJ.device_id = device_id;
    this.instagramCookieOBJ.ASBD_ID = ASBD_ID;

    if (cookiesStr) {
      const cookiesObj = cookiesStr.match(COOKIES_REGEX)?.groups;
      const cookies = `csrftoken=${cookiesObj?.csrftoken}; mid=${cookiesObj?.mid}; ig_did=${cookiesObj?.ig_did}; ig_nrcb=${cookiesObj?.ig_nrcb}; datr=${datr}`;
      
      return cookies;
    }
  } catch (error) {
      console.log('error creating an instagram cookie? please contact dev if error presists, error: ', error);
      setTimeout(() => {
        //this.getInstagramCookies().then(c => this.instagramCookie = c);
        
      }, 300);
    }      

    return ''
  }
     
}
