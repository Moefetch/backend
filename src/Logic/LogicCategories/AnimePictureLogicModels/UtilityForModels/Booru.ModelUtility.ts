import cheerio from "cheerio";

import Utility from "src/Utility";
import { IDanbooruResponse, IModelSpecialParam, INewAnimePic, IPostIds, IPostLinks, IRequestOptions, ISettings, ITagsObject } from "types";

export class BooruModelUtility {
  public settings: ISettings;
  public utility: Utility;
  constructor(settings: ISettings, utility: Utility) {
      this.settings = settings;
      this.utility = utility

  }

  
  /**
   * gets danbooru original image tags
   * @param postUrl  url of danbooru post get data of
   */

   public async getdanbooruImageData(postUrl: string) {
    const processedUrl = (
      postUrl.includes('?q=') ? (postUrl.substring(0, postUrl.indexOf("?q=")) + ".json") 
      : (postUrl + ".json")
      ).replace('post/show/', "posts/");

    const response = await this.utility.request(processedUrl, "GET", {providedHeaders: {method:"GET"} });
    
    const json = await response.json()
    return {
      imageUrl: json.large_file_url ?? json.file_url,
      id: json.id,
      createDate: (new Date(json.created_at)).getTime(),
      updateDate: (new Date(json.updated_at)).getTime(),
      previewImageUrl: json.preview_file_url,
      rating: json.rating,
      isNsfw: json.rating != 'g',
      tags: {
        artists: json.tag_string_artist.split(' '),
        copyrights: json.tag_string_copyright.split(' '),
        characters: json.tag_string_character.split(' '),
        general: json.tag_string_general.split(' '),
        meta: json.tag_string_meta.split(' '),
      },
      isVideo: !!json.media_asset.duration,
      image_height: json.image_height,
      image_width: json.image_width,

    } as IDanbooruResponse;
  }

 /**
  * get yande.re post data from url
  * returns undefined on fail
  * do yande.re pools exist 
  * should i be worried
  * @param postUrl url of post e.g. https://yande.re/post/show/24436
  */
  public async getYandeReImageData(postUrl: string) {
    let headersObj: RequestInit = {
      credentials: "omit",
      headers: this.utility.defaultHeaders,
      referrer: "https://yande.re/",
      method: "GET",
      mode: "cors",
    };
    
    const response = await this.utility.request(
      postUrl,
      "GET"
    );
    const responseText = await response.text()
    const $ = cheerio.load(responseText);
    try {
      const firstquery = $('div[id="content"] div[id="post-view"]').children('script').html() || "";
      const json = JSON.parse(firstquery.substring(firstquery.indexOf('(') +1 , firstquery.lastIndexOf(')')))
      
      const allTagStringArray = json.posts[0].tags.split(' ');
      let tags: any = {
        artist: [],
        copyright: [],
        character: [],
        general: [],
        circle: [],
        faults: [],
      }
      allTagStringArray.forEach( (t: string ) => {
        tags[ json.tags[t] ].push(t);
      });
      
      return {
      id: json.posts[0].id,
      imageUrl: json.posts[0].file_url,
      createDate: json.posts[0].created_at * 1000,
      updateDate: json.posts[0].updated_at * 1000,
      previewImageUrl: json.posts[0].preview_url,
      rating: json.posts[0].rating,
      isNsfw: json.posts[0].rating != 's',
      tags: {
        artists: tags.artist,
        copyrights: tags.copyright,
        characters: tags.character,
        general: tags.general
      },
      image_height: json.posts[0].height,
      image_width: json.posts[0].width,
      requestOptions: headersObj,
      } as IDanbooruResponse;

    } catch (error) {
      console.log("error parsing yande.re link : ", postUrl);
      console.log('error : ', error)
      
    }
  }

  
public booruDictionary = {
  "yande": 'getYandeReImageData' as 'getYandeReImageData',
  "danbooru": 'getdanbooruImageData' as 'getdanbooruImageData',
}


/**
 * processBooru
 * @param inputUrl post url
 * 
 */
 public async processBooru(inputUrl: string, type: "danbooru" | "yande") {
  let resultantData: INewAnimePic = {
    data: {},
    indexer: 0,
    tags: [],
    imagesDataArray: []
  };
  let IPostLinksObj: IPostLinks = {};
  let idsObj:IPostIds = {};
  const res = await this[this.booruDictionary[type]](inputUrl);
    resultantData.data[type] = res;
    if (res && res.imageUrl && res.previewImageUrl) {
      resultantData.storedResult = type;
      let isVideo = res.imageUrl
      resultantData.urlsArray = [{ 
        imageUrl: res.imageUrl, 
        isVideo: res.isVideo,
        thumbnailUrl: res.previewImageUrl,
        width: res.image_width,
        height: res.image_height 
      }]
      IPostLinksObj[type] = inputUrl;
      resultantData.links = IPostLinksObj;
      resultantData.date_created = res.createDate;
      resultantData.thumbnailURL = res.previewImageUrl;
      resultantData.imageSize = {
        width: res.image_width,
        height: res.image_height 
      }

      let tags: string[] = res.tags?.general ?? []
      tags = res.tags?.copyrights ? tags.concat(res.tags?.copyrights) : tags;
      tags = res.tags?.characters ? tags.concat(res.tags?.characters) : tags;

      resultantData.tags = tags;
    
      resultantData.artists = res.tags?.artists
      resultantData.isNSFW = res.isNsfw;
      idsObj[type] = res.id;
      resultantData.ids = idsObj;
      return resultantData;
    }
}

}