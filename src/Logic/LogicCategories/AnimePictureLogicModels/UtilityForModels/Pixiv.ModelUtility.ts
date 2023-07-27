import Utility from "src/Utility";
import { IModelSpecialParam, INewAnimePic, IPixivResponse, IPixivTag, IRequestOptions, ISettings, ILogicCategorySpecialParamsDictionary } from "types";

export class PixivModelUtility {

  public specialSettingsParam:IModelSpecialParam = {
    "pixiv_cookie" : {
      type: "setting",
      category: "Anime Picture",
      valueType: "both",
      checkBox : {
        checkBoxValue: false,
        checkBoxDescription: "use a pixiv logged in cookie to access NSFW works",
        defaultValue: false,
      },
      textField: {
        value: "",
        fieldPlaceholder: "Pixiv logged in cookie (for the option above)",
        defaultValue: "",
      }
    }
  };
  
  /**
   * processPixivId
   * @param id post id
   */
    public async processPixivId(id: string, dlFirstOnly: boolean, arrayIndexer?: number) {
      let resultantData: INewAnimePic = {
        data: {},
        isNSFW: false,
        indexer: arrayIndexer ?? 0,
        tags: [],
        imagesDataArray: []
      };
      const pixivPostData = await this.getPixivImageData(id, arrayIndexer);
      if (pixivPostData?.illustType == 2) {
        //process video
      } else 
        if (pixivPostData){
          
          resultantData.urlsArray =  pixivPostData.urlsArrayBody.map(a => ({
            imageUrl: a.urls.original,
            isVideo: false,
            thumbnailUrl: a.urls.small,
            height: a.height,
            width: a.width,
          }))
          resultantData.thumbnailURL = resultantData.urlsArray[arrayIndexer ?? 0].thumbnailUrl;
          resultantData.urlsArray = dlFirstOnly ? [resultantData.urlsArray[arrayIndexer ?? 0]] : resultantData.urlsArray;
          resultantData.data.pixiv = pixivPostData;
          resultantData.links = {pixiv: `https://www.pixiv.net/en/artworks/${id}`};
          resultantData.imageSize = {
            width: pixivPostData.width,
            height: pixivPostData.height }
          resultantData.requestOptions = pixivPostData.requestOptions;
          resultantData.storedResult ="pixiv"
          resultantData.artists = [pixivPostData.authorName]
          resultantData.ids = {pixiv: pixivPostData.illustId}
          resultantData.tags = pixivPostData.tags?.map((a: IPixivTag) => (a.enTranslation || a.romaji || a.tag))
          if (resultantData.tags && resultantData.tags[0] == 'manga') resultantData.tags.splice(0, 1)
          if (pixivPostData.tags && pixivPostData.tags[0].tag == "R-18") resultantData.isNSFW = true;
          resultantData.indexer = dlFirstOnly ? 0 : resultantData.indexer
          return resultantData;
        }
    }
    
    public  checkPixivImageUrlValid(inputUrl: string) {
      const headersObj: RequestInit = {
    
            "credentials" : "omit",
            "headers" :
            {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0",
              "Accept": "image/avif,image/webp,*/*",
              "Accept-Language": "en-US,en;q=0.5",
              "Sec-Fetch-Dest": "image",
              "Sec-Fetch-Mode": "no-cors",
              "Sec-Fetch-Site": "cross-site",
              "Sec-GPC": "1",
              "Pragma": "no-cache",
              "Cache-Control": "no-cache",
              "referer" : "https://www.pixiv.net/"
          },
            "referrer" : "https://www.pixiv.net/",
            "method" : "GET",
            "mode" : "cors"
          
          }
    
          return this.utility.checkImageUrlValid(inputUrl, {providedHeaders: headersObj})
    }
  
      /**
     * gets pixiv original image url and image tags
     * @param id pixiv post id to get data of
     */
  
    public async getPixivImageData(id: number | string, arrayIndexer?: number) {
    
        const cookies = this.pixivCookie;

        let headersObj: RequestInit = {
          credentials: "include",
          headers: this.utility.defaultHeaders,
          referrer: `https://www.pixiv.net/en/artworks/${id}`,
          method: "GET",
          mode: "cors",
        };
        let providedDownloadHeaders: IRequestOptions = {
          providedHeaders: headersObj = {
          "credentials": "omit",
          "headers": {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0",
              "Accept": "image/avif,image/webp,*/*",
              "Accept-Language": "en-US,en;q=0.5",
              "Sec-Fetch-Dest": "image",
              "Sec-Fetch-Mode": "no-cors",
              "Sec-Fetch-Site": "cross-site",
              "Sec-GPC": "1",
              "Pragma": "no-cache",
              "Cache-Control": "no-cache",
              cookie: cookies,
              "referer" : "https://www.pixiv.net/"
            },
          "referrer": "https://www.pixiv.net/",
          "method": "GET",
          "mode": "cors"
        }}
        const response = await this.utility.request(
          `https://www.pixiv.net/ajax/illust/${id}?lang=en`,
          "GET",
          {providedHeaders: headersObj}  
        );
        
        const responseJson = await response.json()
        if (responseJson.error) return undefined;
        try {
          const json = responseJson.body;
          // let urlsArray: string[] | undefined = undefined;
          let urlsArrayBody: [] | undefined = undefined;
          let altThumbnail: string | undefined = undefined;
                
          if (json.pageCount && (json.pageCount > 1)) {
        headersObj.referrer = `https://www.pixiv.net/ajax/illust/${id}/pages?lang=en`;
            const response2 = await this.utility.request(
              `https://www.pixiv.net/ajax/illust/${id}/pages?lang=en`,
              "GET",
              {providedHeaders: headersObj}
            );
            const json2 = await response2.json()
            /* urlsArray = json2.body.map(
              (a: any) => a.urls.original
            ); */
            urlsArrayBody = json2.body
            
            if (arrayIndexer) altThumbnail = json2.body[arrayIndexer].urls.small
          }
          providedDownloadHeaders = {providedHeaders: {
    
            "credentials" : "omit",
            "headers" :
            {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0",
              "Accept": "image/avif,image/webp,*/*",
              "Accept-Language": "en-US,en;q=0.5",
              "Sec-Fetch-Dest": "image",
              "Sec-Fetch-Mode": "no-cors",
              "Sec-Fetch-Site": "cross-site",
              "Sec-GPC": "1",
              "Pragma": "no-cache",
              "Cache-Control": "no-cache",
              "referer" : "https://www.pixiv.net/"
          },
            "referrer" : "https://www.pixiv.net/",
            "method" : "GET",
            "mode" : "cors"
          
          }}
          
          if (!json.urls.original) {
            throw new Error("pixiv post is marked as sensitive and you havent suppled a pixiv cookie"); 
          }
          
          return {
            originalImageUrl: json.urls.original,
            previewImageUrl: json.urls.small,
            tags: json.tags.tags.map((a: any) => ({
              tag: a.tag,
              romaji: a.romaji || "",
              enTranslation: a.translation?.en || "",
            })),
            illustId: json.illustId,
            // urlsArray: urlsArray,
            illustTitle: json.illustTitle,
            createDate: json.createDate,
            uploadDate: json.uploadDate,
            authorId: json.userId,
            authorName: json.userName,
            illustType: json.illustType,
            width: json.width,
            height: json.height,
            arrayIndexer: arrayIndexer,
            urlsArrayBody: urlsArrayBody ?? [{
              urls: {
                original: json.urls.original,
                small: json.urls.small,
              },
              height: json.height,
              width: json.width,
            }],
            requestOptions: providedDownloadHeaders ?? undefined,
          } as IPixivResponse;
    
          
      } catch (error) {
        console.log('caught error at getting pixiv data: ', error);
        
          return undefined;
      }
    }
  
    private getPixivVideoFromID() {
      
    }
    public async getPixivCookies() {
      const response = (await this.utility.request(
        'https://www.pixiv.net/',
        "GET"
      ))
      const COOKIES_REGEX = new RegExp(String.raw `first\_visit\_datetime\_pc\=(?<first_visit_datetime_pc>.*?)\; expires\=(?<expires>.*?)\; Max\-Age=(?<MaxAge>.*?)\; (path\=\/)\; (secure\,) PHPSESSID=(?<PHPSESSID>.*?); expires\=(.*?)\; Max\-Age=(.*?)\; (path\=\/)\; domain\=(.*?)\; (secure\;) (HttpOnly\,) p\_ab\_id\=(?<p_ab_id>.*?)\; expires\=(.*?)\; Max\-Age=(.*?)\; (path\=\/)\; domain\=(?<domain>.*?)\; (secure\,) p\_ab\_id\_2\=(?<p_ab_id_2>.*?)\; expires\=(.*?)\; Max\-Age=(.*?)\; (path\=\/)\; domain\=(.*?)\; (secure\,) p\_ab\_d\_id\=(?<p_ab_d_id>.*?)\; expires\=(.*?)\; Max\-Age=(.*?)\; (path\=\/)\; domain\=(.*?)\; (secure\,) yuid\_b\=(?<yuid_b>.*?)\; expires\=(.*?)\; Max\-Age=(.*?)\; (path\=\/)\; (secure\,) \_\_cf\_bm\=(?<__cf_bm>.*?)\; (path\=\/)\; expires\=(.*?)\; domain\=(.*?)\; (?<HttpOnly>.*?)\; (Secure)\; SameSite\=(?<SameSite>.*)`)
      const cookiesStr = response.headers.get('set-cookie')
      if (cookiesStr) {
        const cookiesObj = cookiesStr.match(COOKIES_REGEX)?.groups;
        const cookies = `first_visit_datetime_pc=${cookiesObj?.first_visit_datetime_pc}; PHPSESSID=${cookiesObj?.PHPSESSID}; p_ab_id=${cookiesObj?.p_ab_id}; p_ab_id_2=${cookiesObj?.p_ab_id_2}; p_ab_d_id=${cookiesObj?.p_ab_d_id}; yuid_b=${cookiesObj?.yuid_b}; __cf_bm=${cookiesObj?.__cf_bm}`;
        return cookies;
      }
      return ''
      }
       
  public settings: ISettings;
  public pixivCookie: string;
  public utility: Utility;
  constructor(settings: ISettings, utility: Utility) {
      this.settings = settings;
      this.pixivCookie = '';
      this.utility = utility;
      
      if (settings.special_settings && settings.special_settings.pixiv_cookie) 
        this.pixivCookie = settings.special_settings.pixiv_cookie.textField?.value ?? "";
      else this.getPixivCookies().then(cookie => this.pixivCookie = cookie)
      this.processPixivId = this.processPixivId.bind(this)
      this.checkPixivImageUrlValid = this.checkPixivImageUrlValid.bind(this)
      this.getPixivImageData = this.getPixivImageData.bind(this)
      this.getPixivCookies = this.getPixivCookies.bind(this)

    }
    
}