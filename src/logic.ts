import SauceNao from "../saucenao";
import {PixivModelUtility} from './Logic/LogicCategories/AnimePictureLogicModels/UtilityForModels/Pixiv.ModelUtility'
import {BooruModelUtility} from './Logic/LogicCategories/AnimePictureLogicModels/UtilityForModels/Booru.ModelUtility'
import {LineStickersModelUtility} from './Logic/LogicCategories/ChatStickersLogicModels/UtilityForModels/Line.ModelUtility'

import { CategoryLogic } from "./Logic/LogicCategories/AnimePictures.Logic";
import Utility from "./Utility";

import type {
  IMongoDBEntry,
  IRequestOptions,
  INewAnimePic,
  IPostLinks,
  IPostIds,
  ISettings,
  IFilteredSaucenaoResult,
  ITagsObject,
  IImageProps,
  OutgoingHttpHeaders,
  IPixivResponse,
  IDanbooruResponse,
  IPixivTag,
  IUrlsArray,
  ILinePageResponse,
} from "../types";


// const shit = fs.readdirSync("../anime test/importedPics");
// console.log(`../anime test/importedPics/${shit[2]}`);

export default class logic {
  public sauceNao?: SauceNao;
  public settings: ISettings;
  public pixivCookie: string;
  public utility: Utility;
  public pixivModelUtility: PixivModelUtility;
  public booruModelUtility: BooruModelUtility;
  public categoryInstence: CategoryLogic;

  public lineStickersModelUtility: LineStickersModelUtility;
  constructor(settings: ISettings, utility: Utility) {
    this.categoryInstence = new CategoryLogic(settings)

    this.utility = utility
    this.settings = settings;
    this.pixivCookie = '';
    this.booruModelUtility = new BooruModelUtility(settings, utility);
    this.lineStickersModelUtility = new LineStickersModelUtility(settings, utility);
    this.pixivModelUtility = new PixivModelUtility(settings, utility);
    if (settings.saucenao_api_key) this.sauceNao = new SauceNao(settings.saucenao_api_key);
    if (settings.pixiv_cookie) this.pixivCookie = settings.pixiv_cookie;
    else this.pixivModelUtility.getPixivCookies('https://www.pixiv.net/en/').then(cookie => this.pixivCookie = cookie)
  }


/**
 * processInput
 */
public async processInput(input: string | File, album: string) {
  return this.categoryInstence.ProcessInput(input, album)
}

/**
 * checkSauceNaoAPI
 */
static checkSauceNaoApi(input: string) {
  return true;
}

  }
/* 
async function sexx() {
  const { inputType, resultArray } = await sauceNao.getSauce(
    `../anime test/importedPics/${shit[2]}`
  );

  //console.log( await (await res));
  const sexx = resultArray.map((a: ISaucenaoResult) => {
    if (a.header.index_id == 5) return a;
  });
  console.log(sexx);
}
//sexx()
 */
