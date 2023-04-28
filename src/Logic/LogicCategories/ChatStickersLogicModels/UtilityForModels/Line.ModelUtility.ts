import cheerio from "cheerio";

import Utility from "src/Utility";
import { IDanbooruResponse, ILinePageResponse, INewPicture, IPostIds, IPostLinks, IRequestOptions, ISettings, ITagsObject } from "types";

export class LineStickersModelUtility {
  public settings: ISettings;
  public utility: Utility;
  constructor(settings: ISettings, utility: Utility) {
      this.settings = settings;
      this.utility = utility

  }

  
/**
 * processLineStickerPage
 */
public async processLineStickerPage(inputUrl: string) {
  const linePageData = await this.getLineStickerPageData(inputUrl);
  if (linePageData) {
    let resultantData: INewPicture = {
    data: {},
    isNSFW: false,
    indexer: 0,
    tags: [],
    imagesDataArray: []
  };
  resultantData.urlsArray = linePageData.urlsArray.map(uE => ({
    imageUrl: uE,
    thumbnailUrl: '',
    isVideo: false,
    width: 0,
    height: 0,
  }))
  resultantData.data.line = linePageData
  resultantData.links = {line: inputUrl}
  resultantData.storedResult = 'line'
  resultantData.artists = [linePageData.authorName]
  resultantData.ids = {line: Number.parseInt(inputUrl.substring(inputUrl.indexOf('product/') + 8, inputUrl.indexOf('/en')))}
  resultantData.thumbnailURL = linePageData.previewImageUrl;
  return resultantData
  }
  else return { data: {}, indexer: 0, imagesDataArray: []}
}



/**
 * processLineStickerPage
 */
public async getLineStickerPageData(inputUrl: string) {

  let headersObj: RequestInit = {
    credentials: "include",
    headers: this.utility.defaultHeaders,
    method: "GET",
    mode: "cors",
  };
  
  const response = await this.utility.request(
    inputUrl,
    "GET"
  );
  const responseText = await response.text()
  const $ = cheerio.load(responseText);
  try {

    const packName = $('ul[class="mdCMN38Item01"] div[class="mdCMN38Item0lHead"] p').text();
    const packCover = $('div[ref="mainImage"] img').attr('src');
    const packDiscription = $('ul[class="mdCMN38Item01"] p[class="mdCMN38Item01Txt"]').text(); //impiment this please
    const packAuthorName = $('ul[class="mdCMN38Item01"] a[class="mdCMN38Item01Author"]').text();
    const packAuthorIDText = $('ul[class="mdCMN38Item01"] a[class="mdCMN38Item01Author"]').attr('href')
    const packAuthorID = packAuthorIDText?.substring(packAuthorIDText.indexOf('author') + 7, packAuthorIDText.indexOf('/en'));
    const packImagesObject = $('div[data-widget="StickerPreview"] div[class="mdCMN09ImgListWarp"] ul[class="mdCMN09Ul FnStickerList"]').children()
    let packImages: string[] = []
    for (let index = 0; index < packImagesObject.length; index++) {
      const element = packImagesObject[index];
      packImages.push(JSON.parse(element.attribs['data-preview']).staticUrl)
    }
    
    let providedDownloadHeaders: IRequestOptions = {providedHeaders: headersObj = {
      "credentials": "omit",
      "headers": this.utility.defaultHeaders,
      "referrer": "https://store.line.me/",
      "method": "GET",
      "mode": "cors"
    }}
    return {
      previewImageUrl: packCover,
      postTitle: packName,
      
      authorId: packAuthorID || '',
      authorName: packAuthorName,
      urlsArray: packImages,
      requestOptions: providedDownloadHeaders,
    } as ILinePageResponse
  } catch (error) {
    console.log("error parsing LINE.me sticker page link : ", inputUrl);
    console.log('error : ', error)
    
  }


}


}