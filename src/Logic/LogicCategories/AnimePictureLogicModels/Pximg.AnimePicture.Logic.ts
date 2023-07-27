import Utility from "../../../Utility";
import { ILogicModel, IModelSpecialParam, INewAnimePic, ISettings, ILogicCategorySpecialParamsDictionary, IPicFormStockOverrides } from "../../../../types";
import { PixivModelUtility } from "./UtilityForModels/Pixiv.ModelUtility";

const utility = new Utility();

export default class LogicModel implements ILogicModel {
    public supportedHostName: string = "i.pximg.net";
    
    public pixivModelUtility: PixivModelUtility;
    constructor(settings: ISettings) {
        this.pixivModelUtility = new PixivModelUtility(settings, utility)
        this.process = this.process.bind(this)
    }
    
    public async process(url: string, album: string, optionalOverrideParams: ILogicCategorySpecialParamsDictionary, stockOptionalOverrides: IPicFormStockOverrides):Promise<INewAnimePic> {
        let pixivPostId = url.substring(
            url.lastIndexOf('/') + 1);

          const dlFirstOnly = optionalOverrideParams.specialHostnameSpecificParams ? optionalOverrideParams.specialHostnameSpecificParams["i.pximg.net"]["only_download_selected_image"].checkBox?.checkBoxValue : this.newEntryParams['only_download_selected_image'].checkBox?.checkBoxValue

          const arrayIndexer = Number.parseInt(pixivPostId.substring(pixivPostId.indexOf('_p') + 2, pixivPostId.lastIndexOf('_')))
          pixivPostId = pixivPostId.substring(0, pixivPostId.search(/[^0-9]/));
          const isValid = ((await this.pixivModelUtility.checkPixivImageUrlValid(url)));
          if (isValid) {
            const imgRes = await utility.getImageResolution(url)
            const resultantData = (await this.pixivModelUtility.processPixivId(pixivPostId, !!dlFirstOnly, arrayIndexer)) ?? {
              data: {},
              imagesDataArray: [],
              urlsArray: [{
                imageUrl: url,
                thumbnailUrl: url,
                isVideo: false,
                height: imgRes?.imageSize.height ?? 0,
                width: imgRes?.imageSize.height ?? 0,

              }],
              links: {pixiv: url},
              isNSFW: false,
              indexer: 0,
            }
            return resultantData;
        };

        return {
            data: {},
            imagesDataArray: [],
            urlsArray: [{
              imageUrl: url,
              isVideo: false,
              thumbnailUrl: url,
              height: 0,
              width: 0,

            }],
            links: {pixiv: url},
            isNSFW: false,
            indexer: 0,
          }
    }

    public newEntryParams: IModelSpecialParam = {
      "only_download_selected_image" : {
        type: "param",
        category: "Anime Picture",
        valueType: "checkBox",
        checkBox: {
          checkBoxValue: false,
          checkBoxDescription: "Only download selected image",
          defaultValue: false,
        },
        hostname: this.supportedHostName,
      }
  };
  
   //public specialSettingsParam:IModelSpecialParam = {};  
  }

